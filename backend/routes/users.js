const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdminOrCommittee } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/non-members
router.get('/non-members', requireAuth, requireAdminOrCommittee, async (req, res) => {
  try {
    const [users] = await pool.query(`
      SELECT 
        u.id,
        u.prefix,
        u.first_name,
        u.last_name,
        u.email,
        u.faculty
      FROM users u
      LEFT JOIN members m ON u.id = m.user_id
      WHERE m.user_id IS NULL
      ORDER BY u.first_name, u.last_name
    `);

    const formattedUsers = users.map(user => ({
      id: user.id,
      name: `${user.prefix} ${user.first_name} ${user.last_name}`,
      email: user.email,
      faculty: user.faculty
    }));

    res.json({
      message: 'ดึงรายชื่อผู้ใช้ที่ยังไม่เป็นสมาชิกสำเร็จ',
      users: formattedUsers,
      total: formattedUsers.length
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

module.exports = router;
