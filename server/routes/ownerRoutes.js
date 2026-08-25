const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireAuth, requireRole } = require('../auth');

// All routes require owner role
router.use(requireAuth, requireRole('owner'));

// Helper to get owner's property
function getOwnerProperty(ownerId) {
  return db.prepare('SELECT * FROM properties WHERE owner_id = ?').get(ownerId);
}

// 1. Get Owner Stats & Property info
router.get('/stats', (req, res) => {
  try {
    const property = getOwnerProperty(req.user.id);
    if (!property) {
      return res.json({ hasProperty: false, stats: null, property: null });
    }

    const counts = db.prepare(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN status = 'vacated' THEN 1 ELSE 0 END) AS vacated
      FROM student_profiles
      WHERE property_id = ?
    `).get(property.id);

    const unreadNotifs = db.prepare(`
      SELECT COUNT(*) as unreadCount FROM notifications WHERE owner_id = ? AND read = 0
    `).get(req.user.id).unreadCount;

    return res.json({
      hasProperty: true,
      property,
      stats: {
        total: counts.total || 0,
        pending: counts.pending || 0,
        active: counts.active || 0,
        vacated: counts.vacated || 0,
        unreadNotifications: unreadNotifs || 0,
      },
    });
  } catch (error) {
    console.error('Owner stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch owner statistics.' });
  }
});

// 2. Get Students List
// Shows student Name, Status, Room, Bed, College, Course, Year, Joining Date
router.get('/students', (req, res) => {
  try {
    const property = getOwnerProperty(req.user.id);
    if (!property) {
      return res.json({ students: [] });
    }

    const { status, q } = req.query;

    let sql = `
      SELECT id, student_id_code, full_name, mobile, college_name, course, branch, year_semester,
             room_number, bed, status, joining_date, created_at
      FROM student_profiles
      WHERE property_id = ?
    `;
    const params = [property.id];

    if (status && ['pending', 'active', 'vacated'].includes(status.toLowerCase())) {
      sql += ` AND status = ?`;
      params.push(status.toLowerCase());
    }

    if (q && q.trim()) {
      sql += ` AND (LOWER(full_name) LIKE ? OR LOWER(college_name) LIKE ? OR room_number LIKE ?)`;
      const queryPattern = `%${q.trim().toLowerCase()}%`;
      params.push(queryPattern, queryPattern, queryPattern);
    }

    sql += ` ORDER BY created_at DESC`;

    const students = db.prepare(sql).all(...params);

    return res.json({ students });
  } catch (error) {
    console.error('Owner get students error:', error);
    return res.status(500).json({ error: 'Failed to fetch students list.' });
  }
});

// 3. Get Single Student Profile (Full details with strict authorization)
router.get('/students/:id', (req, res) => {
  try {
    const property = getOwnerProperty(req.user.id);
    if (!property) {
      return res.status(404).json({ error: 'Owner property not found.' });
    }

    const student = db.prepare(`
      SELECT * FROM student_profiles WHERE id = ?
    `).get(req.params.id);

    if (!student) {
      return res.status(404).json({ error: 'Student record not found.' });
    }

    // Strict Authorization
    if (student.property_id !== property.id) {
      return res.status(403).json({
        error: 'Access denied. You can only view students registered to your own property.',
      });
    }

    return res.json({
      student: {
        id: student.id,
        studentIdCode: student.student_id_code,
        fullName: student.full_name,
        dob: student.dob,
        gender: student.gender,
        mobile: student.mobile,
        email: student.email,
        address: student.address,
        hometown: student.hometown,
        collegeName: student.college_name,
        course: student.course,
        branch: student.branch,
        yearSemester: student.year_semester,
        enrollmentNumber: student.enrollment_number,
        guardianName: student.guardian_name,
        guardianMobile: student.guardian_mobile,
        emergencyContact: student.emergency_contact,
        relationship: student.relationship,
        purpose: student.purpose,
        stayDuration: student.stay_duration,
        roomNumber: student.room_number,
        bed: student.bed,
        joiningDate: student.joining_date,
        status: student.status,
        createdAt: student.created_at,
        facePhotoUrl: `/api/documents/${student.id}/face`,
        aadhaarDocumentUrl: `/api/documents/${student.id}/aadhaar`,
      },
    });
  } catch (error) {
    console.error('Owner get student profile error:', error);
    return res.status(500).json({ error: 'Failed to fetch student details.' });
  }
});

// 4. Update Student Status (pending -> active -> vacated)
router.patch('/students/:id/status', (req, res) => {
  try {
    const property = getOwnerProperty(req.user.id);
    if (!property) {
      return res.status(404).json({ error: 'Owner property not found.' });
    }

    const { status } = req.body;
    if (!['pending', 'active', 'vacated'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be pending, active, or vacated.' });
    }

    const student = db.prepare('SELECT id, property_id FROM student_profiles WHERE id = ?').get(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    if (student.property_id !== property.id) {
      return res.status(403).json({ error: 'Access denied. You can only update students of your property.' });
    }

    db.prepare(`
      UPDATE student_profiles
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, req.params.id);

    return res.json({ message: `Student status updated to ${status} successfully!`, status });
  } catch (error) {
    console.error('Update student status error:', error);
    return res.status(500).json({ error: 'Failed to update student status.' });
  }
});

// 5. Update Student Room & Bed Assignment
router.patch('/students/:id/room', (req, res) => {
  try {
    const property = getOwnerProperty(req.user.id);
    if (!property) {
      return res.status(404).json({ error: 'Owner property not found.' });
    }

    const { roomNumber, bed } = req.body;

    const student = db.prepare('SELECT id, property_id FROM student_profiles WHERE id = ?').get(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    if (student.property_id !== property.id) {
      return res.status(403).json({ error: 'Access denied. You can only update students of your property.' });
    }

    db.prepare(`
      UPDATE student_profiles
      SET room_number = ?, bed = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(roomNumber ? roomNumber.trim() : null, bed ? bed.trim() : null, req.params.id);

    return res.json({ message: 'Room & Bed updated successfully!', roomNumber, bed });
  } catch (error) {
    console.error('Update student room error:', error);
    return res.status(500).json({ error: 'Failed to update room assignment.' });
  }
});

// 6. Notifications
router.get('/notifications', (req, res) => {
  try {
    const notifications = db.prepare(`
      SELECT n.*, sp.full_name AS student_name
      FROM notifications n
      LEFT JOIN student_profiles sp ON n.student_id = sp.id
      WHERE n.owner_id = ?
      ORDER BY n.created_at DESC
      LIMIT 50
    `).all(req.user.id);

    const unreadCount = db.prepare(`
      SELECT COUNT(*) as count FROM notifications WHERE owner_id = ? AND read = 0
    `).get(req.user.id).count;

    return res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// 7. Mark Notifications Read
router.post('/notifications/read-all', (req, res) => {
  try {
    db.prepare(`
      UPDATE notifications SET read = 1 WHERE owner_id = ?
    `).run(req.user.id);

    return res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Mark read error:', error);
    return res.status(500).json({ error: 'Failed to mark notifications as read.' });
  }
});

module.exports = router;
