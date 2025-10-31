const express = require('express');
const pool = require('../db');
const router = express.Router();

// Middleware ตรวจสอบสิทธิ์
const { requireAuth, requireAdminOrCommittee } = require('../middleware/auth');

// ✅ ดึงอุปกรณ์ทั้งหมด
router.get('/', requireAuth, async (req, res) => {
  try {
    const [equipments] = await pool.query('SELECT * FROM equipments ORDER BY id DESC');
    res.json({ message: 'ดึงข้อมูลอุปกรณ์สำเร็จ', equipments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ✅ เพิ่มอุปกรณ์
router.post('/', requireAuth, requireAdminOrCommittee, async (req, res) => {
  const { name, code, status } = req.body;
  if (!name || !code || !status) {
    return res.status(400).json({ message: 'กรุณาระบุข้อมูลให้ครบถ้วน' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO equipments (name, code, status) VALUES (?, ?, ?)',
      [name, code, status]
    );

    const [newEquipment] = await pool.query('SELECT * FROM equipments WHERE id = ?', [result.insertId]);
    res.status(201).json({ message: 'เพิ่มอุปกรณ์สำเร็จ', equipment: newEquipment[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ✅ ดูอุปกรณ์จาก ID
router.get('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM equipments WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบอุปกรณ์ที่ระบุ' });
    }
    res.json({ message: 'ดึงข้อมูลอุปกรณ์สำเร็จ', equipment: rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ✅ แก้ไขข้อมูลอุปกรณ์
router.put('/:id', requireAuth, requireAdminOrCommittee, async (req, res) => {
  const { id } = req.params;
  const { name, code, status } = req.body;

  try {
    const [result] = await pool.query(
      'UPDATE equipments SET name = ?, code = ?, status = ? WHERE id = ?',
      [name, code, status, id]
    );

    res.json({ message: 'อัปเดตอุปกรณ์สำเร็จ' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

// ✅ ลบอุปกรณ์
router.delete('/:id', requireAuth, requireAdminOrCommittee, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM equipments WHERE id = ?', [id]);
    res.json({ message: 'ลบอุปกรณ์สำเร็จ' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

module.exports = router;
