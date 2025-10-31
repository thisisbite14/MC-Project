// routes/site.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireAdmin } = require('../middleware/auth'); // ✅ ใช้ตัวตรวจสิทธิ์จริง

const router = express.Router();
const DATA_DIR = path.join(__dirname, '..', 'data');
const HOME_JSON = path.join(DATA_DIR, 'home.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

/** อ่านไฟล์ */
function readHomeRaw() {
  try {
    if (!fs.existsSync(HOME_JSON)) return {};
    const raw = fs.readFileSync(HOME_JSON, 'utf8');
    return JSON.parse(raw || '{}');
  } catch {
    return {};
  }
}

/** map สคีม่าเก่า -> ใหม่ (ถ้าไฟล์เป็นแบบเก่า) */
function migrateOldToNew(obj = {}) {
  // ถ้าเป็นสคีม่าใหม่อยู่แล้ว ก็คืนเลย
  if (obj.siteName || obj.heroDesc || obj.heroHighlight || obj.liveBadge) return obj;

  const mapped = { ...obj };

  // map คีย์เก่าที่พอ suy’ได้
  if (obj.heroTitle && !mapped.siteName) mapped.siteName = obj.heroTitle; // ชื่อชมรม
  if (obj.heroSubtitle && !mapped.heroDesc) mapped.heroDesc = obj.heroSubtitle; // คำโปรยยาว
  if (obj.heroImage && !mapped.heroImage) mapped.heroImage = obj.heroImage;

  // เติมค่าเริ่มต้นบ้าง (กัน UI ว่าง)
  mapped.liveBadge      = mapped.liveBadge      ?? "Now Live: Music Club Kukps";
  mapped.heroHighlight  = mapped.heroHighlight  ?? "Kukps";
  mapped.ctaPrimary     = mapped.ctaPrimary     ?? "เริ่มต้นกับเรา";
  mapped.ctaSecondary   = mapped.ctaSecondary   ?? "เรียนรู้เพิ่มเติม →";
  mapped.section1Title  = mapped.section1Title  ?? "ยกระดับ\nความสามารถ\nทางดนตรี";
  mapped.section1Desc   = mapped.section1Desc   ?? (mapped.about || "");
  mapped.section2Title  = mapped.section2Title  ?? "กิจกรรม\nที่หลากหลาย\nและสร้างสรรค์";
  mapped.section2Desc   = mapped.section2Desc   ?? "";
  mapped.announcements  = Array.isArray(mapped.announcements) ? mapped.announcements : [];
  mapped.links          = Array.isArray(mapped.links) ? mapped.links : [];

  return mapped;
}

/** อ่านพร้อม migrate */
function readHome() {
  const raw = readHomeRaw();
  return migrateOldToNew(raw);
}

/** เขียนแบบ atomic */
function writeHome(obj) {
  const tmp = HOME_JSON + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  fs.renameSync(tmp, HOME_JSON);
}

/** GET: ส่ง home (รองรับไฟล์เก่าด้วย) */
router.get('/home', (req, res) => {
  const home = readHome();
  res.json({ home });
});

/** PUT: ต้องเป็นผู้ดูแลเท่านั้น และ merge กับข้อมูลเดิมก่อนเขียน */
router.put('/home', requireAdmin, (req, res) => {
  try {
    const incoming = req.body || {};
    const current  = readHome();          // ✅ อ่าน (พร้อม migrate)
    const next     = { ...current, ...incoming };

    writeHome(next);
    res.json({ message: 'saved', home: next });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Save failed' });
  }
});

module.exports = router;
