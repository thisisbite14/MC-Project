const express = require("express");
const pool = require("../db");
const { requireAuth, requireAdminOrCommittee } = require("../middleware/auth");

const router = express.Router();

/* ---------- Helpers ---------- */
const validActivity = ["ซ้อม", "แสดง"];
const checkExist = async (table, id) => {
  const [rows] = await pool.query(`SELECT id FROM ${table} WHERE id=?`, [id]);
  return rows.length > 0;
};
const conflictExists = async (date, time, location, excludeId = 0) => {
  const [rows] = await pool.query(
    `SELECT id FROM schedules WHERE date=? AND time=? AND location=? AND id!=?`,
    [date, time, location, excludeId]
  );
  return rows.length > 0;
};

/* ---------- Routes ---------- */
// GET: ตารางทั้งหมด + filter
router.get("/", requireAuth, async (req, res) => {
  try {
    const { band_id, activity, date_from, date_to } = req.query;
    let query = `
      SELECT s.*, b.name as band_name
      FROM schedules s
      JOIN bands b ON s.band_id=b.id
      WHERE 1=1`;
    const params = [];

    if (band_id) { query += " AND s.band_id=?"; params.push(band_id); }
    if (validActivity.includes(activity)) { query += " AND s.activity=?"; params.push(activity); }
    if (date_from) { query += " AND s.date>=?"; params.push(date_from); }
    if (date_to) { query += " AND s.date<=?"; params.push(date_to); }

    query += " ORDER BY s.date, s.time";

    const [rows] = await pool.query(query, params);
    res.json({ message: "ดึงข้อมูลสำเร็จ", schedules: rows, total: rows.length });
  } catch (err) { res.status(500).json({ message: "เกิดข้อผิดพลาด" }); }
});

// POST: เพิ่มตาราง
router.post("/add", requireAuth, requireAdminOrCommittee, async (req, res) => {
  const { band_id, activity, date, time, location } = req.body;
  if (!band_id || !activity || !date || !time || !location) return res.status(400).json({ message: "ข้อมูลไม่ครบ" });
  if (!validActivity.includes(activity)) return res.status(400).json({ message: "ประเภทกิจกรรมไม่ถูกต้อง" });

  try {
    if (!(await checkExist("bands", band_id))) return res.status(404).json({ message: "ไม่พบบุคคล/วง" });
    if (await conflictExists(date, time, location)) return res.status(400).json({ message: "สถานที่ถูกใช้แล้ว" });

    const [result] = await pool.query(
      "INSERT INTO schedules (band_id, activity, date, time, location) VALUES (?,?,?,?,?)",
      [band_id, activity, date, time, location]
    );
    const [newRow] = await pool.query(
      "SELECT s.*, b.name as band_name FROM schedules s JOIN bands b ON s.band_id=b.id WHERE s.id=?",
      [result.insertId]
    );
    res.status(201).json({ message: "เพิ่มสำเร็จ", schedule: newRow[0] });
  } catch (err) { res.status(500).json({ message: "เกิดข้อผิดพลาด" }); }
});

// GET by id
router.get("/get/:id", requireAuth, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT s.*, b.name as band_name FROM schedules s JOIN bands b ON s.band_id=b.id WHERE s.id=?",
    [req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ message: "ไม่พบตาราง" });
  res.json({ message: "ดึงข้อมูลสำเร็จ", schedule: rows[0] });
});

// PUT: update
router.put("/update/:id", requireAuth, requireAdminOrCommittee, async (req, res) => {
  const { band_id, activity, date, time, location } = req.body;
  const { id } = req.params;
  if (!band_id || !activity || !date || !time || !location) return res.status(400).json({ message: "ข้อมูลไม่ครบ" });
  if (!validActivity.includes(activity)) return res.status(400).json({ message: "ประเภทกิจกรรมไม่ถูกต้อง" });

  try {
    if (!(await checkExist("schedules", id))) return res.status(404).json({ message: "ไม่พบตาราง" });
    if (!(await checkExist("bands", band_id))) return res.status(404).json({ message: "ไม่พบวง" });
    if (await conflictExists(date, time, location, id)) return res.status(400).json({ message: "สถานที่ถูกใช้แล้ว" });

    await pool.query(
      "UPDATE schedules SET band_id=?, activity=?, date=?, time=?, location=? WHERE id=?",
      [band_id, activity, date, time, location, id]
    );
    const [updated] = await pool.query(
      "SELECT s.*, b.name as band_name FROM schedules s JOIN bands b ON s.band_id=b.id WHERE s.id=?",
      [id]
    );
    res.json({ message: "อัปเดตสำเร็จ", schedule: updated[0] });
  } catch (err) { res.status(500).json({ message: "เกิดข้อผิดพลาด" }); }
});

// DELETE
router.delete("/delete/:id", requireAuth, requireAdminOrCommittee, async (req, res) => {
  try {
    if (!(await checkExist("schedules", req.params.id))) return res.status(404).json({ message: "ไม่พบตาราง" });
    await pool.query("DELETE FROM schedules WHERE id=?", [req.params.id]);
    res.json({ message: "ลบสำเร็จ" });
  } catch (err) { res.status(500).json({ message: "เกิดข้อผิดพลาด" }); }
});

module.exports = router;
