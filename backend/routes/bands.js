// routes/bands.js
const express = require('express');
const pool = require('../db');
const router = express.Router();
const { requireAuth, requireAdmin, requireAdminOrCommittee } = require('../middleware/auth');

/* -------------------------- รายการวงทั้งหมด -------------------------- */
router.get('/getAllBands', requireAuth, async (req, res) => {
  try {
    const [bands] = await pool.query(`
      SELECT b.id, b.name, b.year, b.description, b.created_at,
             (SELECT COUNT(*) FROM band_members bm WHERE bm.band_id = b.id) AS member_count
      FROM bands b
      ORDER BY b.year DESC, b.name ASC
    `);
    res.json({ message: 'ดึงข้อมูลวงดนตรีสำเร็จ', bands, total: bands.length });
  } catch (err) {
    console.error('getAllBands error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

/* ------------------------------ เพิ่มวง (รองรับ members) ------------------------------ */
router.post('/', requireAuth, requireAdminOrCommittee, async (req, res) => {
  const { name, year, description, members = [] } = req.body || {};
  if (!name || year == null) {
    return res.status(400).json({ message: 'กรุณากรอกชื่อวงและปีที่จัดตั้ง' });
  }

  const y = Number(year);
  const currentYear = new Date().getFullYear();
  if (!Number.isInteger(y) || y < 1900 || y > currentYear + 10) {
    return res.status(400).json({ message: 'ปีที่จัดตั้งไม่ถูกต้อง' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [dup] = await conn.query('SELECT id FROM bands WHERE name = ?', [name.trim()]);
    if (dup.length) {
      await conn.rollback();
      return res.status(400).json({ message: 'ชื่อวงนี้มีอยู่แล้ว' });
    }

    const [result] = await conn.query(
      'INSERT INTO bands (name, `year`, description) VALUES (?, ?, ?)',
      [name.trim(), y, (description || null)]
    );
    const bandId = result.insertId;

    if (Array.isArray(members) && members.length > 0) {
      const ids = members.map(m => Number(m.member_id)).filter(Number.isInteger);
      if (ids.length !== members.length) {
        await conn.rollback();
        return res.status(400).json({ message: 'member_id ไม่ถูกต้อง' });
      }
      const [exists] = await conn.query(
        `SELECT id FROM members WHERE id IN (${ids.map(() => '?').join(',')})`,
        ids
      );
      if (exists.length !== ids.length) {
        await conn.rollback();
        return res.status(400).json({ message: 'มีบาง member_id ไม่พบในระบบ' });
      }
      for (const m of members) {
        await conn.query(
          `INSERT INTO band_members (band_id, member_id, role_in_band)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE role_in_band = VALUES(role_in_band)`,
          [bandId, m.member_id, (m.role_in_band || null)]
        );
      }
    }

    await conn.commit();
    const [rows] = await pool.query(
      'SELECT id, name, `year`, description, created_at FROM bands WHERE id = ?',
      [bandId]
    );
    res.status(201).json({ message: 'เพิ่มวงดนตรีสำเร็จ', band: rows[0] });
  } catch (err) {
    console.error('create band error:', err);
    try { await conn.rollback(); } catch {}
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  } finally {
    conn.release();
  }
});

/* ---------------------- ดึงรายละเอียดวง + สมาชิก ---------------------- */
// ALIAS ใหม่: /api/bands/:id  (ให้ payload เหมือน /getBand/:id)
async function getBandPayload(id) {
  const [[band]] = await pool.query(
    'SELECT id, name, `year`, description, created_at FROM bands WHERE id = ?',
    [id]
  );
  if (!band) return null;

  const [schedules] = await pool.query(
    `SELECT id, activity, date, time, location
     FROM schedules WHERE band_id = ?
     ORDER BY date ASC, time ASC`,
    [id]
  );
  const [members] = await pool.query(
    `SELECT 
       bm.member_id,
       u.id AS user_id,
       CONCAT(u.prefix, ' ', u.first_name, ' ', u.last_name) AS name,
       u.email, u.faculty, u.role AS user_role,
       m.status AS member_status,
       bm.role_in_band, bm.joined_at
     FROM band_members bm
     JOIN members m ON m.id = bm.member_id
     JOIN users   u ON u.id = m.user_id
     WHERE bm.band_id = ?
     ORDER BY name ASC`,
    [id]
  );
  return { ...band, schedules, members };
}

router.get('/getBand/:id', requireAuth, async (req, res) => {
  try {
    const band = await getBandPayload(req.params.id);
    if (!band) return res.status(404).json({ message: 'ไม่พบวงดนตรีที่ระบุ' });
    res.json({ message: 'ดึงข้อมูลวงดนตรีสำเร็จ', band });
  } catch (err) {
    console.error('getBand error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const band = await getBandPayload(req.params.id);
    if (!band) return res.status(404).json({ message: 'ไม่พบวงดนตรีที่ระบุ' });
    res.json({ message: 'ดึงข้อมูลวงดนตรีสำเร็จ', band });
  } catch (err) {
    console.error('get band (alias) error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

/* ------------------------------ แก้ไขวง ------------------------------ */
router.put('/updateBand/:id', requireAuth, requireAdminOrCommittee, async (req, res) => {
  const { id } = req.params;
  const { name, year, description } = req.body || {};
  if (!name || year == null) return res.status(400).json({ message: 'กรุณากรอกชื่อวงและปีที่จัดตั้ง' });

  const y = Number(year);
  const currentYear = new Date().getFullYear();
  if (!Number.isInteger(y) || y < 1900 || y > currentYear + 10)
    return res.status(400).json({ message: 'ปีที่จัดตั้งไม่ถูกต้อง' });

  try {
    const [[exist]] = await pool.query('SELECT id FROM bands WHERE id = ?', [id]);
    if (!exist) return res.status(404).json({ message: 'ไม่พบวงดนตรีที่ระบุ' });

    const [dup] = await pool.query('SELECT id FROM bands WHERE name = ? AND id != ?', [name.trim(), id]);
    if (dup.length) return res.status(400).json({ message: 'ชื่อวงนี้มีอยู่แล้ว' });

    await pool.query(
      'UPDATE bands SET name = ?, `year` = ?, description = ? WHERE id = ?',
      [name.trim(), y, (description || null), id]
    );

    const [[row]] = await pool.query(
      'SELECT id, name, `year`, description, created_at FROM bands WHERE id = ?',
      [id]
    );
    res.json({ message: 'อัปเดตข้อมูลวงดนตรีสำเร็จ', band: row });
  } catch (err) {
    console.error('updateBand error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

/* ------------------- ลบวง (เฉพาะผู้ดูแลเท่านั้น) ------------------- */
router.delete('/deleteBand/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const [[band]] = await pool.query('SELECT id FROM bands WHERE id = ?', [id]);
    if (!band) return res.status(404).json({ message: 'ไม่พบวงดนตรีที่ระบุ' });

    const [[s1]] = await pool.query('SELECT COUNT(*) AS c FROM schedules WHERE band_id = ?', [id]);
    if (s1.c > 0) {
      return res.status(400).json({ message: 'มีตารางที่เชื่อมโยงอยู่ กรุณาลบตารางก่อน' });
    }

    await pool.query('DELETE FROM band_members WHERE band_id = ?', [id]);
    await pool.query('DELETE FROM bands WHERE id = ?', [id]);

    res.json({ message: 'ลบวงดนตรีสำเร็จ' });
  } catch (err) {
    console.error('deleteBand error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

/* ------------------ จัดการสมาชิกในวง ------------------ */
router.post('/:id/members', requireAuth, requireAdminOrCommittee, async (req, res) => {
  const { id } = req.params;
  const { member_id, role_in_band } = req.body || {};
  if (!member_id) return res.status(400).json({ message: 'ต้องระบุ member_id' });

  try {
    const [[band]] = await pool.query('SELECT id FROM bands WHERE id = ?', [id]);
    if (!band) return res.status(404).json({ message: 'ไม่พบวง' });

    const [[mem]] = await pool.query('SELECT id FROM members WHERE id = ?', [member_id]);
    if (!mem) return res.status(404).json({ message: 'ไม่พบสมาชิก (member_id) นี้' });

    await pool.query(
      `INSERT INTO band_members (band_id, member_id, role_in_band)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE role_in_band = VALUES(role_in_band)`,
      [id, member_id, role_in_band || null]
    );

    res.status(201).json({ message: 'เพิ่ม/อัปเดตสมาชิกในวงสำเร็จ' });
  } catch (err) {
    console.error('add member to band error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

router.put('/:id/members', requireAuth, requireAdminOrCommittee, async (req, res) => {
  const { id } = req.params;
  const { members = [] } = req.body || {};

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [[band]] = await conn.query('SELECT id FROM bands WHERE id = ?', [id]);
    if (!band) {
      await conn.rollback();
      return res.status(404).json({ message: 'ไม่พบวง' });
    }

    await conn.query('DELETE FROM band_members WHERE band_id = ?', [id]);

    if (members.length > 0) {
      const ids = members.map(m => Number(m.member_id)).filter(Number.isInteger);
      if (ids.length !== members.length) {
        await conn.rollback();
        return res.status(400).json({ message: 'member_id ไม่ถูกต้อง' });
      }
      const [exists] = await conn.query(
        `SELECT id FROM members WHERE id IN (${ids.map(() => '?').join(',')})`,
        ids
      );
      if (exists.length !== ids.length) {
        await conn.rollback();
        return res.status(400).json({ message: 'มีบาง member_id ไม่พบในระบบ' });
      }
      for (const m of members) {
        await conn.query(
          'INSERT INTO band_members (band_id, member_id, role_in_band) VALUES (?, ?, ?)',
          [id, m.member_id, (m.role_in_band || null)]
        );
      }
    }

    await conn.commit();
    res.json({ message: 'อัปเดตรายชื่อสมาชิกของวงสำเร็จ' });
  } catch (err) {
    console.error('replace band members error:', err);
    try { await conn.rollback(); } catch {}
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  } finally {
    conn.release();
  }
});

router.delete('/:id/members/:memberId', requireAuth, requireAdminOrCommittee, async (req, res) => {
  const { id, memberId } = req.params;
  try {
    const [aff] = await pool.query(
      'DELETE FROM band_members WHERE band_id = ? AND member_id = ?',
      [id, memberId]
    );
    if (aff.affectedRows === 0) return res.status(404).json({ message: 'ไม่พบความสัมพันธ์วง–สมาชิก' });
    res.json({ message: 'นำสมาชิกออกจากวงแล้ว' });
  } catch (err) {
    console.error('remove member from band error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
});

module.exports = router;
