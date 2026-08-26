const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const isServerless = process.env.VERCEL === '1' || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) || Boolean(process.env.NOW_REGION);

const baseDir = isServerless ? '/tmp' : __dirname;
const dbPath = isServerless ? path.join('/tmp', 'hostel_pg.db') : path.join(__dirname, 'hostel_pg.db');
const jsonDbPath = isServerless ? path.join('/tmp', 'hostel_pg_store.json') : path.join(__dirname, 'hostel_pg_store.json');

// Ensure upload directories exist
const uploadsDir = path.join(baseDir, 'uploads');
const aadhaarDir = path.join(uploadsDir, 'aadhaar');
const faceDir = path.join(uploadsDir, 'face_photos');

[uploadsDir, aadhaarDir, faceDir].forEach((dir) => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    console.warn(`Uploads dir setup notice (${dir}):`, err.message);
  }
});

let db = null;
let useFallback = false;

// 1. Try loading better-sqlite3
try {
  const Database = require('better-sqlite3');
  
  if (isServerless) {
    try {
      const srcDbPath = path.join(__dirname, 'hostel_pg.db');
      if (!fs.existsSync(dbPath) && fs.existsSync(srcDbPath)) {
        fs.copyFileSync(srcDbPath, dbPath);
      }
    } catch (e) {
      console.warn('SQLite seed copy notice:', e.message);
    }
  }

  const nativeDb = new Database(dbPath);
  try {
    nativeDb.pragma('journal_mode = WAL');
    nativeDb.pragma('foreign_keys = ON');
  } catch (_) {}

  // Initialize SQLite tables
  nativeDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      mobile TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('student', 'owner')) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      property_name TEXT NOT NULL,
      property_type TEXT NOT NULL,
      address TEXT NOT NULL,
      contact TEXT NOT NULL,
      city TEXT DEFAULT 'Jaipur, Rajasthan',
      image_url TEXT,
      qr_identifier TEXT UNIQUE NOT NULL,
      qr_status TEXT DEFAULT 'active',
      default_room TEXT DEFAULT '204',
      default_bed TEXT DEFAULT 'B',
      qr_created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS student_profiles (
      id TEXT PRIMARY KEY,
      student_id_code TEXT UNIQUE,
      user_id TEXT NOT NULL,
      property_id TEXT NOT NULL,
      owner_id TEXT,
      qr_identifier TEXT,
      full_name TEXT NOT NULL,
      dob TEXT,
      gender TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT,
      address TEXT NOT NULL,
      hometown TEXT NOT NULL,
      college_name TEXT,
      course TEXT,
      branch TEXT,
      year_semester TEXT,
      enrollment_number TEXT,
      guardian_name TEXT,
      guardian_mobile TEXT,
      emergency_contact TEXT,
      relationship TEXT,
      purpose TEXT NOT NULL,
      stay_duration TEXT,
      room_number TEXT,
      bed TEXT,
      face_photo TEXT NOT NULL,
      aadhaar_document TEXT NOT NULL,
      joining_date DATE DEFAULT (DATE('now')),
      status TEXT CHECK(status IN ('pending', 'active', 'vacated')) DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(property_id) REFERENCES properties(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      student_id TEXT,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(student_id) REFERENCES student_profiles(id) ON DELETE SET NULL
    );
  `);

  // Ensure default seed data in SQLite
  try {
    const ownerHash = bcrypt.hashSync('owner123', 10);
    const studentHash = bcrypt.hashSync('student123', 10);

    nativeDb.prepare(`
      INSERT OR IGNORE INTO users (id, name, email, mobile, password_hash, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('usr_demo_owner', 'Rajesh Sharma', 'owner@hostel.com', '9876543210', ownerHash, 'owner');

    nativeDb.prepare(`
      INSERT OR IGNORE INTO users (id, name, email, mobile, password_hash, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('usr_demo_student', 'Rahul Verma', 'student@hostel.com', '9123456780', studentHash, 'student');

    nativeDb.prepare(`
      INSERT OR IGNORE INTO users (id, name, email, mobile, password_hash, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('usr_owner_demo_01', 'Rajesh Sharma', 'owner@sunrise.com', '9876543210', ownerHash, 'owner');

    nativeDb.prepare(`
      INSERT OR IGNORE INTO properties (id, owner_id, property_name, property_type, address, contact, city, qr_identifier, qr_status, default_room, default_bed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'prop_demo_01',
      'usr_demo_owner',
      'Silver Heights Luxury PG & Hostel',
      'Co-Living / PG',
      'Plot 42, Knowledge Park III, Jagatpura, Jaipur',
      '9876543210',
      'Jaipur, Rajasthan',
      'QR_HSTL_JAIPUR_01',
      'active',
      '204',
      'B'
    );
  } catch (seedErr) {
    console.warn('SQLite seed notice:', seedErr.message);
  }

  db = nativeDb;
} catch (nativeErr) {
  console.warn('⚠️ Native better-sqlite3 not available in this environment. Activating resilient Universal Data Engine:', nativeErr.message);
  useFallback = true;
}

// 2. High-Performance Synchronous In-Memory & JSON-Backed Fallback Engine
if (useFallback || !db) {
  // Initialize in-memory store
  const store = {
    users: [],
    properties: [],
    student_profiles: [],
    notifications: [],
  };

  // Try loading from persisted JSON file if present
  try {
    if (fs.existsSync(jsonDbPath)) {
      const loaded = JSON.parse(fs.readFileSync(jsonDbPath, 'utf8'));
      if (loaded.users) store.users = loaded.users;
      if (loaded.properties) store.properties = loaded.properties;
      if (loaded.student_profiles) store.student_profiles = loaded.student_profiles;
      if (loaded.notifications) store.notifications = loaded.notifications;
    }
  } catch (_) {}

  // Helper to persist store to file
  const persist = () => {
    try {
      fs.writeFileSync(jsonDbPath, JSON.stringify(store, null, 2), 'utf8');
    } catch (_) {}
  };

  // Seed default demo accounts if missing
  const ensureFallbackSeeds = () => {
    if (store.users.length === 0) {
      const ownerHash = bcrypt.hashSync('owner123', 10);
      const studentHash = bcrypt.hashSync('student123', 10);

      store.users.push({
        id: 'usr_demo_owner',
        name: 'Rajesh Sharma',
        email: 'owner@hostel.com',
        mobile: '9876543210',
        password_hash: ownerHash,
        role: 'owner',
        created_at: new Date().toISOString(),
      });

      store.users.push({
        id: 'usr_demo_student',
        name: 'Rahul Verma',
        email: 'student@hostel.com',
        mobile: '9123456780',
        password_hash: studentHash,
        role: 'student',
        created_at: new Date().toISOString(),
      });

      store.properties.push({
        id: 'prop_demo_01',
        owner_id: 'usr_demo_owner',
        property_name: 'Silver Heights Luxury PG & Hostel',
        property_type: 'Co-Living / PG',
        address: 'Plot 42, Knowledge Park III, Jagatpura, Jaipur',
        contact: '9876543210',
        city: 'Jaipur, Rajasthan',
        image_url: null,
        qr_identifier: 'QR_HSTL_JAIPUR_01',
        qr_status: 'active',
        default_room: '204',
        default_bed: 'B',
        qr_created_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });

      persist();
    }
  };

  ensureFallbackSeeds();

  // Create Universal SQL Statement Interpreter
  db = {
    prepare(sql) {
      const cleanSql = sql.replace(/\s+/g, ' ').trim();
      
      return {
        get(...params) {
          const results = executeSql(cleanSql, params);
          return results && results.length > 0 ? results[0] : undefined;
        },
        all(...params) {
          return executeSql(cleanSql, params);
        },
        run(...params) {
          const changes = executeRun(cleanSql, params);
          persist();
          return { changes, lastInsertRowid: Date.now() };
        }
      };
    },
    exec(sql) {
      persist();
      return this;
    },
    pragma(sql) {
      return [];
    }
  };

  function executeSql(sql, params) {
    const s = sql.toLowerCase();

    // 1. SELECT count(*) as count FROM users
    if (s.includes('select count(*) as count from users') || s.includes('select count(*) from users')) {
      return [{ count: store.users.length }];
    }

    // 2. SELECT id FROM users WHERE email = ?
    if (s.startsWith('select id from users where email = ?')) {
      const email = (params[0] || '').toLowerCase();
      const user = store.users.find(u => u.email.toLowerCase() === email);
      return user ? [{ id: user.id }] : [];
    }

    // 3. SELECT * FROM users WHERE (LOWER(email) = ? OR mobile = ?) [AND role = ?]
    if (s.includes('from users where') && (s.includes('email') || s.includes('mobile'))) {
      const emailOrMobile = (params[0] || '').toLowerCase();
      const mobile = (params[1] || '').trim();
      const role = params[2];

      const found = store.users.find(u => {
        const matchesIdentity = u.email.toLowerCase() === emailOrMobile || u.mobile === mobile || u.email.toLowerCase() === mobile.toLowerCase() || u.mobile === emailOrMobile;
        if (!matchesIdentity) return false;
        if (role && u.role !== role) return false;
        return true;
      });

      return found ? [{ ...found }] : [];
    }

    // 4. SELECT id, name, email, mobile, role, created_at FROM users WHERE id = ?
    if (s.includes('from users where id = ?')) {
      const id = params[0];
      const user = store.users.find(u => u.id === id);
      return user ? [{ id: user.id, name: user.name, email: user.email, mobile: user.mobile, role: user.role, created_at: user.created_at }] : [];
    }

    // 5. Properties queries
    if (s.includes('from properties p join users u on p.owner_id = u.id where p.qr_identifier = ?')) {
      const qr = (params[0] || '').trim();
      const prop = store.properties.find(p => p.qr_identifier === qr);
      if (!prop) return [];
      const owner = store.users.find(u => u.id === prop.owner_id);
      return [{ ...prop, owner_name: owner ? owner.name : 'PG Owner' }];
    }

    if (s.includes('from properties where owner_id = ?')) {
      const ownerId = params[0];
      const prop = store.properties.find(p => p.owner_id === ownerId);
      return prop ? [{ ...prop }] : [];
    }

    if (s.includes('from properties where qr_identifier = ?')) {
      const qr = (params[0] || '').trim();
      const prop = store.properties.find(p => p.qr_identifier === qr);
      return prop ? [{ ...prop }] : [];
    }

    if (s.includes('from properties where id = ?')) {
      const id = params[0];
      const prop = store.properties.find(p => p.id === id);
      return prop ? [{ ...prop }] : [];
    }

    // 6. Student profiles queries
    if (s.includes('from student_profiles sp join properties p on sp.property_id = p.id where sp.user_id = ? and sp.property_id = ?')) {
      const userId = params[0];
      const propId = params[1];
      const profile = store.student_profiles.find(sp => sp.user_id === userId && sp.property_id === propId);
      if (!profile) return [];
      const prop = store.properties.find(p => p.id === profile.property_id);
      return [{ ...profile, property_name: prop ? prop.property_name : '' }];
    }

    if (s.includes('from student_profiles sp join properties p on sp.property_id = p.id join users u on p.owner_id = u.id where sp.id = ?')) {
      const id = params[0];
      const profile = store.student_profiles.find(sp => sp.id === id);
      if (!profile) return [];
      const prop = store.properties.find(p => p.id === profile.property_id);
      const owner = prop ? store.users.find(u => u.id === prop.owner_id) : null;
      return [{
        ...profile,
        property_name: prop ? prop.property_name : '',
        property_type: prop ? prop.property_type : '',
        property_address: prop ? prop.address : '',
        property_contact: prop ? prop.contact : '',
        property_city: prop ? prop.city : '',
        owner_name: owner ? owner.name : '',
        owner_mobile: owner ? owner.mobile : '',
        owner_email: owner ? owner.email : '',
      }];
    }

    if (s.includes('from student_profiles sp join properties p on sp.property_id = p.id join users u on p.owner_id = u.id where sp.user_id = ? order by sp.created_at desc limit 1')) {
      const userId = params[0];
      const matching = store.student_profiles
        .filter(sp => sp.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      if (matching.length === 0) return [];
      const profile = matching[0];
      const prop = store.properties.find(p => p.id === profile.property_id);
      const owner = prop ? store.users.find(u => u.id === prop.owner_id) : null;
      return [{
        ...profile,
        property_name: prop ? prop.property_name : '',
        property_type: prop ? prop.property_type : '',
        property_address: prop ? prop.address : '',
        property_contact: prop ? prop.contact : '',
        property_city: prop ? prop.city : '',
        owner_name: owner ? owner.name : '',
        owner_mobile: owner ? owner.mobile : '',
        owner_email: owner ? owner.email : '',
      }];
    }

    if (s.includes('from student_profiles sp join properties p on sp.property_id = p.id where sp.id = ?')) {
      const id = params[0];
      const profile = store.student_profiles.find(sp => sp.id === id);
      if (!profile) return [];
      const prop = store.properties.find(p => p.id === profile.property_id);
      return [{ ...profile, owner_id: prop ? prop.owner_id : null }];
    }

    if (s.includes('sum(case when status =') && s.includes('from student_profiles where property_id = ?')) {
      const propId = params[0];
      const students = store.student_profiles.filter(sp => sp.property_id === propId);
      const total = students.length;
      const pending = students.filter(s => s.status === 'pending').length;
      const active = students.filter(s => s.status === 'active').length;
      const vacated = students.filter(s => s.status === 'vacated').length;
      return [{ total, pending, active, vacated }];
    }

    if (s.includes('from student_profiles where property_id = ?') || (s.includes('from student_profiles') && s.includes('order by'))) {
      const propId = params[0];
      let list = store.student_profiles.filter(sp => sp.property_id === propId);
      
      if (params.length >= 3 && typeof params[1] === 'string' && params[1] !== '%') {
        const q = params[1].replace(/%/g, '').toLowerCase();
        list = list.filter(sp => 
          (sp.full_name && sp.full_name.toLowerCase().includes(q)) ||
          (sp.mobile && sp.mobile.includes(q)) ||
          (sp.student_id_code && sp.student_id_code.toLowerCase().includes(q)) ||
          (sp.room_number && sp.room_number.toLowerCase().includes(q))
        );
      }

      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return list.map(sp => ({
        id: sp.id,
        student_id_code: sp.student_id_code,
        full_name: sp.full_name,
        mobile: sp.mobile,
        college_name: sp.college_name,
        course: sp.course,
        branch: sp.branch,
        year_semester: sp.year_semester,
        room_number: sp.room_number,
        bed: sp.bed,
        status: sp.status,
        joining_date: sp.joining_date,
        created_at: sp.created_at,
      }));
    }

    if (s.includes('from student_profiles where id = ?')) {
      const id = params[0];
      const profile = store.student_profiles.find(sp => sp.id === id);
      return profile ? [{ ...profile }] : [];
    }

    // 7. Notifications queries
    if (s.includes('count(*) as unreadcount from notifications where owner_id = ? and read = 0')) {
      const ownerId = params[0];
      const count = store.notifications.filter(n => n.owner_id === ownerId && (n.read === 0 || !n.read)).length;
      return [{ unreadCount: count }];
    }

    if (s.includes('from notifications n left join student_profiles sp on n.student_id = sp.id where n.owner_id = ?')) {
      const ownerId = params[0];
      const notifs = store.notifications
        .filter(n => n.owner_id === ownerId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 50);

      return notifs.map(n => {
        const student = store.student_profiles.find(sp => sp.id === n.student_id);
        return {
          ...n,
          student_name: student ? student.full_name : null,
        };
      });
    }

    return [];
  }

  function executeRun(sql, params) {
    const s = sql.toLowerCase();

    // 1. INSERT INTO users
    if (s.startsWith('insert into users') || s.startsWith('insert or ignore into users')) {
      const [id, name, email, mobile, password_hash, role] = params;
      const existing = store.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!existing) {
        store.users.push({
          id,
          name,
          email,
          mobile,
          password_hash,
          role,
          created_at: new Date().toISOString(),
        });
        return 1;
      }
      return 0;
    }

    // 2. INSERT INTO properties
    if (s.startsWith('insert into properties') || s.startsWith('insert or ignore into properties')) {
      const [id, owner_id, property_name, property_type, address, contact, city, image_url, qr_identifier, qr_status, default_room, default_bed] = params;
      store.properties.push({
        id,
        owner_id,
        property_name,
        property_type,
        address,
        contact,
        city: city || 'Jaipur, Rajasthan',
        image_url: image_url || null,
        qr_identifier,
        qr_status: qr_status || 'active',
        default_room: default_room || '204',
        default_bed: default_bed || 'B',
        qr_created_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
      return 1;
    }

    // 3. UPDATE properties SET qr_identifier = ?, qr_status = 'active'
    if (s.includes('update properties set qr_identifier = ?')) {
      const [qr_identifier, id] = params;
      const prop = store.properties.find(p => p.id === id);
      if (prop) {
        prop.qr_identifier = qr_identifier;
        prop.qr_status = 'active';
        prop.qr_created_at = new Date().toISOString();
        return 1;
      }
      return 0;
    }

    // 4. UPDATE properties SET qr_status = ?
    if (s.includes('update properties set qr_status = ?')) {
      const [status, id] = params;
      const prop = store.properties.find(p => p.id === id);
      if (prop) {
        prop.qr_status = status;
        return 1;
      }
      return 0;
    }

    // 5. UPDATE properties SET property_name = ...
    if (s.includes('update properties set property_name = ?')) {
      const [property_name, property_type, address, contact, city, default_room, default_bed, id] = params;
      const prop = store.properties.find(p => p.id === id);
      if (prop) {
        prop.property_name = property_name;
        prop.property_type = property_type;
        prop.address = address;
        prop.contact = contact;
        prop.city = city;
        prop.default_room = default_room;
        prop.default_bed = default_bed;
        return 1;
      }
      return 0;
    }

    // 6. INSERT INTO student_profiles
    if (s.startsWith('insert into student_profiles')) {
      const [
        id, student_id_code, user_id, property_id, owner_id, qr_identifier,
        full_name, dob, gender, mobile, email, address, hometown,
        college_name, course, branch, year_semester, enrollment_number,
        guardian_name, guardian_mobile, emergency_contact, relationship,
        purpose, stay_duration, room_number, bed, face_photo, aadhaar_document, status
      ] = params;

      store.student_profiles.push({
        id,
        student_id_code,
        user_id,
        property_id,
        owner_id,
        qr_identifier,
        full_name,
        dob,
        gender,
        mobile,
        email,
        address,
        hometown,
        college_name,
        course,
        branch,
        year_semester,
        enrollment_number,
        guardian_name,
        guardian_mobile,
        emergency_contact,
        relationship,
        purpose,
        stay_duration,
        room_number,
        bed,
        face_photo,
        aadhaar_document,
        status: status || 'pending',
        joining_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return 1;
    }

    // 7. UPDATE student_profiles SET status = ?
    if (s.includes('update student_profiles set status = ?')) {
      const [status, id] = params;
      const profile = store.student_profiles.find(sp => sp.id === id);
      if (profile) {
        profile.status = status;
        profile.updated_at = new Date().toISOString();
        return 1;
      }
      return 0;
    }

    // 8. UPDATE student_profiles SET room_number = ?
    if (s.includes('update student_profiles set room_number = ?')) {
      const [room_number, bed, id] = params;
      const profile = store.student_profiles.find(sp => sp.id === id);
      if (profile) {
        profile.room_number = room_number;
        profile.bed = bed;
        profile.updated_at = new Date().toISOString();
        return 1;
      }
      return 0;
    }

    // 9. INSERT INTO notifications
    if (s.startsWith('insert into notifications')) {
      const [id, owner_id, student_id, type, message] = params;
      store.notifications.push({
        id,
        owner_id,
        student_id,
        type,
        message,
        read: 0,
        created_at: new Date().toISOString(),
      });
      return 1;
    }

    // 10. UPDATE notifications SET read = 1 WHERE owner_id = ?
    if (s.includes('update notifications set read = 1 where owner_id = ?')) {
      const ownerId = params[0];
      store.notifications.forEach(n => {
        if (n.owner_id === ownerId) n.read = 1;
      });
      return 1;
    }

    return 0;
  }
}

module.exports = {
  db,
  uploadsDir,
  aadhaarDir,
  faceDir,
};
