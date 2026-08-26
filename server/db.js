const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const isServerless = process.env.VERCEL === '1' || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) || Boolean(process.env.NOW_REGION);

const baseDir = isServerless ? '/tmp' : __dirname;
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

// Initialize in-memory store with payments & billing tables
const store = {
  users: [],
  properties: [],
  student_profiles: [],
  notifications: [],
  owner_payment_settings: [],
  monthly_billings: [],
  payment_transactions: [],
};

// Try loading from persisted JSON file if present
try {
  if (fs.existsSync(jsonDbPath)) {
    const loaded = JSON.parse(fs.readFileSync(jsonDbPath, 'utf8'));
    if (Array.isArray(loaded.users)) store.users = loaded.users;
    if (Array.isArray(loaded.properties)) store.properties = loaded.properties;
    if (Array.isArray(loaded.student_profiles)) store.student_profiles = loaded.student_profiles;
    if (Array.isArray(loaded.notifications)) store.notifications = loaded.notifications;
    if (Array.isArray(loaded.owner_payment_settings)) store.owner_payment_settings = loaded.owner_payment_settings;
    if (Array.isArray(loaded.monthly_billings)) store.monthly_billings = loaded.monthly_billings;
    if (Array.isArray(loaded.payment_transactions)) store.payment_transactions = loaded.payment_transactions;
  }
} catch (_) {}

// Helper to persist store to file safely
const persist = () => {
  try {
    fs.writeFileSync(jsonDbPath, JSON.stringify(store, null, 2), 'utf8');
  } catch (_) {}
};

// Seed default demo accounts and payment configs
const ensureSeeds = () => {
  const ownerHash = bcrypt.hashSync('owner123', 10);
  const studentHash = bcrypt.hashSync('student123', 10);

  const demoUsers = [
    {
      id: 'usr_owner_demo_01',
      name: 'Rajesh Sharma',
      email: 'owner@sunrise.com',
      mobile: '9876543210',
      password_hash: ownerHash,
      role: 'owner',
      created_at: '2026-08-25T10:00:00.000Z',
    },
    {
      id: 'usr_demo_owner',
      name: 'Rajesh Sharma',
      email: 'owner@hostel.com',
      mobile: '9876543210',
      password_hash: ownerHash,
      role: 'owner',
      created_at: '2026-08-25T10:00:00.000Z',
    },
    {
      id: 'usr_student_demo_01',
      name: 'Abhay Shekhawat',
      email: 'abhay@example.com',
      mobile: '9123456780',
      password_hash: studentHash,
      role: 'student',
      created_at: '2026-08-25T10:00:00.000Z',
    },
    {
      id: 'usr_demo_student',
      name: 'Rahul Verma',
      email: 'student@hostel.com',
      mobile: '9123456780',
      password_hash: studentHash,
      role: 'student',
      created_at: '2026-08-25T10:00:00.000Z',
    },
  ];

  demoUsers.forEach((u) => {
    const existing = store.users.find((e) => e.email.toLowerCase() === u.email.toLowerCase());
    if (!existing) {
      store.users.push(u);
    } else {
      existing.password_hash = u.password_hash;
    }
  });

  if (store.properties.length === 0) {
    store.properties.push({
      id: 'prop_demo_01',
      owner_id: 'usr_owner_demo_01',
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
  }

  // Seed demo owner payment UPI settings
  if (store.owner_payment_settings.length === 0) {
    store.owner_payment_settings.push({
      id: 'pay_set_01',
      owner_id: 'usr_owner_demo_01',
      upi_id: 'rajesh.hostel@okhdfcbank',
      account_holder_name: 'Rajesh Sharma (Silver Heights PG)',
      qr_image_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  // Ensure demo student profile has fee fields
  const demoStudent = store.student_profiles.find((s) => s.user_id === 'usr_student_demo_01');
  if (!demoStudent) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const dueDate = new Date(currentYear, currentMonth, 5).toISOString().split('T')[0];

    store.student_profiles.push({
      id: 'prof_demo_abhay',
      student_id_code: 'STU-2026-094',
      user_id: 'usr_student_demo_01',
      property_id: 'prop_demo_01',
      owner_id: 'usr_owner_demo_01',
      qr_identifier: 'QR_HSTL_JAIPUR_01',
      full_name: 'Abhay Shekhawat',
      dob: '2004-05-14',
      gender: 'Male',
      mobile: '9123456780',
      email: 'abhay@example.com',
      address: 'Near City Palace, Jaipur',
      hometown: 'Jaipur',
      college_name: 'JECRC University',
      course: 'B.Tech',
      branch: 'Computer Science',
      year_semester: '3rd Year',
      enrollment_number: 'JECRC-2023-CS-094',
      guardian_name: 'Vikram Shekhawat',
      guardian_mobile: '9829012345',
      emergency_contact: '9829012345',
      relationship: 'Father',
      purpose: 'College Studies',
      stay_duration: '1 Year',
      room_number: '204',
      bed: 'B',
      face_photo: 'face_demo.jpg',
      aadhaar_document: 'aadhaar_demo.jpg',
      status: 'active',
      monthly_fee: 8000,
      rent_due_day: 5,
      last_paid_date: '2026-07-05',
      next_due_date: dueDate,
      payment_status: 'due',
      joining_date: '2026-08-01',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Seed initial billing record & historical transaction
    store.monthly_billings.push({
      id: 'bill_demo_01',
      tenant_id: 'prof_demo_abhay',
      user_id: 'usr_student_demo_01',
      owner_id: 'usr_owner_demo_01',
      property_id: 'prop_demo_01',
      billing_period: 'July 2026',
      amount: 8000,
      due_date: '2026-07-05',
      status: 'paid',
      paid_at: '2026-07-05T10:30:00.000Z',
      created_at: '2026-07-01T00:00:00.000Z',
    });

    store.payment_transactions.push({
      id: 'pay_tx_demo_01',
      tenant_id: 'prof_demo_abhay',
      user_id: 'usr_student_demo_01',
      owner_id: 'usr_owner_demo_01',
      property_id: 'prop_demo_01',
      billing_id: 'bill_demo_01',
      billing_period: 'July 2026 Room Fee',
      amount: 8000,
      status: 'success',
      payment_provider: 'UPI',
      transaction_id: 'UPI607051234598',
      payment_reference: 'GPAY-REF-984210',
      payment_date: '2026-07-05',
      payment_time: '10:30 AM',
      note: 'July room fee paid via Google Pay',
      created_at: '2026-07-05T10:30:00.000Z',
    });
  }

  persist();
};

ensureSeeds();

// Pure JavaScript Universal Database Driver
const db = {
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
      },
    };
  },
  exec(sql) {
    persist();
    return this;
  },
  pragma(sql) {
    return [];
  },
};

function executeSql(sql, params) {
  const s = sql.toLowerCase();

  // 1. Users queries
  if (s.includes('select count(*) as count from users') || s.includes('select count(*) from users')) {
    return [{ count: store.users.length }];
  }

  if (s.includes('from users where') && (s.includes('email') || s.includes('mobile'))) {
    const raw1 = (params[0] || '').toLowerCase().trim();
    const raw2 = (params[1] || '').trim();
    const digits1 = raw1.replace(/\D/g, '');
    const digits2 = raw2.replace(/\D/g, '');
    const role = params[2];

    const found = store.users.find((u) => {
      const uEmail = (u.email || '').toLowerCase().trim();
      const uMobile = (u.mobile || '').trim();
      const uDigits = uMobile.replace(/\D/g, '');

      const matchesEmail = uEmail === raw1 || uEmail === raw2.toLowerCase();
      const matchesMobile =
        (uMobile && (uMobile === raw1 || uMobile === raw2)) ||
        (uDigits && (uDigits === digits1 || uDigits === digits2));

      if (!matchesEmail && !matchesMobile) return false;
      if (role && u.role !== role) return false;
      return true;
    });

    return found ? [{ ...found }] : [];
  }

  if (s.includes('from users where id = ?')) {
    const id = params[0];
    const user = store.users.find((u) => u.id === id);
    return user
      ? [
          {
            id: user.id,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
            role: user.role,
            created_at: user.created_at,
          },
        ]
      : [];
  }

  // 2. Properties queries
  if (s.includes('from properties p join users u on p.owner_id = u.id where p.qr_identifier = ?')) {
    const qr = (params[0] || '').trim();
    const prop = store.properties.find((p) => p.qr_identifier === qr);
    if (!prop) return [];
    const owner = store.users.find((u) => u.id === prop.owner_id);
    return [{ ...prop, owner_name: owner ? owner.name : 'PG Owner' }];
  }

  if (s.includes('from properties where owner_id = ?')) {
    const ownerId = params[0];
    const prop = store.properties.find((p) => p.owner_id === ownerId);
    return prop ? [{ ...prop }] : [];
  }

  if (s.includes('from properties where qr_identifier = ?')) {
    const qr = (params[0] || '').trim();
    const prop = store.properties.find((p) => p.qr_identifier === qr);
    return prop ? [{ ...prop }] : [];
  }

  if (s.includes('from properties where id = ?')) {
    const id = params[0];
    const prop = store.properties.find((p) => p.id === id);
    return prop ? [{ ...prop }] : [];
  }

  // 3. Owner Payment Settings queries
  if (s.includes('from owner_payment_settings where owner_id = ?')) {
    const ownerId = params[0];
    const settings = store.owner_payment_settings.find((p) => p.owner_id === ownerId);
    return settings ? [{ ...settings }] : [];
  }

  // 4. Payment Transactions & History queries
  if (s.includes('from payment_transactions where transaction_id = ?')) {
    const txnId = (params[0] || '').trim();
    const txn = store.payment_transactions.find((t) => t.transaction_id.toLowerCase() === txnId.toLowerCase());
    return txn ? [{ ...txn }] : [];
  }

  if (s.includes('from payment_transactions where tenant_id = ?') || s.includes('from payment_transactions where user_id = ?')) {
    const id = params[0];
    const list = store.payment_transactions
      .filter((t) => t.tenant_id === id || t.user_id === id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return list.map((t) => {
      const student = store.student_profiles.find((s) => s.id === t.tenant_id);
      const prop = store.properties.find((p) => p.id === t.property_id);
      const owner = store.users.find((u) => u.id === t.owner_id);
      return {
        ...t,
        student_name: student ? student.full_name : '',
        room_number: student ? student.room_number : '',
        bed: student ? student.bed : '',
        property_name: prop ? prop.property_name : '',
        owner_name: owner ? owner.name : '',
      };
    });
  }

  if (s.includes('from payment_transactions where owner_id = ?')) {
    const ownerId = params[0];
    const list = store.payment_transactions
      .filter((t) => t.owner_id === ownerId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return list.map((t) => {
      const student = store.student_profiles.find((s) => s.id === t.tenant_id);
      return {
        ...t,
        student_name: student ? student.full_name : '',
        room_number: student ? student.room_number : '',
        bed: student ? student.bed : '',
      };
    });
  }

  // 5. Monthly Billings queries
  if (s.includes('from monthly_billings where tenant_id = ? and billing_period = ?')) {
    const tenantId = params[0];
    const period = params[1];
    const bill = store.monthly_billings.find((b) => b.tenant_id === tenantId && b.billing_period === period);
    return bill ? [{ ...bill }] : [];
  }

  if (s.includes('from monthly_billings where tenant_id = ?')) {
    const tenantId = params[0];
    const list = store.monthly_billings
      .filter((b) => b.tenant_id === tenantId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return list;
  }

  // 6. Student profiles queries
  if (s.includes('from student_profiles sp join properties p on sp.property_id = p.id where sp.user_id = ? and sp.property_id = ?')) {
    const userId = params[0];
    const propId = params[1];
    const profile = store.student_profiles.find((sp) => sp.user_id === userId && sp.property_id === propId);
    if (!profile) return [];
    const prop = store.properties.find((p) => p.id === profile.property_id);
    return [{ ...profile, property_name: prop ? prop.property_name : '' }];
  }

  if (s.includes('from student_profiles sp join properties p on sp.property_id = p.id join users u on p.owner_id = u.id where sp.id = ?')) {
    const id = params[0];
    const profile = store.student_profiles.find((sp) => sp.id === id);
    if (!profile) return [];
    const prop = store.properties.find((p) => p.id === profile.property_id);
    const owner = prop ? store.users.find((u) => u.id === prop.owner_id) : null;
    return [
      {
        ...profile,
        property_name: prop ? prop.property_name : '',
        property_type: prop ? prop.property_type : '',
        property_address: prop ? prop.address : '',
        property_contact: prop ? prop.contact : '',
        property_city: prop ? prop.city : '',
        owner_name: owner ? owner.name : '',
        owner_mobile: owner ? owner.mobile : '',
        owner_email: owner ? owner.email : '',
      },
    ];
  }

  if (s.includes('from student_profiles') && s.includes('where sp.user_id = ?') || s.includes('where user_id = ?')) {
    const userId = params[0];
    const matching = store.student_profiles
      .filter((sp) => sp.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (matching.length === 0) return [];
    const profile = matching[0];
    const prop = store.properties.find((p) => p.id === profile.property_id);
    const owner = prop ? store.users.find((u) => u.id === prop.owner_id) : null;
    return [
      {
        ...profile,
        property_name: prop ? prop.property_name : '',
        property_type: prop ? prop.property_type : '',
        property_address: prop ? prop.address : '',
        property_contact: prop ? prop.contact : '',
        property_city: prop ? prop.city : '',
        owner_name: owner ? owner.name : '',
        owner_mobile: owner ? owner.mobile : '',
        owner_email: owner ? owner.email : '',
      },
    ];
  }

  if (s.includes('from student_profiles sp join properties p on sp.property_id = p.id where sp.id = ?')) {
    const id = params[0];
    const profile = store.student_profiles.find((sp) => sp.id === id);
    if (!profile) return [];
    const prop = store.properties.find((p) => p.id === profile.property_id);
    return [{ ...profile, owner_id: prop ? prop.owner_id : null }];
  }

  if (s.includes('sum(case when status =') && s.includes('from student_profiles where property_id = ?')) {
    const propId = params[0];
    const students = store.student_profiles.filter((sp) => sp.property_id === propId);
    const total = students.length;
    const pending = students.filter((s) => s.status === 'pending').length;
    const active = students.filter((s) => s.status === 'active').length;
    const vacated = students.filter((s) => s.status === 'vacated').length;
    return [{ total, pending, active, vacated }];
  }

  if (s.includes('from student_profiles sp') && s.includes('left join properties p on sp.property_id = p.id') && s.includes('where sp.id = ?')) {
    const id = params[0];
    const profile = store.student_profiles.find((sp) => sp.id === id);
    if (!profile) return [];
    const prop = store.properties.find((p) => p.id === profile.property_id);
    return [
      {
        ...profile,
        property_name: prop ? prop.property_name : 'My Hostel & PG',
        prop_owner_id: prop ? prop.owner_id : profile.owner_id,
      },
    ];
  }

  if (s.includes('from student_profiles') && (s.includes('where owner_id = ?') || s.includes('owner_id = ? or property_id = ?'))) {
    const ownerId = params[0];
    const propId = params[1] || null;
    let list = store.student_profiles.filter((sp) => sp.owner_id === ownerId || (propId && sp.property_id === propId));
    list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return list;
  }

  if (s.includes('from student_profiles where property_id = ?') || (s.includes('from student_profiles') && s.includes('order by'))) {
    const propId = params[0];
    let list = store.student_profiles.filter((sp) => !propId || sp.property_id === propId);

    if (params.length >= 3 && typeof params[1] === 'string' && params[1] !== '%') {
      const q = params[1].replace(/%/g, '').toLowerCase();
      list = list.filter(
        (sp) =>
          (sp.full_name && sp.full_name.toLowerCase().includes(q)) ||
          (sp.mobile && sp.mobile.includes(q)) ||
          (sp.student_id_code && sp.student_id_code.toLowerCase().includes(q)) ||
          (sp.room_number && sp.room_number.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return list.map((sp) => ({
      id: sp.id,
      student_id_code: sp.student_id_code,
      user_id: sp.user_id,
      property_id: sp.property_id,
      owner_id: sp.owner_id,
      full_name: sp.full_name,
      mobile: sp.mobile,
      college_name: sp.college_name,
      course: sp.course,
      branch: sp.branch,
      year_semester: sp.year_semester,
      room_number: sp.room_number,
      bed: sp.bed,
      status: sp.status,
      monthly_fee: sp.monthly_fee || 8000,
      rent_due_day: sp.rent_due_day || 5,
      last_paid_date: sp.last_paid_date,
      next_due_date: sp.next_due_date,
      payment_status: sp.payment_status || 'due',
      joining_date: sp.joining_date,
      created_at: sp.created_at,
    }));
  }

  if (s.includes('from student_profiles where id = ?')) {
    const id = params[0];
    const profile = store.student_profiles.find((sp) => sp.id === id);
    return profile ? [{ ...profile }] : [];
  }

  // 7. Notifications queries
  if (s.includes('count(*) as unreadcount from notifications where owner_id = ? and read = 0')) {
    const ownerId = params[0];
    const count = store.notifications.filter((n) => n.owner_id === ownerId && (n.read === 0 || !n.read)).length;
    return [{ unreadCount: count }];
  }

  if (s.includes('from notifications n left join student_profiles sp on n.student_id = sp.id where n.owner_id = ?')) {
    const ownerId = params[0];
    const notifs = store.notifications
      .filter((n) => n.owner_id === ownerId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 50);

    return notifs.map((n) => {
      const student = store.student_profiles.find((sp) => sp.id === n.student_id);
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
    const existing = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
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
    const [
      id,
      owner_id,
      property_name,
      property_type,
      address,
      contact,
      city,
      image_url,
      qr_identifier,
      qr_status,
      default_room,
      default_bed,
    ] = params;
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

  // 3. UPDATE properties
  if (s.includes('update properties set qr_identifier = ?')) {
    const [qr_identifier, id] = params;
    const prop = store.properties.find((p) => p.id === id);
    if (prop) {
      prop.qr_identifier = qr_identifier;
      prop.qr_status = 'active';
      prop.qr_created_at = new Date().toISOString();
      return 1;
    }
    return 0;
  }

  if (s.includes('update properties set qr_status = ?')) {
    const [status, id] = params;
    const prop = store.properties.find((p) => p.id === id);
    if (prop) {
      prop.qr_status = status;
      return 1;
    }
    return 0;
  }

  if (s.includes('update properties set property_name = ?')) {
    const [property_name, property_type, address, contact, city, default_room, default_bed, id] = params;
    const prop = store.properties.find((p) => p.id === id);
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

  // 4. INSERT OR REPLACE INTO owner_payment_settings
  if (s.includes('into owner_payment_settings')) {
    const [id, owner_id, upi_id, account_holder_name, qr_image_url] = params;
    const existingIndex = store.owner_payment_settings.findIndex((p) => p.owner_id === owner_id);
    const record = {
      id: id || (existingIndex >= 0 ? store.owner_payment_settings[existingIndex].id : `pay_set_${Date.now()}`),
      owner_id,
      upi_id,
      account_holder_name,
      qr_image_url: qr_image_url || null,
      created_at: existingIndex >= 0 ? store.owner_payment_settings[existingIndex].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (existingIndex >= 0) {
      store.owner_payment_settings[existingIndex] = record;
    } else {
      store.owner_payment_settings.push(record);
    }
    return 1;
  }

  // 5. INSERT INTO payment_transactions
  if (s.includes('into payment_transactions')) {
    const [
      id,
      tenant_id,
      user_id,
      owner_id,
      property_id,
      billing_id,
      billing_period,
      amount,
      status,
      payment_provider,
      transaction_id,
      payment_reference,
      payment_date,
      payment_time,
      note,
    ] = params;

    store.payment_transactions.push({
      id,
      tenant_id,
      user_id,
      owner_id,
      property_id,
      billing_id,
      billing_period,
      amount: Number(amount),
      status: status || 'success',
      payment_provider: payment_provider || 'UPI',
      transaction_id,
      payment_reference,
      payment_date: payment_date || new Date().toISOString().split('T')[0],
      payment_time: payment_time || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      note: note || '',
      created_at: new Date().toISOString(),
    });
    return 1;
  }

  // 6. INSERT / UPDATE monthly_billings
  if (s.includes('into monthly_billings')) {
    const [id, tenant_id, user_id, owner_id, property_id, billing_period, amount, due_date, status, paid_at] = params;
    store.monthly_billings.push({
      id,
      tenant_id,
      user_id,
      owner_id,
      property_id,
      billing_period,
      amount: Number(amount),
      due_date,
      status: status || 'due',
      paid_at: paid_at || null,
      created_at: new Date().toISOString(),
    });
    return 1;
  }

  if (s.includes('update monthly_billings set status = ?')) {
    const [status, paid_at, id] = params;
    const bill = store.monthly_billings.find((b) => b.id === id);
    if (bill) {
      bill.status = status;
      bill.paid_at = paid_at || new Date().toISOString();
      return 1;
    }
    return 0;
  }

  // 7. INSERT INTO student_profiles
  if (s.startsWith('insert into student_profiles')) {
    const [
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
      status,
      monthly_fee,
      rent_due_day,
      last_paid_date,
      next_due_date,
      payment_status,
    ] = params;

    const now = new Date();
    const defaultDueDate = new Date(now.getFullYear(), now.getMonth(), rent_due_day || 5).toISOString().split('T')[0];

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
      monthly_fee: monthly_fee ? Number(monthly_fee) : 8000,
      rent_due_day: rent_due_day ? Number(rent_due_day) : 5,
      last_paid_date: last_paid_date || null,
      next_due_date: next_due_date || defaultDueDate,
      payment_status: payment_status || 'due',
      joining_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return 1;
  }

  // 8. UPDATE student_profiles
  if (s.includes('update student_profiles set monthly_fee = ?')) {
    const [monthly_fee, rent_due_day, next_due_date, id] = params;
    const profile = store.student_profiles.find((sp) => sp.id === id);
    if (profile) {
      profile.monthly_fee = Number(monthly_fee);
      if (rent_due_day) profile.rent_due_day = Number(rent_due_day);
      if (next_due_date) profile.next_due_date = next_due_date;
      profile.updated_at = new Date().toISOString();
      return 1;
    }
    return 0;
  }

  if (s.includes('update student_profiles set last_paid_date = ?')) {
    const [last_paid_date, next_due_date, payment_status, id] = params;
    const profile = store.student_profiles.find((sp) => sp.id === id);
    if (profile) {
      profile.last_paid_date = last_paid_date;
      profile.next_due_date = next_due_date;
      profile.payment_status = payment_status;
      profile.updated_at = new Date().toISOString();
      return 1;
    }
    return 0;
  }

  if (s.includes('update student_profiles set status = ?')) {
    const [status, id] = params;
    const profile = store.student_profiles.find((sp) => sp.id === id);
    if (profile) {
      profile.status = status;
      profile.updated_at = new Date().toISOString();
      return 1;
    }
    return 0;
  }

  if (s.includes('update student_profiles set room_number = ?')) {
    const [room_number, bed, id] = params;
    const profile = store.student_profiles.find((sp) => sp.id === id);
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
    store.notifications.forEach((n) => {
      if (n.owner_id === ownerId) n.read = 1;
    });
    return 1;
  }

  return 0;
}

module.exports = {
  db,
  uploadsDir,
  aadhaarDir,
  faceDir,
};
