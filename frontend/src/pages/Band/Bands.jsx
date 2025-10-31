// src/pages/bands/Bands.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../api";

/* ========== โมดัลเพิ่มวง (พร้อมเลือกสมาชิก) ========== */
function AddBandModal({ open, onClose, onCreated }) {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [form, setForm] = useState({ name: "", year: String(currentYear), description: "" });
  const [errors, setErrors] = useState({});
  const [serverMsg, setServerMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // สมาชิกทั้งหมดในชมรม
  const [allMembers, setAllMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [q, setQ] = useState("");

  // สมาชิกที่ถูกเลือกเข้าวง
  const [picked, setPicked] = useState([]);

  const reset = useCallback(() => {
    setForm({ name: "", year: String(currentYear), description: "" });
    setErrors({});
    setServerMsg("");
    setLoading(false);
    setAllMembers([]);
    setPicked([]);
    setQ("");
  }, [currentYear]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && open) onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // เปิดโมดัล -> โหลดสมาชิก
  useEffect(() => {
    if (!open) { reset(); return; }
    (async () => {
      try {
        setLoadingMembers(true);
        setServerMsg("");
        const res = await fetch(`${API.BASE}/api/members`, API.withCreds);
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.message || "โหลดรายชื่อสมาชิกไม่สำเร็จ");

        const list = Array.isArray(j.members) ? j.members : [];
        setAllMembers(
          list.map((m) => ({
            member_id: m.id,
            name: m.name || `${m.prefix || ""} ${m.first_name || ""} ${m.last_name || ""}`.trim(),
            user_role: m.role || m.user_role || "",
            status: m.status || "active",
          }))
        );
      } catch (e) {
        setServerMsg(e.message || "เกิดข้อผิดพลาดขณะดึงสมาชิก");
      } finally {
        setLoadingMembers(false);
      }
    })();
  }, [open, reset]);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "กรุณากรอกชื่อวง";
    if (form.year === "" || isNaN(Number(form.year))) {
      e.year = "กรุณากรอกปีที่จัดตั้งเป็นตัวเลข";
    } else {
      const y = Number(form.year);
      if (y < 1900 || y > currentYear + 10) e.year = `ปีที่จัดตั้งต้องอยู่ระหว่าง 1900 - ${currentYear + 10}`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const inputCls =
    "block w-full rounded-xl border border-amber-300 bg-white/80 px-4 py-2.5 text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "year" ? value.replace(/[^\d]/g, "") : value,
    }));
    if (serverMsg) setServerMsg("");
  };

  const filteredMembers = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return allMembers
      .filter((m) => m.status !== "inactive")
      .filter((m) => {
        if (!kw) return true;
        return (
          m.name.toLowerCase().includes(kw) ||
          (m.user_role || "").toLowerCase().includes(kw)
        );
      })
      .filter((m) => !picked.some((p) => p.member_id === m.member_id));
  }, [allMembers, picked, q]);

  const addMember = (m) => setPicked((prev) => [...prev, { ...m, role_in_band: "" }]);
  const removeMember = (member_id) =>
    setPicked((prev) => prev.filter((p) => p.member_id !== member_id));
  const changeRoleInBand = (member_id, text) =>
    setPicked((prev) =>
      prev.map((p) => (p.member_id === member_id ? { ...p, role_in_band: text } : p))
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerMsg("");
    try {
      const payload = {
        name: form.name.trim(),
        year: Number(form.year),
        description: form.description.trim() || null,
        members: picked.map((p) => ({
          member_id: p.member_id,
          role_in_band: (p.role_in_band || "").trim() || null,
        })),
      };

      const res = await fetch(`${API.BASE}/api/bands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "บันทึกไม่สำเร็จ");

      onCreated?.();
      onClose?.();
    } catch (err) {
      setServerMsg(err.message || "เกิดข้อผิดพลาดในระบบ");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl rounded-2xl bg-white/95 backdrop-blur shadow-2xl border border-amber-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-amber-100">
            <h3 className="text-lg font-semibold text-amber-900">เพิ่มวงดนตรี</h3>
            <button onClick={onClose} className="text-amber-700 hover:text-amber-900">✕</button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
            {/* ชื่อวง / ปี / คำอธิบาย */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-amber-800 mb-1">ชื่อวง</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className={inputCls}
                  placeholder="เช่น Jazz Club"
                />
                {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">ปีที่ก่อตั้ง</label>
                <input
                  name="year"
                  value={form.year}
                  onChange={handleChange}
                  className={inputCls}
                  inputMode="numeric"
                  placeholder={String(currentYear)}
                />
                {errors.year && <p className="mt-1 text-xs text-rose-600">{errors.year}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-amber-800 mb-1">คำอธิบาย</label>
              <textarea
                name="description"
                rows={3}
                value={form.description}
                onChange={handleChange}
                className={inputCls}
                placeholder="เล่าเกี่ยวกับแนวเพลง สมาชิก หรือกิจกรรมของวง"
              />
            </div>

            {/* เลือกสมาชิก */}
            <div className="grid md:grid-cols-2 gap-5">
              {/* ค้นหา & รายการให้เลือก */}
              <div className="rounded-xl border border-amber-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className={inputCls}
                    placeholder="ค้นหาชื่อหรือบทบาท (เช่น Vocal, Guitar)"
                  />
                </div>
                <div className="h-56 overflow-auto rounded-lg border border-amber-100">
                  {loadingMembers ? (
                    <div className="p-4 text-amber-700">กำลังโหลดสมาชิก...</div>
                  ) : filteredMembers.length === 0 ? (
                    <div className="p-4 text-amber-600">ไม่พบสมาชิกที่ตรงคำค้น</div>
                  ) : (
                    <ul className="divide-y divide-amber-100">
                      {filteredMembers.map((m) => (
                        <li key={m.member_id} className="flex items-center justify-between p-3">
                          <div>
                            <div className="font-medium text-amber-900">{m.name}</div>
                            <div className="text-xs text-amber-700">{m.user_role || "-"}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => addMember(m)}
                            className="rounded-lg bg-amber-700 text-white px-3 py-1.5 text-sm hover:bg-amber-800"
                          >
                            เพิ่ม
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* ที่เลือกแล้ว */}
              <div className="rounded-xl border border-amber-200 p-4">
                <div className="mb-3 font-medium text-amber-900">สมาชิกที่เลือกแล้ว ({picked.length})</div>
                <div className="h-56 overflow-auto rounded-lg border border-amber-100">
                  {picked.length === 0 ? (
                    <div className="p-4 text-amber-600">ยังไม่ได้เลือกสมาชิก</div>
                  ) : (
                    <ul className="divide-y divide-amber-100">
                      {picked.map((p) => (
                        <li key={p.member_id} className="p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium text-amber-900 truncate">{p.name}</div>
                              <div className="text-xs text-amber-700">{p.user_role || "-"}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeMember(p.member_id)}
                              className="rounded-lg bg-rose-600 text-white px-2 py-1 text-xs hover:bg-rose-700"
                            >
                              ลบ
                            </button>
                          </div>
                          <div className="mt-2">
                            <input
                              value={p.role_in_band || ""}
                              onChange={(e) => changeRoleInBand(p.member_id, e.target.value)}
                              className={inputCls}
                              placeholder="บทบาทในวง (เช่น Vocal, Guitar)"
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {serverMsg && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
                {serverMsg}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-amber-300 bg-white px-5 py-2.5 font-semibold text-amber-900 hover:bg-amber-50"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-2.5 font-semibold text-white shadow-lg hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ========== หน้าแสดงวง ========== */
export default function Bands() {
  const [bands, setBands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // auth state
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState("");

  const [openModal, setOpenModal] = useState(false);
  const navigate = useNavigate();

  /* --- ตรวจสอบการล็อกอินก่อน --- */
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API.BASE}/api/auth/me`, { credentials: "include" });
        const j = await r.json().catch(() => ({}));
        setIsLoggedIn(r.ok && !!j?.user);
        setRole(j?.user?.role || "");
      } catch {
        setIsLoggedIn(false);
        setRole("");
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  const loadBands = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API.BASE}/api/bands/getAllBands`, API.withCreds);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "โหลดข้อมูลวงไม่สำเร็จ");
      setBands(Array.isArray(data?.bands) ? data.bands : []);
    } catch (err) {
      setError(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) loadBands();
  }, [isLoggedIn, loadBands]);

  /* --- UI: ระหว่างเช็คสถานะ --- */
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F7F3EB" }}>
        <p className="text-amber-800">กำลังตรวจสอบสถานะผู้ใช้...</p>
      </div>
    );
  }

  /* --- UI: ถ้ายังไม่ล็อกอิน --- */
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4" style={{ backgroundColor: "#F7F3EB" }}>
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl p-10 border border-amber-200 max-w-md">
          <h2 className="text-2xl font-bold text-amber-900 mb-3">กรุณาเข้าสู่ระบบก่อนเข้าดูรายชื่อวง</h2>
          <p className="text-amber-700 mb-6">เฉพาะสมาชิกที่เข้าสู่ระบบเท่านั้นจึงจะดูและเพิ่มวงดนตรีได้</p>
          <button
            onClick={() => navigate("/login")}
            className="rounded-full bg-amber-700 text-white px-6 py-2 font-semibold hover:bg-amber-800 transition"
          >
            ไปหน้าล็อกอิน
          </button>
        </div>
      </div>
    );
  }

  const canManage = ["ผู้ดูแล", "กรรมการ"].includes(role);

  /* --- UI: ผู้ใช้ที่ล็อกอินแล้ว --- */
  return (
    <div className="min-h-screen py-10 px-6" style={{ backgroundColor: "#F7F3EB" }}>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center px-4 py-2 bg-white bg-opacity-60 rounded-full text-sm text-amber-800 mb-4 backdrop-blur-sm border border-amber-200">
            <span className="w-2 h-2 bg-amber-600 rounded-full mr-2"></span>
            รายชื่อวงดนตรี
          </div>
          <h1 className="text-4xl font-bold text-amber-900 mb-2">วงดนตรี Music Club</h1>
          <p className="text-lg text-amber-700">รวมวงดนตรีทุกแนวในชมรม</p>

          {canManage && (
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setOpenModal(true)}
                className="rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-3 text-sm font-medium text-white hover:opacity-90 transition-all shadow-lg flex items-center gap-2"
              >
                ➕ เพิ่มวงดนตรี
              </button>
            </div>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="p-6 text-center text-gray-500">กำลังโหลด...</div>
        ) : error ? (
          <div className="p-6 text-center text-red-500">{error}</div>
        ) : bands.length === 0 ? (
          <div className="text-center text-amber-600 text-lg">ยังไม่มีวงดนตรี</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {bands.map((b, i) => (
              <div
                key={b.id}
                className={`bg-white bg-opacity-80 backdrop-blur-sm rounded-2xl shadow-xl border border-amber-200 p-7 flex flex-col transition-all ${i % 2 === 0 ? 'bg-white bg-opacity-40' : 'bg-amber-50 bg-opacity-30'}`}
              >
                <h2 className="text-xl font-bold text-amber-900 mb-1 flex items-center gap-2">
                  <span>🎸</span> {b.name}
                </h2>
                <p className="text-sm text-amber-700 mb-2">
                  ก่อตั้ง: <span className="font-semibold text-amber-800">{b.year ?? "-"}</span>
                </p>
                <p className="text-sm text-amber-800 mb-4 line-clamp-3">
                  {b.description || "ไม่มีคำอธิบาย"}
                </p>

                <div className="mt-auto flex items-center justify-between text-xs text-amber-700">
                  <span>สร้างเมื่อ {b.created_at ? new Date(b.created_at).toLocaleDateString("th-TH") : "-"}</span>
                  <Link to={`/bands/${b.id}`} className="text-amber-800 hover:underline font-medium flex items-center gap-1">
                    <span>🔎</span> ดูรายละเอียด
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* โมดัล */}
      <AddBandModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onCreated={loadBands}
      />
    </div>
  );
}
