import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";

export default function AddSchedule() {
  const navigate = useNavigate();
  const [bands, setBands] = useState([]);
  const [bandId, setBandId] = useState("");
  const [activity, setActivity] = useState("ซ้อม");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // ดึงรายชื่อวงมาให้เลือก
        const res = await fetch(`${API.BASE}/api/bands/getAllBands`, API.withCreds);
        if (res.status === 401) return navigate("/login", { replace: true });
        const data = await res.json();
        setBands(Array.isArray(data?.bands) ? data.bands : []);
      } catch (e) {
        setErr("โหลดรายชื่อวงไม่สำเร็จ");
      }
    })();
  }, [navigate]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!bandId || !activity || !date || !time || !location) {
      return alert("กรอกข้อมูลให้ครบ");
    }
    try {
      setSubmitting(true);
      const res = await fetch(`${API.BASE}/api/schedules/add`, {   // ✅ ตรงกับ backend
        method: "POST",
        ...API.withCreds,
        body: JSON.stringify({
          band_id: bandId,
          activity,
          date,
          time,
          location,
        }),
      });
      if (res.status === 401) return navigate("/login", { replace: true });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "เพิ่มตารางไม่สำเร็จ");
      navigate("/schedules", { replace: true });
    } catch (e) {
      alert(e.message || "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">เพิ่มตาราง</h1>
          <button
            onClick={() => navigate("/schedules")}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            ← กลับ
          </button>
        </div>

        {err ? (
          <div className="text-rose-600">{err}</div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-6 rounded-2xl bg-white p-6 shadow">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">วง</label>
              <select
                value={bandId}
                onChange={(e) => setBandId(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— เลือกวง —</option>
                {bands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} • {b.year ?? "-"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทกิจกรรม</label>
              <select
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ซ้อม">ซ้อม</option>
                <option value="แสดง">แสดง</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันที่</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เวลา</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">สถานที่</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="เช่น ห้องซ้อม A"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                disabled={submitting}
                className={
                  "rounded-xl px-5 py-2 text-sm font-semibold text-white transition " +
                  (submitting ? "bg-gray-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500")
                }
              >
                {submitting ? "กำลังบันทึก..." : "บันทึก"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/schedules")}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
