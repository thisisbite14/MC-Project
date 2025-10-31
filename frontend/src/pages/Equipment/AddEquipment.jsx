import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import API from "../../api";

const ENDPOINT = `${API.BASE}/api/equipments`;
const toast = (m) => window.alert(m);

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

export default function AddEquipment() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const editingId = sp.get("id");

  const [form, setForm] = useState({ name: "", code: "", status: "พร้อมใช้" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // ถ้าเป็นแก้ไข ดึงข้อมูลเดิม
  useEffect(() => {
    if (!editingId) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${ENDPOINT}/${editingId}`, authOpts());
        if (res.status === 401) return nav("/login", { replace: true });
        const j = await res.json();
        if (!res.ok) throw new Error(j.message || "");
        setForm({ name: j.equipment?.name || "", code: j.equipment?.code || "", status: j.equipment?.status || "" });
      } catch (e) {
        toast(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [editingId, nav]);

  const validate = () => {
    const e = {};
    if (!form.code.trim()) e.code = "กรุณากรอกรหัส";
    if (!form.name.trim()) e.name = "กรุณากรอกชื่ออุปกรณ์";
    if (!form.status.trim()) e.status = "กรุณาเลือกสถานะ";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `${ENDPOINT}/${editingId}` : ENDPOINT;

      const res = await fetch(url, authOpts({ method, body: JSON.stringify(form) }));
      if (res.status === 401) return nav("/login", { replace: true });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "บันทึกไม่สำเร็จ");

      toast(j.message || "สำเร็จ");
      nav("/equipments", { replace: true });
    } catch (e) {
      toast(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-amber-900">
        {editingId ? "แก้ไขอุปกรณ์" : "เพิ่มอุปกรณ์"}
      </h1>

      <form onSubmit={submit} className="space-y-5 rounded-2xl border border-amber-200 bg-white p-6 shadow">
        <div>
          <label className="mb-1 block text-sm font-medium">รหัส (code)</label>
          <input
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            className={`w-full rounded-xl border px-3 py-2 focus:outline-none ${
              errors.code ? "border-rose-500" : "border-amber-300 focus:border-amber-700"
            }`}
            placeholder="เช่น EQ-001"
          />
          {errors.code && <p className="mt-1 text-xs text-rose-600">{errors.code}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">ชื่ออุปกรณ์ (name)</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={`w-full rounded-xl border px-3 py-2 focus:outline-none ${
              errors.name ? "border-rose-500" : "border-amber-300 focus:border-amber-700"
            }`}
            placeholder="เช่น ไมโครโฟน Shure SM58"
          />
          {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">สถานะ (status)</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            className={`w-full rounded-xl border px-3 py-2 focus:outline-none ${
              errors.status ? "border-rose-500" : "border-amber-300 focus:border-amber-700"
            }`}
          >
            <option>พร้อมใช้</option>
            <option>ซ่อมบำรุง</option>
            <option>ชำรุด</option>
            <option>อื่น ๆ</option>
          </select>
          {errors.status && <p className="mt-1 text-xs text-rose-600">{errors.status}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => (editingId ? history.back() : nav("/equipments"))}
            className="rounded-xl border border-amber-300 px-4 py-2 hover:bg-amber-50"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-2 font-semibold text-white hover:opacity-90 shadow"
          >
            {loading ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "บันทึก"}
          </button>
        </div>
      </form>
    </div>
  );
}
