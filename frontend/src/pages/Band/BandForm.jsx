// src/pages/BandForm.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import API from "../../api";

const bg = { backgroundColor: "#F7F3EB" };
const canEditRoles = new Set(["ผู้ดูแล", "กรรมการ"]);

export default function BandForm({ mode = "create" }) {
  const navigate = useNavigate();
  const { id } = useParams();

  const [me, setMe] = useState(() => {
    try { return JSON.parse(localStorage.getItem("mc_user") || "null"); }
    catch { return null; }
  });
  const canUse = useMemo(() => canEditRoles.has((me?.role || "").trim()), [me]);

  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(mode === "edit");
  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // โหลด me สดจากเซสชัน (กันเคส localStorage ไม่ตรง)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API.BASE}/api/auth/me`, API.withCreds);
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.user) {
          setMe(data.user);
          localStorage.setItem("mc_user", JSON.stringify(data.user));
        }
      } catch {/* เงียบไว้ ใช้ค่าเดิมจาก localStorage */}
    })();
  }, []);

  // ถ้าไม่มีสิทธิ์ให้เด้งกลับ
  useEffect(() => {
    if (me && !canUse) navigate("/bands", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, canUse]);

  // โหลดข้อมูลตอนแก้ไข
  useEffect(() => {
    if (mode !== "edit" || !id) return;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        // ลองรูปแบบใหม่ก่อน
        let res = await fetch(`${API.BASE}/api/bands/${id}`, API.withCreds);
        if (res.status === 404) {
          // เผื่อแบ็คเอนด์ใช้เส้นทางเดิม
          res = await fetch(`${API.BASE}/api/bands/getBand/${id}`, API.withCreds);
        }
        if (res.status === 401) return navigate("/login", { replace: true });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || "โหลดข้อมูลวงไม่สำเร็จ");

        const band = data?.band || data; // เผื่อรูปแบบ payload ต่างกัน
        setName(band?.name || "");
        setYear(band?.year ? String(band.year) : "");
        setDesc(band?.description || "");
      } catch (e) {
        setErr(e.message || "เกิดข้อผิดพลาด");
      } finally {
        setLoading(false);
      }
    })();
  }, [mode, id, navigate]);

  function validate() {
    const n = (name || "").trim();
    const y = Number(year);
    if (!n) return "กรุณากรอกชื่อวงดนตรี";
    if (!y || Number.isNaN(y)) return "กรุณากรอกปีที่ก่อตั้ง";
    if (y < 1900 || y > 2100) return "ปีที่ก่อตั้งควรอยู่ระหว่าง 1900–2100";
    return "";
  }

  async function onSubmit(e) {
    e.preventDefault();
    const v = validate();
    if (v) { setErr(v); return; }

    try {
      setSubmitting(true);
      setErr("");

      const payload = {
        name: name.trim(),
        year: Number(year),
        description: (desc || "").trim(),
      };

      let res;
      if (mode === "create") {
        res = await fetch(`${API.BASE}/api/bands`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(API.withCreds?.headers || {}),
          },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API.BASE}/api/bands/updateBand/${id}`, {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...(API.withCreds?.headers || {}),
          },
          body: JSON.stringify(payload),
        });
      }

      if (res.status === 401) return navigate("/login", { replace: true });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "บันทึกไม่สำเร็จ");

      navigate("/bands", { replace: true });
    } catch (e) {
      setErr(e.message || "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  if (!me) return null; // รอ me สักครู่
  if (!canUse) return null;
  if (loading) return <div className="p-6 text-center text-amber-800">กำลังโหลด...</div>;

  return (
    <div className="min-h-screen py-10 px-6" style={bg}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-amber-900">
              {mode === "create" ? "เพิ่มวงดนตรี" : "แก้ไขวงดนตรี"}
            </h1>
            <p className="text-sm text-amber-700">กรอกข้อมูลแล้วกดบันทึก</p>
          </div>
          <button
            onClick={() => navigate("/bands")}
            className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm text-amber-900 hover:bg-amber-50"
          >
            ← กลับ
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 rounded-2xl bg-white/95 backdrop-blur border border-amber-200 p-6 shadow">
          <div>
            <label className="block text-sm font-medium text-amber-900 mb-1">ชื่อวง</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-amber-300 px-4 py-2 outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="เช่น Jazz Club"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-amber-900 mb-1">ปีที่ก่อตั้ง</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full rounded-xl border border-amber-300 px-4 py-2 outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="2025"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-amber-900 mb-1">คำอธิบาย</label>
            <textarea
              rows={4}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full rounded-xl border border-amber-300 px-4 py-2 outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="เล่าเกี่ยวกับแนวเพลง สมาชิก หรือกิจกรรมของวง"
            />
          </div>

          {err && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-rose-700">
              {err}
            </div>
          )}

          <button
            disabled={submitting}
            className={
              "rounded-xl px-5 py-2 text-sm font-semibold text-white transition shadow-lg " +
              (submitting
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-gradient-to-r from-amber-600 to-orange-600 hover:opacity-90")
            }
          >
            {submitting ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </form>
      </div>
    </div>
  );
}
