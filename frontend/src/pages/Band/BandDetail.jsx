// src/pages/BandDetail.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API from "../../api";

function dtTH(date, time) {
  try {
    const d = new Date(`${date}T${(time || "00:00")}:00`);
    return d.toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return `${date || "-"} ${time || ""}`;
  }
}

export default function BandDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [band, setBand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const me = (() => {
    try {
      const s = localStorage.getItem("mc_user");
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  })();

  const canManage = ["ผู้ดูแล", "กรรมการ"].includes(me?.role);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const res = await fetch(
          `${API.BASE}/api/bands/getBand/${id}`,
          API.withCreds
        );

        if (res.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.message || "โหลดข้อมูลวงไม่สำเร็จ");
        }
        const data = await res.json();
        if (!alive) return;
        setBand(data?.band || null);
      } catch (e) {
        if (!alive) return;
        setErr(e.message || "เกิดข้อผิดพลาด");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id, navigate]);

  async function onDelete() {
    if (!canManage) return;
    if (!confirm("ยืนยันลบวงนี้? (จะลบได้เมื่อไม่มีตารางซ้อม/แสดงค้างอยู่)")) return;
    try {
      const res = await fetch(`${API.BASE}/api/bands/deleteBand/${id}`, {
        method: "DELETE",
        ...API.withCreds,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "ลบไม่สำเร็จ");
      }
      navigate("/bands", { replace: true });
    } catch (e) {
      alert(e.message || "เกิดข้อผิดพลาด");
    }
  }

  async function removeMember(memberId) {
    if (!canManage) return;
    if (!confirm("เอาสมาชิกคนนี้ออกจากวง?")) return;
    try {
      const res = await fetch(
        `${API.BASE}/api/bands/${band.id}/members/${memberId}`,
        { method: "DELETE", ...API.withCreds }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || "ลบสมาชิกไม่สำเร็จ");
      }
      // อัปเดตรายชื่อใน state
      setBand((b) => ({
        ...b,
        members: (b.members || []).filter(
          (m) => Number(m.member_id) !== Number(memberId)
        ),
      }));
    } catch (e) {
      alert(e.message || "เกิดข้อผิดพลาด");
    }
  }

  if (loading)
    return <div className="p-6 text-center text-gray-500">กำลังโหลด...</div>;
  if (err) return <div className="p-6 text-center text-rose-600">{err}</div>;
  if (!band)
    return <div className="p-6 text-center text-gray-500">ไม่พบข้อมูล</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{band.name}</h1>
            <p className="text-gray-600">
              ก่อตั้ง: {band.year ?? "-"} • สร้างเมื่อ{" "}
              {band.created_at
                ? new Date(band.created_at).toLocaleDateString("th-TH")
                : "-"}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/bands"
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              ← กลับหน้ารายการ
            </Link>
            {canManage && (
              <>
                <Link
                  to={`/bands/${band.id}/edit`}
                  className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-800"
                >
                  แก้ไข
                </Link>
                <button
                  onClick={onDelete}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-700"
                >
                  ลบ
                </button>
              </>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="mb-8 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">คำอธิบาย</h2>
          <p className="text-gray-700">{band.description || "ไม่มีคำอธิบาย"}</p>
        </div>

        {/* Members */}
        <div className="mb-8 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            สมาชิกในวง
          </h2>

          {band.members?.length ? (
            <ul className="divide-y divide-gray-100">
              {band.members.map((m) => (
                <li
                  key={m.member_id}
                  className="py-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-gray-900">{m.name}</div>
                    <div className="text-sm text-gray-600">
                      บทบาทในชมรม: {m.user_role || "-"} • สถานะสมาชิก:{" "}
                      {m.member_status || "-"}
                      {m.role_in_band ? ` • ตำแหน่งในวง: ${m.role_in_band}` : ""}
                    </div>
                  </div>
                  {canManage && (
                    <button
                      onClick={() => removeMember(m.member_id)}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-700"
                    >
                      เอาออก
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-500">ยังไม่มีสมาชิกในวง</div>
          )}
        </div>

        {/* Schedules */}
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            ตารางซ้อม / แสดง
          </h2>
          {band.schedules?.length ? (
            <ul className="divide-y divide-gray-100">
              {band.schedules.map((s) => (
                <li
                  key={s.id}
                  className="py-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-gray-900">{s.activity}</div>
                    <div className="text-sm text-gray-600">
                      {dtTH(s.date, s.time)} • {s.location || "-"}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-500">ยังไม่มีตาราง</div>
          )}
        </div>
      </div>
    </div>
  );
}
