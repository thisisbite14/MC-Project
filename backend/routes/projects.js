const express = require('express');
const pool = require('../db');
const router = express.Router();

const { requireAuth, requireAdminOrCommittee } = require('../middleware/auth');

// ✅ ดึงโปรเจกต์ทั้งหมด
router.get('/', requireAuth, async (req, res) => {
  try {
    const [projects] = await pool.query('SELECT * FROM projects ORDER BY start_date DESC');
    res.json({ message: 'ดึงข้อมูลโปรเจกต์สำเร็จ', projects });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ✅ เพิ่มโปรเจกต์ใหม่
router.post('/', requireAuth, requireAdminOrCommittee, async (req, res) => {
  const { name, description, budget, start_date, end_date, status } = req.body;

  if (!name || !budget || !start_date || !end_date || !status) {
    return res.status(400).json({ message: 'กรอกข้อมูลให้ครบถ้วน' });
  }

  const allowedStatus = ['pending', 'ongoing', 'done'];
  if (!allowedStatus.includes(status)) {
    return res.status(400).json({ message: 'สถานะไม่ถูกต้อง' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO projects (name, description, budget, start_date, end_date, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, description, budget, start_date, end_date, status]
    );

    const [newProject] = await pool.query('SELECT * FROM projects WHERE id = ?', [result.insertId]);
    res.status(201).json({ message: 'เพิ่มโปรเจกต์สำเร็จ', project: newProject[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ✅ ดูโปรเจกต์ตาม ID
router.get('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM projects WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'ไม่พบโปรเจกต์ที่ระบุ' });
    res.json({ message: 'ดึงโปรเจกต์สำเร็จ', project: rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ✅ แก้ไขโปรเจกต์
router.put('/:id', requireAuth, requireAdminOrCommittee, async (req, res) => {
  const { id } = req.params;
  const { name, description, budget, start_date, end_date, status } = req.body;

  const allowedStatus = ['pending', 'ongoing', 'done'];
  if (!allowedStatus.includes(status)) {
    return res.status(400).json({ message: 'สถานะไม่ถูกต้อง' });
  }

  try {
    await pool.query(
      `UPDATE projects SET name = ?, description = ?, budget = ?, start_date = ?, end_date = ?, status = ? WHERE id = ?`,
      [name, description, budget, start_date, end_date, status, id]
    );
    res.json({ message: 'อัปเดตโปรเจกต์สำเร็จ' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ✅ ลบโปรเจกต์
router.delete('/:id', requireAuth, requireAdminOrCommittee, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM projects WHERE id = ?', [id]);
    res.json({ message: 'ลบโปรเจกต์สำเร็จ' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

module.exports = router;
