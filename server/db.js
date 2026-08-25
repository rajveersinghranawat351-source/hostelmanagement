const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'hostel_pg.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create upload directories
const uploadsDir = path.join(__dirname, 'uploads');
const aadhaarDir = path.join(uploadsDir, 'aadhaar');
const faceDir = path.join(uploadsDir, 'face_photos');

[uploadsDir, aadhaarDir, faceDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Helper to safely add column if not exists
function ensureColumn(tableName, columnName, columnDef) {
  try {
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const exists = columns.some((c) => c.name === columnName);
    if (!exists) {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
    }
  } catch (err) {
    console.warn(`Column check warning for ${tableName}.${columnName}:`, err.message);
  }
}

// Initialize Tables
db.exec(`
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
    qr_status TEXT DEFAULT 'active', -- 'active', 'expired', 'revoked'
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

// Apply dynamic column upgrades for existing tables
ensureColumn('properties', 'city', "TEXT DEFAULT 'Jaipur, Rajasthan'");
ensureColumn('properties', 'qr_status', "TEXT DEFAULT 'active'");
ensureColumn('properties', 'default_room', "TEXT DEFAULT '204'");
ensureColumn('properties', 'default_bed', "TEXT DEFAULT 'B'");

ensureColumn('student_profiles', 'student_id_code', 'TEXT');
ensureColumn('student_profiles', 'owner_id', 'TEXT');
ensureColumn('student_profiles', 'qr_identifier', 'TEXT');
ensureColumn('student_profiles', 'dob', 'TEXT');
ensureColumn('student_profiles', 'email', 'TEXT');
ensureColumn('student_profiles', 'college_name', 'TEXT');
ensureColumn('student_profiles', 'course', 'TEXT');
ensureColumn('student_profiles', 'branch', 'TEXT');
ensureColumn('student_profiles', 'year_semester', 'TEXT');
ensureColumn('student_profiles', 'enrollment_number', 'TEXT');
ensureColumn('student_profiles', 'guardian_name', 'TEXT');
ensureColumn('student_profiles', 'guardian_mobile', 'TEXT');
ensureColumn('student_profiles', 'emergency_contact', 'TEXT');
ensureColumn('student_profiles', 'relationship', 'TEXT');
ensureColumn('student_profiles', 'bed', 'TEXT');

// Function to seed default demo data if database is fresh
function seedInitialData() {
  const userCount = db.prepare('SELECT count(*) as count FROM users').get().count;
  if (userCount === 0) {
    console.log('🌱 Seeding sample owner, property, and student for instant testing...');
    
    const ownerPassword = bcrypt.hashSync('owner123', 10);
    const studentPassword = bcrypt.hashSync('student123', 10);

    const ownerId = 'usr_owner_demo_01';
    const studentId = 'usr_student_demo_01';
    const propertyId = 'prop_sunrise_01';
    const qrIdentifier = 'pg_sunrise_boys_2026';
    const profileId = 'prof_abhay_01';

    // Insert Owner
    db.prepare(`
      INSERT INTO users (id, name, email, mobile, password_hash, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(ownerId, 'Rajesh Sharma', 'owner@sunrise.com', '9876543210', ownerPassword, 'owner');

    // Insert Property
    db.prepare(`
      INSERT INTO properties (id, owner_id, property_name, property_type, address, contact, city, qr_identifier, qr_status, default_room, default_bed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      propertyId,
      ownerId,
      'Sunrise Boys PG & Hostel',
      'Boys PG',
      'Plot 42, Knowledge Park III, Near Metro Station, Sector 62',
      '9876543210',
      'Jaipur, Rajasthan',
      qrIdentifier,
      'active',
      '204',
      'B'
    );

    // Insert Student User
    db.prepare(`
      INSERT INTO users (id, name, email, mobile, password_hash, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(studentId, 'Abhay Shekhawat', 'abhay@example.com', '9123456780', studentPassword, 'student');

    // Create placeholder dummy document files for demo
    const sampleFace = 'demo_face_abhay.png';
    const sampleAadhaar = 'demo_aadhaar_abhay.png';
    
    const dummyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const facePath = path.join(faceDir, sampleFace);
    const aadhaarPath = path.join(aadhaarDir, sampleAadhaar);
    if (!fs.existsSync(facePath)) fs.writeFileSync(facePath, Buffer.from(dummyPngBase64, 'base64'));
    if (!fs.existsSync(aadhaarPath)) fs.writeFileSync(aadhaarPath, Buffer.from(dummyPngBase64, 'base64'));

    // Insert Student Profile
    db.prepare(`
      INSERT INTO student_profiles (
        id, student_id_code, user_id, property_id, owner_id, qr_identifier, full_name, dob, gender,
        mobile, email, address, hometown, college_name, course, branch, year_semester,
        enrollment_number, guardian_name, guardian_mobile, emergency_contact, relationship,
        purpose, stay_duration, room_number, bed, face_photo, aadhaar_document, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      profileId,
      'STU-2026-8812',
      studentId,
      propertyId,
      ownerId,
      qrIdentifier,
      'Abhay Shekhawat',
      '2003-05-14',
      'Male',
      '9123456780',
      'abhay@example.com',
      'House #104, Civil Lines, Jaipur, Rajasthan',
      'Jaipur, Rajasthan',
      'Jaipur National Institute of Technology',
      'B.Tech',
      'Computer Science & Engg.',
      '3rd Year / 5th Sem',
      'JNIT-2023-CS-042',
      'Vikram Shekhawat',
      '9829012345',
      '9829012345',
      'Father',
      'College Studies',
      '1 Year',
      '204',
      'B',
      sampleFace,
      sampleAadhaar,
      'active'
    );

    // Insert Notification
    db.prepare(`
      INSERT INTO notifications (id, owner_id, student_id, type, message, read)
      VALUES (?, ?, ?, 'registration', ?, 1)
    `).run(
      'notif_01',
      ownerId,
      profileId,
      'Abhay Shekhawat has joined Sunrise Boys PG & Hostel using your QR invitation.'
    );

    console.log('✅ Sample data seeded successfully!');
  }
}

seedInitialData();

module.exports = {
  db,
  uploadsDir,
  aadhaarDir,
  faceDir,
};
