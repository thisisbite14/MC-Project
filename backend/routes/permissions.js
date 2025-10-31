// routes/permissions.js
const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Allowed roles (ต้องตรงกับ ENUM ใน DB)
const ROLES = ['ผู้ดูแล', 'กรรมการ', 'สมาชิก'];

/* ---------------------------------------------------
 *  GET /api/permissions/roles
 *  รายการบทบาทที่ระบบรองรับ
 * --------------------------------------------------- */
router.get('/roles', requireAuth, (req, res) => {
  res.json({ message: 'รายการบทบาท', roles: ROLES });
});

/* ---------------------------------------------------
 *  GET /api/permissions/users?role=กรรมการ
 *  ดึงรายชื่อผู้ใช้ (สำหรับแอดมินเท่านั้น)
 *  - รองรับกรองตาม role
 *  - ใช้คอลัมน์ตาม schema จริง และสร้าง fullname จาก prefix/first_name/last_name
 * --------------------------------------------------- */
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const role = (req.query.role || '').trim();
    const where = [];
    const params = [];

    if (role) {
      if (!ROLES.includes(role)) {
        return res.status(400).json({ message: 'role ไม่ถูกต้อง' });
      }
      where.push('role = ?');
      params.push(role);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `
      SELECT
        id,
        TRIM(CONCAT(COALESCE(prefix, ''), ' ', first_name, ' ', last_name)) AS fullname,
        email,
        role,
        faculty,
        created_at
      FROM users
      ${whereSql}
      ORDER BY role ASC, fullname ASC
      `,
      params
    );

    res.json({
      message: 'ดึงรายชื่อผู้ใช้สำเร็จ',
      users: rows,
      total: rows.length,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

/* ---------------------------------------------------
 *  GET /api/permissions/users/:id
 *  ดึงข้อมูลผู้ใช้ 1 คน (แอดมินเท่านั้น)
 * --------------------------------------------------- */
router.get('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'ID ไม่ถูกต้อง' });
    }

    const [rows] = await pool.query(
      `
      SELECT
        id,
        TRIM(CONCAT(COALESCE(prefix, ''), ' ', first_name, ' ', last_name)) AS fullname,
        email,
        role,
        faculty,
        created_at
      FROM users
      WHERE id = ?
      `,
      [id]
    );

    if (rows.length === 0) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
    res.json({ message: 'ดึงข้อมูลผู้ใช้สำเร็จ', user: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

/* ---------------------------------------------------
 *  PUT /api/permissions/users/:id/role
 *  เปลี่ยนบทบาทผู้ใช้ (แอดมินเท่านั้น)
 *  - ป้องกันการลดสิทธิ์แอดมินคนสุดท้าย
 *  - ไม่อนุญาตลดสิทธิ์ตัวเองจนเหลือแอดมิน 0
 * --------------------------------------------------- */
router.put('/users/:id/role', requireAuth, requireAdmin, async (req, res) => {
  const targetId = Number(req.params.id);
  const { role } = req.body || {};

  if (!Number.isInteger(targetId)) {
    return res.status(400).json({ message: 'ID ไม่ถูกต้อง' });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ message: 'role ไม่ถูกต้อง' });
  }

  try {
    // นับจำนวนผู้ดูแลปัจจุบัน
    const [[{ admins }]] = await pool.query(
      `SELECT COUNT(*) AS admins FROM users WHERE role='ผู้ดูแล'`
    );

    const [targetRows] = await pool.query(
      `SELECT id, role FROM users WHERE id = ?`,
      [targetId]
    );
    if (targetRows.length === 0) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });

    const currentRole = targetRows[0].role;

    // ถ้าจะลดผู้ดูแล และมีผู้ดูแลอยู่แค่ 1 คน → ไม่อนุญาต
    if (currentRole === 'ผู้ดูแล' && role !== 'ผู้ดูแล' && admins <= 1) {
      return res.status(400).json({ message: 'ไม่สามารถลดผู้ดูแลคนสุดท้ายได้' });
    }

    // กันกรณีลดสิทธิ์ตัวเองจนเหลือ 0 แอดมิน
    if (targetId === req.session.userId && currentRole === 'ผู้ดูแล' && role !== 'ผู้ดูแล' && admins <= 1) {
      return res.status(400).json({ message: 'ไม่สามารถลดสิทธิ์ตนเองจนไม่มีผู้ดูแลเหลืออยู่' });
    }

    const [r] = await pool.query(`UPDATE users SET role = ? WHERE id = ?`, [role, targetId]);
    if (r.affectedRows === 0) return res.status(404).json({ message: 'อัปเดตบทบาทไม่สำเร็จ' });

    res.json({ message: 'อัปเดตบทบาทสำเร็จ', id: targetId, role });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

/* ---------------------------------------------------
 *  POST /api/permissions/users/bulk
 *  เปลี่ยนบทบาทแบบกลุ่ม (แอดมินเท่านั้น)
 *  - ตรวจความถูกต้องของ role
 *  - ล็อกแถว (FOR UPDATE) เพื่อคำนวณ delta ให้ไม่เหลือแอดมิน 0
 * --------------------------------------------------- */
router.post('/users/bulk', requireAuth, requireAdmin, async (req, res) => {
  const changes = Array.isArray(req.body?.changes) ? req.body.changes : [];
  if (changes.length === 0) {
    return res.status(400).json({ message: 'ไม่มีรายการเปลี่ยนบทบาท' });
  }

  // ตรวจรูปแบบเบื้องต้น
  for (const c of changes) {
    const idNum = Number(c?.id);
    if (!Number.isInteger(idNum) || !ROLES.includes(c?.role)) {
      return res.status(400).json({ message: 'ข้อมูลไม่ถูกต้องใน changes' });
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // จำนวนแอดมินก่อนหน้า
    const [[{ adminsBefore }]] = await conn.query(
      `SELECT COUNT(*) AS adminsBefore FROM users WHERE role='ผู้ดูแล'`
    );

    // คำนวณการเปลี่ยนแปลงจำนวนแอดมิน โดยล็อกแถวที่เกี่ยวข้อง
    let adminDelta = 0;
    for (const c of changes) {
      const idNum = Number(c.id);
      const [rows] = await conn.query(
        `SELECT role FROM users WHERE id = ? FOR UPDATE`,
        [idNum]
      );
      if (rows.length === 0) throw new Error('ไม่พบผู้ใช้บางรายการ');

      const was = rows[0].role;
      const will = c.role;
      if (was === 'ผู้ดูแล' && will !== 'ผู้ดูแล') adminDelta -= 1;
      if (was !== 'ผู้ดูแล' && will === 'ผู้ดูแล') adminDelta += 1;
    }

    const adminsAfter = adminsBefore + adminDelta;
    if (adminsAfter <= 0) {
      throw new Error('การเปลี่ยนแปลงทำให้ไม่มีผู้ดูแลเหลืออยู่');
    }

    // apply อัปเดตทั้งหมด
    for (const c of changes) {
      const idNum = Number(c.id);
      await conn.query(`UPDATE users SET role = ? WHERE id = ?`, [c.role, idNum]);
    }

    await conn.commit();
    res.json({ message: 'อัปเดตบทบาทแบบกลุ่มสำเร็จ', count: changes.length });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(400).json({ message: e.message || 'อัปเดตบทบาทแบบกลุ่มไม่สำเร็จ' });
  } finally {
    conn.release();
  }
});

module.exports = router;
