const express = require('express');
const pool = require('../db');
const router = express.Router();
const { requireAuth, requireAdminOrCommittee } = require('../middleware/auth');

/**
 * finances:
 *  id INT PK AI
 *  type ENUM('รายรับ','รายจ่าย') NOT NULL
 *  category VARCHAR(100) NOT NULL
 *  amount DECIMAL(10,2) NOT NULL
 *  date DATE NOT NULL
 *  description TEXT NULL
 *  attachment VARCHAR(255) NULL
 */

/* ---------- Summary ต้องมาก่อน id ---------- */
router.get('/summary/monthly/:yyyy', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT DATE_FORMAT(date,'%Y-%m') AS month,
              SUM(CASE WHEN type='รายรับ' THEN amount ELSE 0 END) AS income,
              SUM(CASE WHEN type='รายจ่าย' THEN amount ELSE 0 END) AS expense,
              (SUM(CASE WHEN type='รายรับ' THEN amount ELSE 0 END) -
               SUM(CASE WHEN type='รายจ่าย' THEN amount ELSE 0 END)) AS balance
       FROM finances
       WHERE YEAR(date)=?
       GROUP BY DATE_FORMAT(date,'%Y-%m')
       ORDER BY month DESC`,
      [req.params.yyyy]
    );
    res.json({ message: 'สรุปยอดรายเดือนสำเร็จ', year: req.params.yyyy, summary: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

/* ---------- GET ทั้งหมด ---------- */
router.get('/', requireAuth, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, type, category, amount, date, description, attachment
       FROM finances
       ORDER BY date DESC, id DESC`
    );
    res.json({ message: 'ดึงข้อมูลการเงินสำเร็จ', finances: rows, total: rows.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

/* ---------- GET by id ---------- */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, type, category, amount, date, description, attachment FROM finances WHERE id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'ไม่พบรายการการเงิน' });
    res.json({ message: 'ดึงข้อมูลสำเร็จ', finance: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

/* ---------- Add ---------- */
router.post('/add', requireAuth, requireAdminOrCommittee, async (req, res) => {
  let { type, category, amount, date, description, attachment } = req.body;
  if (!type || !category || amount === undefined || !date)
    return res.status(400).json({ message: 'กรุณากรอก type, category, amount, date ให้ครบ' });

  const allowed = new Set(['รายรับ','รายจ่าย']);
  if (!allowed.has(type)) return res.status(400).json({ message: "type ต้องเป็น 'รายรับ' หรือ 'รายจ่าย'" });

  amount = Number(amount);
  if (Number.isNaN(amount)) return res.status(400).json({ message: 'amount ต้องเป็นตัวเลข' });

  try {
    const [r] = await pool.query(
      `INSERT INTO finances (type, category, amount, date, description, attachment)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [type, category, amount, date, description || null, attachment || null]
    );
    res.status(201).json({ message: 'เพิ่มรายการสำเร็จ', id: r.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

/* ---------- Update ---------- */
router.put('/:id', requireAuth, requireAdminOrCommittee, async (req, res) => {
  let { type, category, amount, date, description, attachment } = req.body;
  const sets = [], vals = [];

  if (type !== undefined) {
    const allowed = new Set(['รายรับ','รายจ่าย']);
    if (!allowed.has(type)) return res.status(400).json({ message: "type ต้องเป็น 'รายรับ' หรือ 'รายจ่าย'" });
    sets.push('type = ?'); vals.push(type);
  }
  if (category !== undefined) { sets.push('category = ?'); vals.push(category); }
  if (amount !== undefined) {
    amount = Number(amount); if (Number.isNaN(amount)) return res.status(400).json({ message: 'amount ต้องเป็นตัวเลข' });
    sets.push('amount = ?'); vals.push(amount);
  }
  if (date !== undefined) { sets.push('date = ?'); vals.push(date); }
  if (description !== undefined) { sets.push('description = ?'); vals.push(description); }
  if (attachment !== undefined) { sets.push('attachment = ?'); vals.push(attachment); }

  if (sets.length === 0) return res.status(400).json({ message: 'ไม่มีข้อมูลสำหรับอัปเดต' });

  try {
    const [r] = await pool.query(`UPDATE finances SET ${sets.join(', ')} WHERE id = ?`, [...vals, req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: 'ไม่พบรายการการเงิน' });
    res.json({ message: 'อัปเดตรายการสำเร็จ' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

/* ---------- Delete ---------- */
router.delete('/:id', requireAuth, requireAdminOrCommittee, async (req, res) => {
  try {
    const [r] = await pool.query(`DELETE FROM finances WHERE id = ?`, [req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ message: 'ไม่พบรายการการเงิน' });
    res.json({ message: 'ลบรายการสำเร็จ' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

module.exports = router;
