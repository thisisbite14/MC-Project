// src/pages/Equipment/Equipments.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import API from "../../api";

/* ---------- const / helpers ---------- */
const ENDPOINT = `${API.BASE}/api/equipments`;
const toast = (m) => window.alert(m);
const bg = { backgroundColor: "#F7F3EB" };

function authOpts(extra = {}) {
  const token = localStorage.getItem("mc_token");
  const base = API.withCreds || {};
  return {
    ...base,
    ...extra,
    headers: {
      "Content-Type": "application/json",
      ...(base.headers || {}),
      ...(extra.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
}

// แสดง badge สถานะ
function statusBadge(s = "") {
  const t = String(s);
  const cls =
    t.includes("พร้อม")
      ? "border-emerald-200 bg-emerald-100 text-emerald-700"
      : t.includes("ซ่อม")
      ? "border-amber-200 bg-amber-100 text-amber-700"
      : "border-gray-200 bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${cls}`}>
      {t || "-"}
    </span>
  );
}

/* ===================== Modal: Add/Edit Equipment ===================== */
function EquipmentModal({ open, onClose, onSaved, editing }) {
  const isEdit = !!editing?.id;
  const [form, setForm] = useState({ code: "", name: "", status: "พร้อมใช้" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverMsg, setServerMsg] = useState("");

  const reset = useCallback(() => {
    setForm({ code: "", name: "", status: "พร้อมใช้" });
    setErrors({});
    setServerMsg("");
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    if (isEdit) {
      setForm({
        code: editing.code || "",
        name: editing.name || "",
        status: editing.status || "พร้อมใช้",
      });
    } else {
      reset();
    }
  }, [open, isEdit, editing, reset]);

  // ปิดด้วย ESC
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && open) onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const validate = () => {
    const e = {};
    if (!form.code.trim()) e.code = "กรุณากรอกรหัส";
    if (!form.name.trim()) e.name = "กรุณากรอกชื่ออุปกรณ์";
    if (!form.status.trim()) e.status = "กรุณาเลือกสถานะ";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      setServerMsg("");
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit ? `${ENDPOINT}/${editing.id}` : ENDPOINT;

      const res = await fetch(url, authOpts({ method, body: JSON.stringify(form) }));
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.message || "บันทึกไม่สำเร็จ");

      onSaved?.();   // ให้หน้า list รีโหลด
      onClose?.();   // ปิดโมดัล
    } catch (err) {
      setServerMsg(err.message || "เกิดข้อผิดพลาดในระบบ");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const inputCls =
    "block w-full rounded-xl border border-amber-300 bg-white/80 px-4 py-2.5 text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500";

  return (
    <div className="fixed inset-0 z-[60]">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-2xl bg-white/95 backdrop-blur shadow-2xl border border-amber-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-amber-100">
            <h3 className="text-lg font-semibold text-amber-900">{isEdit ? "แก้ไขอุปกรณ์" : "เพิ่มรายการ"}</h3>
            <button onClick={onClose} className="text-amber-700 hover:text-amber-900">✕</button>
          </div>

          <form onSubmit={submit} className="px-6 py-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block font-medium text-amber-900">รหัส (code) <span className="text-red-600">*</span></label>
                <input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  className={inputCls}
                  placeholder="เช่น EQ-001"
                />
                {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
              </div>
              <div>
                <label className="mb-2 block font-medium text-amber-900">สถานะ (status) <span className="text-red-600">*</span></label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className={inputCls}
                >
                  <option>พร้อมใช้</option>
                  <option>ซ่อมบำรุง</option>
                  <option>ชำรุด</option>
                  <option>อื่น ๆ</option>
                </select>
                {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status}</p>}
              </div>
            </div>

            <div>
              <label className="mb-2 block font-medium text-amber-900">ชื่ออุปกรณ์ (name) <span className="text-red-600">*</span></label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputCls}
                placeholder="เช่น ไมโครโฟน Shure SM58"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            {serverMsg && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-center">
                {serverMsg}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-amber-300 bg-white px-5 py-2.5 font-semibold text-amber-900 hover:bg-amber-50 shadow"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-2.5 font-semibold text-white shadow-lg hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "กำลังบันทึก..." : isEdit ? "บันทึกการแก้ไข" : "เพิ่มรายการ"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ===================== Page: Equipments ===================== */
export default function Equipments() {
  // session
  const [me] = useState(() => {
    const s = localStorage.getItem("mc_user");
    return s ? JSON.parse(s) : null;
  });
  const canWrite = ["ผู้ดูแล", "กรรมการ"].includes(me?.role);

  // ui states
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  // filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all"); // all | พร้อม | ซ่อม | ไม่พร้อมใช้งาน

  // modal
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);

  /* ---------- guards ---------- */
  async function guard401(res) {
    if (res.status === 401) {
      setErr("กรุณากรอกเข้าสู่ระบบก่อน");
      setRows([]);
      // อย่าพาออกจากหน้า: ให้ผู้ใช้เห็นข้อความก่อน
      return true;
    }
    return false;
  }

  /* ---------- loader ---------- */
const load = useCallback(async () => {
  try {
    setLoading(true);
    setErr("");
    setMsg(""); // เคลียร์ข้อความเก่าได้ ปล่อยไว้ได้
    const res = await fetch(ENDPOINT, authOpts());
    if (await guard401(res)) return;
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.message || "");
    setRows(Array.isArray(j.equipments) ? j.equipments : []);
    // ❌ อย่า setMsg ตอนโหลดข้อมูล
  } catch (e) {
    setErr(e.message || "");
  } finally {
    setLoading(false);
  }
}, []);


  useEffect(() => { load(); }, [load]);

  /* ---------- filtered ---------- */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const passQ =
        !q ||
        String(r.name || "").toLowerCase().includes(q) ||
        String(r.code || "").toLowerCase().includes(q) ||
        String(r.status || "").toLowerCase().includes(q) ||
        String(r.id || "").includes(q);
      const passStatus = status === "all" || String(r.status || "").includes(status);
      return passQ && passStatus;
    });
  }, [rows, search, status]);

  /* ---------- actions ---------- */
  async function onDelete(id) {
    if (!canWrite) return;
    if (!window.confirm("ยืนยันการลบอุปกรณ์นี้?")) return;
    try {
      setLoading(true);
      setErr("");
      setMsg("");
      const res = await fetch(`${ENDPOINT}/${id}`, authOpts({ method: "DELETE" }));
      if (await guard401(res)) return;
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.message || "ลบไม่สำเร็จ");
      setRows((prev) => prev.filter((r) => r.id !== id));
      setMsg(j.message || "ลบสำเร็จ");
    } catch (e) {
      setErr(e.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  const openAdd = () => { setEditing(null); setOpenModal(true); };
  const openEdit = (row) => { setEditing(row); setOpenModal(true); };

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen py-10 px-6" style={bg}>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center px-4 py-2 bg-white bg-opacity-60 rounded-full text-sm text-amber-800 mb-4 backdrop-blur-sm border border-amber-200">
              <span className="w-2 h-2 bg-amber-600 rounded-full mr-2"></span>
              อุปกรณ์ (Equipments)
            </div>
            <h1 className="text-4xl font-bold text-amber-900 mb-2">คลังอุปกรณ์ชมรม</h1>
            <p className="text-lg text-amber-700">ค้นหา/จัดการสถานะอุปกรณ์ และเพิ่มรายการใหม่</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white bg-opacity-60 backdrop-blur-sm rounded-2xl p-6 border border-amber-200">
            <div className="flex flex-wrap gap-3 w-full lg:w-auto">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหา: ชื่อ / รหัส / สถานะ / ID"
                className="flex-1 min-w-[240px] rounded-xl border border-amber-200 bg-white bg-opacity-80 px-4 py-3 text-sm text-amber-900 placeholder-amber-600 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="rounded-xl border border-amber-200 bg-white bg-opacity-80 px-4 py-3 text-sm text-amber-900 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                title="กรองตามสถานะ"
              >
                <option value="all">สถานะทั้งหมด</option>
                <option value="พร้อม">พร้อมใช้งาน</option>
                <option value="ซ่อม">กำลังซ่อม</option>
                <option value="ไม่พร้อม">ไม่พร้อมใช้งาน</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={load}
                className="rounded-xl bg-amber-800 px-6 py-3 text-sm font-medium text-white hover:bg-amber-900 transition-colors shadow-lg"
              >
                🔄 รีเฟรช
              </button>
              {canWrite && (
                <button
                  onClick={openAdd}
                  className="rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-3 text-sm font-semibold text-white hover:opacity-90 shadow-lg"
                >
                  ➕ เพิ่มอุปกรณ์
                </button>
              )}
            </div>
          </div>
        </div>

        {/* alerts */}
        {err && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-rose-100 text-rose-700 rounded-xl border border-rose-200">
            ⚠️ {err}
          </div>
        )}
        {msg && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
            ✅ {msg}
          </div>
        )}

        {/* table */}
        <div className="overflow-hidden rounded-2xl bg-white bg-opacity-80 backdrop-blur-sm shadow-xl border border-amber-200">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-amber-100 bg-opacity-60 text-amber-800">
                <tr className="text-left text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">รหัส</th>
                  <th className="px-6 py-4">ชื่ออุปกรณ์</th>
                  <th className="px-6 py-4">สถานะ</th>
                  {canWrite && <th className="px-6 py-4 text-right">การทำงาน</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={canWrite ? 5 : 4} className="px-6 py-10 text-center text-amber-700">
                      กำลังโหลด...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={canWrite ? 5 : 4} className="px-6 py-10 text-center text-amber-700">
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                ) : (
                  filtered.map((r, i) => (
                    <tr
                      key={r.id}
                      className={`text-amber-900 ${i % 2 === 0 ? "bg-white/50" : "bg-amber-50/40"}`}
                    >
                      <td className="px-6 py-3 whitespace-nowrap">{r.id}</td>
                      <td className="px-6 py-3">{r.code || "-"}</td>
                      <td className="px-6 py-3">{r.name || "-"}</td>
                      <td className="px-6 py-3">{statusBadge(r.status)}</td>
                      {canWrite && (
                        <td className="px-6 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEdit(r)}
                              className="rounded-lg border border-amber-300 bg-white/80 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50"
                              title="แก้ไข"
                            >
                              ✏️ แก้ไข
                            </button>
                            <button
                              onClick={() => onDelete(r.id)}
                              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
                            >
                              🗑️ ลบ
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* footer small tip */}
        <div className="mt-4 text-xs text-amber-700/80">
          เคล็ดลับ: พิมพ์คำว่า “พร้อม/ซ่อม/ไม่พร้อม” ในช่องค้นหาเพื่อกรองอย่างรวดเร็ว
        </div>
      </div>

      {/* โมดัลเพิ่ม/แก้ไข */}
      <EquipmentModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onSaved={load}
        editing={editing}
      />
    </div>
  );
}
