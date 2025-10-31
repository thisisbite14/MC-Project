// routes/upload.js
const express = require('express');
const upload = require('../middleware/upload');
const fs = require('fs');
const path = require('path');

const { requireAuth } = require('../middleware/auth'); // ต้องมี middleware นี้

const router = express.Router();
const uploadDir = path.join(__dirname, '..', 'uploads');

// ===== helper: อนุญาตเฉพาะ ผู้ดูแล/กรรมการ =====
function requireStaff(req, res, next) {
  const role = req.user?.role || req.session?.role || '';
  if (role === 'ผู้ดูแล' || role === 'กรรมการ') return next();
  return res.status(403).json({ message: 'สำหรับผู้ดูแล/กรรมการเท่านั้น' });
}

// ensure upload dir
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// sanitize helpers
function sanitizeBaseName(name = '') {
  const s = String(name)
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '-') // ตัดอักขระอันตราย
    .replace(/\s+/g, ' ')
    .replace(/[.]+$/g, '');
  return s || '';
}

function ensureUniqueFilename(dir, base, ext) {
  let filename = `${base}${ext}`;
  let i = 1;
  while (fs.existsSync(path.join(dir, filename))) {
    filename = `${base}-${i}${ext}`;
    i += 1;
  }
  return filename;
}

const handler = (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    try {
      const origExt = path.extname(req.file.originalname || '') || '';
      const ext = origExt.toLowerCase();

      // ถ้า front ส่งชื่อเอกสารมา จะเปลี่ยนชื่อไฟล์ให้
      const rawName = (req.body && req.body.name) ? String(req.body.name) : '';
      const safeBase = sanitizeBaseName(rawName);

      let finalFilename = req.file.filename;
      if (safeBase) {
        const baseOnly = path.basename(safeBase);
        const unique = ensureUniqueFilename(uploadDir, baseOnly, ext);
        const oldPath = path.join(uploadDir, req.file.filename);
        const newPath = path.join(uploadDir, unique);
        fs.renameSync(oldPath, newPath);
        finalFilename = unique;
      }

      const abs = path.join(uploadDir, finalFilename);
      const st = fs.statSync(abs);
      const url = `${req.protocol}://${req.get('host')}/uploads/${finalFilename}`;

      res.json({
        message: 'Upload success',
        filename: finalFilename,
        path: `/uploads/${finalFilename}`,
        url,
        mimetype: req.file.mimetype,
        size: st.size,
      });
    } catch (e) {
      console.error('Upload processing failed:', e);
      res.status(500).json({ message: 'Upload processing failed' });
    }
  });
};

// ===== Routes =====

// อัปโหลด: ต้องล็อกอิน + เป็นผู้ดูแลหรือกรรมการ
router.post('/upload', requireAuth, requireStaff, handler);
router.post('/', requireAuth, requireStaff, handler);

// ดูรายการ: ต้องล็อกอิน (ทุกบทบาทดูได้)
router.get('/list', requireAuth, (req, res) => {
  try {
    const files = fs
      .readdirSync(uploadDir)
      .filter((n) => !n.startsWith('.'))
      .map((n) => {
        const p = path.join(uploadDir, n);
        const st = fs.statSync(p);
        const ext = path.extname(n).toLowerCase();
        const isPdf = ext === '.pdf';
        return {
          filename: n,
          url: `${req.protocol}://${req.get('host')}/uploads/${n}`,
          size: st.size,
          type: isPdf ? 'application/pdf' : `image/${ext.slice(1) || 'octet-stream'}`,
          mtime: st.mtimeMs,
        };
      })
      .sort((a, b) => b.mtime - a.mtime);
    res.json({ files });
  } catch (e) {
    console.error('List files failed:', e);
    res.status(500).json({ message: 'List files failed' });
  }
});

// ลบไฟล์: ต้องล็อกอิน + เป็นผู้ดูแลหรือกรรมการ
router.delete('/:filename', requireAuth, requireStaff, (req, res) => {
  try {
    const raw = decodeURIComponent(req.params.filename || '');
    const safe = path.basename(raw);                 // กัน path traversal
    const target = path.join(uploadDir, safe);

    if (!safe) return res.status(400).json({ message: 'Invalid filename' });
    if (!target.startsWith(uploadDir)) {
      return res.status(400).json({ message: 'Invalid path' });
    }
    if (!fs.existsSync(target)) {
      return res.status(404).json({ message: 'File not found' });
    }

    fs.unlinkSync(target);
    res.json({ message: 'Delete success', filename: safe });
  } catch (e) {
    console.error('Delete file failed:', e);
    res.status(500).json({ message: 'Delete file failed' });
  }
});

module.exports = router;
