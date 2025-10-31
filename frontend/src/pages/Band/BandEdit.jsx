// src/pages/bands/BandEdit.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import API from "../../api";

export default function BandEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  // session (ดูบทบาท)
  const me = (() => {
    try {
      const s = localStorage.getItem("mc_user");
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  })();
  const canManage = ["ผู้ดูแล", "กรรมการ"].includes(me?.role);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ name: "", year: "", description: "" });

  useEffect(() => {
    // ถ้าไม่มีสิทธิ์ กลับหน้ารายละเอียดวง
    if (!canManage) {
      navigate(`/bands/${id}`, { replace: true });
      return;
    }
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch(`${API.BASE}/api/bands/getBand/${id}`, API.withCreds);
        if (res.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "โหลดข้อมูลไม่สำเร็จ");
        const data = await res.json();
        const b = data.band || {};
        setForm({
          name: b.name || "",
          year: String(b.year || new Date().getFullYear()),
          description: b.description || "",
        });
      } catch (e) {
        setErr(e.message || "เกิดข้อผิดพลาด");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, canManage, navigate]);

  async function onSubmit(e) {
    e.preventDefault();
    try {
      const payload = {
        name: form.name.trim(),
        year: Number(form.year),
        description: form.description.trim() || null,
      };
      const res = await fetch(`${API.BASE}/api/bands/updateBand/${id}`, {
        method: "PUT",
        ...API.withCreds,
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "บันทึกไม่สำเร็จ");
      navigate(`/bands/${id}`, { replace: true });
    } catch (e) {
      setErr(e.message || "เกิดข้อผิดพลาด");
    }
  }

  if (!canManage) return null;
  if (loading) return <div className="p-6 text-center text-gray-500">กำลังโหลด...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">แก้ไขวง</h1>
          <Link to={`/bands/${id}`} className="rounded-lg border px-3 py-1.5 text-sm bg-white hover:bg-gray-50">
            ← กลับรายละเอียด
          </Link>
        </div>

        {err && <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-rose-700">{err}</div>}

        <form onSubmit={onSubmit} className="rounded-2xl bg-white p-6 shadow space-y-4">
          <div>
            <label className="block text-sm mb-1">ชื่อวง</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-xl border px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">ปีที่จัดตั้ง</label>
            <input
              type="number"
              value={form.year}
              onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
              className="w-full rounded-xl border px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">คำอธิบาย</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full rounded-xl border px-3 py-2"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Link to={`/bands/${id}`} className="rounded-lg border px-4 py-2 bg-white hover:bg-gray-50">
              ยกเลิก
            </Link>
            <button type="submit" className="rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-gray-800">
              บันทึก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
