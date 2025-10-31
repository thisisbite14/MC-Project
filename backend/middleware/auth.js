// middleware/auth.js
const pool = require('../db');

/** อ่าน userId จาก session (รองรับทั้งรูปแบบเก่า/ใหม่) */
function getSessionUserId(req) {
  return req.session?.user?.id || req.session?.userId || null;
}

/** โหลด role จาก DB ด้วยคอลัมน์ id เท่านั้น */
async function fetchUserRoleById(userId) {
  const [rows] = await pool.query(
    'SELECT id, prefix, first_name, last_name, email, role FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  return rows?.[0] || null; // คืนทั้ง row (หรือ null)
}

/** ต้องล็อกอินก่อน — และเติม req.user (id + role + ชื่อ) */
async function requireAuth(req, res, next) {
  try {
    const uid = getSessionUserId(req);
    if (!uid) return res.status(401).json({ message: 'ยังไม่ได้เข้าสู่ระบบ' });

    // ถ้า session มี user อยู่แล้ว ให้ใช้ (และเติม req.user)
    if (req.session?.user && req.session.user.id === uid) {
      req.user = req.session.user;
      return next();
    }

    // ถ้ายังไม่มีข้อมูล role/name ใน session -> ดึงจาก DB
    const userRow = await fetchUserRoleById(uid);
    if (!userRow) {
      // ถ้าไม่เจอ user ให้ลบ session ที่ไม่ถูกต้อง
      req.session.user = null;
      req.session.userId = null;
      return res.status(401).json({ message: 'ยังไม่ได้เข้าสู่ระบบ' });
    }

    // สร้าง object user ที่เราจะใช้ใน req
    const user = {
      id: userRow.id,
      role: userRow.role || '',
      prefix: userRow.prefix || '',
      first_name: userRow.first_name || '',
      last_name: userRow.last_name || '',
      email: userRow.email || '',
    };

    // cache กลับ session เพื่อใช้ต่อ (ลด query ครั้งถัดไป)
    req.session.user = user;
    req.session.userId = user.id;

    req.user = user;
    return next();
  } catch (err) {
    console.error('requireAuth error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
  }
}

/** ตัวตรวจ role แบบกำหนดได้ */
function requireRole(allowed = []) {
  return async (req, res, next) => {
    try {
      // first ensure logged in and req.user filled
      await requireAuth(req, res, async () => {
        const role = (req.user?.role || '').trim();
        if (!role) return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
        if (allowed.length && !allowed.includes(role)) {
          return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
        }
        return next();
      });
    } catch (err) {
      console.error('requireRole error:', err);
      return res.status(500).json({ message: 'เกิดข้อผิดพลาดในระบบ' });
    }
  };
}

const requireAdmin = requireRole(['ผู้ดูแล']);
const requireAdminOrCommittee = requireRole(['ผู้ดูแล', 'กรรมการ']);

module.exports = { requireAuth, requireAdmin, requireAdminOrCommittee };
