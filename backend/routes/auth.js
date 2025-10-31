// routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');

const router = express.Router();

/** Login */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ message: 'ไม่พบบัญชีผู้ใช้' });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });

    // set session
    req.session.userId = user.id;
    // เก็บ object ไว้ด้วย (ช่วย middleware อื่น ๆ ใช้งานได้สะดวก)
    req.session.user = {
      id: user.id,
      role: user.role,
      email: user.email,
      name: `${user.prefix} ${user.first_name} ${user.last_name}`,
    };

    res.json({
      message: 'เข้าสู่ระบบสำเร็จ',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        prefix: user.prefix,
        role: user.role,
        faculty: user.faculty,
      },
    });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

/** Register */
router.post('/register', async (req, res) => {
  const {
    prefix,
    first_name,
    last_name,
    email,
    password,
    faculty,
    role, // optional
  } = req.body;

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: 'อีเมลนี้ถูกใช้แล้ว' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users (prefix, first_name, last_name, email, password, faculty, role)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [prefix, first_name, last_name, email, hashed, faculty || null, role || 'สมาชิก']
    );

    // create session
    req.session.userId = result.insertId;
    req.session.user = {
      id: result.insertId,
      role: role || 'สมาชิก',
      email,
      name: `${prefix} ${first_name} ${last_name}`,
    };

    res.status(201).json({
      message: 'สมัครสมาชิกสำเร็จ',
      user: {
        id: result.insertId,
        email,
        first_name,
        last_name,
        prefix,
        role: role || 'สมาชิก',
        faculty: faculty || null,
      },
    });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

/** Me – ส่ง user object กลับ */
router.get('/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'ยังไม่ได้เข้าสู่ระบบ' });
  }
  try {
    const [rows] = await pool.query(
      'SELECT id, prefix, first_name, last_name, email, faculty, role FROM users WHERE id = ?',
      [req.session.userId]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
    res.json({ user: rows[0] });
  } catch (err) {
    console.error('me error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

/** ข้อมูลผู้ใช้คนปัจจุบัน (รายละเอียดมากกว่า me) */
router.get('/getUser', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'ยังไม่ได้เข้าสู่ระบบ' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.session.userId]);
    if (rows.length === 0) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });

    const u = rows[0];
    res.json({
      id: u.id,
      email: u.email,
      name: `${u.prefix} ${u.first_name} ${u.last_name}`,
      role: u.role,
      faculty: u.faculty,
    });
  } catch (err) {
    console.error('getUser error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

/** เฉพาะผู้ดูแล: ดึง users ทั้งหมด */
router.get('/getAllUsers', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: 'ยังไม่ได้เข้าสู่ระบบ' });
  try {
    const [cur] = await pool.query('SELECT role FROM users WHERE id = ?', [req.session.userId]);
    if (cur.length === 0) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
    if ((cur[0].role || '').trim() !== 'ผู้ดูแล') return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });

    const [users] = await pool.query(
      `SELECT id, prefix, first_name, last_name, email, faculty, role, created_at
       FROM users ORDER BY created_at DESC`
    );

    const formatted = users.map(u => ({
      id: u.id,
      name: `${u.prefix} ${u.first_name} ${u.last_name}`,
      email: u.email,
      faculty: u.faculty,
      role: u.role,
      created_at: u.created_at,
    }));

    res.json({ message: 'ดึงข้อมูลผู้ใช้ทั้งหมดสำเร็จ', users: formatted, total: formatted.length });
  } catch (err) {
    console.error('getAllUsers error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

/** เฉพาะผู้ดูแล: อัปเดต role ผู้ใช้ตาม user.id (ยังเก็บไว้ให้เข้ากันได้) */
router.put('/updateRole/:id', async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!req.session.userId) return res.status(401).json({ message: 'ยังไม่ได้เข้าสู่ระบบ' });

  try {
    const [cur] = await pool.query('SELECT role FROM users WHERE id = ?', [req.session.userId]);
    if (cur.length === 0 || (cur[0].role || '').trim() !== 'ผู้ดูแล')
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ในการแก้ไขบทบาท' });

    const validRoles = ['ผู้ดูแล', 'กรรมการ', 'สมาชิก'];
    if (!validRoles.includes(role)) return res.status(400).json({ message: 'บทบาทไม่ถูกต้อง' });

    // ป้องกันลดสิทธิ์ผู้ดูแลคนสุดท้าย
    const [tRows] = await pool.query('SELECT role FROM users WHERE id = ?', [id]);
    if (!tRows.length) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
    const tRole = (tRows[0].role || '').trim();
    if (tRole === 'ผู้ดูแล' && role !== 'ผู้ดูแล') {
      const [countAdmins] = await pool.query(`SELECT COUNT(*) AS c FROM users WHERE role='ผู้ดูแล'`);
      if ((countAdmins[0]?.c || 0) <= 1) {
        return res.status(400).json({ message: 'ไม่สามารถลดสิทธิ์ผู้ดูแลคนสุดท้ายได้' });
      }
    }
    // กันลดสิทธิ์ตัวเอง
    if (String(id) === String(req.session.userId) && role !== 'ผู้ดูแล') {
      return res.status(400).json({ message: 'ไม่อนุญาตให้ลดสิทธิ์ผู้ดูแลของตัวเองผ่าน API นี้' });
    }

    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    res.json({ message: 'อัปเดตบทบาทผู้ใช้สำเร็จ', updatedRole: role });
  } catch (err) {
    console.error('updateRole error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

/** Logout */
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    // ชื่อคุกกี้ตามที่ตั้งไว้ใน index.js คือ 'mc.sid'
    res.clearCookie('mc.sid', { path: '/' });
    res.json({ message: 'ออกจากระบบแล้ว' });
  });
});

module.exports = router;
