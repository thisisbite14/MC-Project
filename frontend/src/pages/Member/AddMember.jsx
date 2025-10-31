import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";

function todayStr() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function AddMember() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [userId, setUserId] = useState("");
  const [joinDate, setJoinDate] = useState(todayStr());
  const [status, setStatus] = useState("active");
  const [q, setQ] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [me] = useState(() => {
    const s = localStorage.getItem("mc_user");
    return s ? JSON.parse(s) : null;
  });

  const canUse = ["ผู้ดูแล", "กรรมการ"].includes(me?.role);

  useEffect(() => {
    if (!canUse) {
      navigate("/members", { replace: true });
      return;
    }
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch(
          `${API.BASE}/api/members/getNonMembers`,
          API.withCreds
        );

        if (res.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        if (res.status === 403) {
          setErr("คุณไม่มีสิทธิ์เพิ่มสมาชิก");
          setUsers([]);
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            data?.message || "โหลดรายชื่อผู้ใช้ที่ยังไม่เป็นสมาชิกไม่สำเร็จ"
          );
        }
        const data = await res.json();
        setUsers(Array.isArray(data?.users) ? data.users : []);
      } catch (e) {
        setErr(e.message || "เกิดข้อผิดพลาด");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return users.filter(
      (u) =>
        !kw ||
        u.name?.toLowerCase().includes(kw) ||
        u.email?.toLowerCase().includes(kw) ||
        u.faculty?.toLowerCase().includes(kw)
    );
  }, [users, q]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!userId) {
      alert("กรุณาเลือกผู้ใช้");
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`${API.BASE}/api/members`, {
        method: "POST",
        ...API.withCreds,
        body: JSON.stringify({ user_id: userId, join_date: joinDate, status }),
      });

      if (res.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "คุณไม่มีสิทธิ์เพิ่มสมาชิก");
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "เพิ่มสมาชิกไม่สำเร็จ");
      }

      navigate("/members", { replace: true });
    } catch (e) {
      alert(e.message || "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  if (!canUse) return null;

  return (
    <div className="min-h-screen py-10 px-6" style={{ backgroundColor: '#F7F3EB' }}>
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center px-4 py-2 bg-white bg-opacity-60 rounded-full text-sm text-amber-800 mb-4 backdrop-blur-sm">
            <span className="w-2 h-2 bg-amber-600 rounded-full mr-2"></span>
            เพิ่มสมาชิกใหม่
          </div>
          <h1 className="text-4xl font-bold text-amber-900 mb-2">เชิญสมาชิกใหม่</h1>
          <p className="text-lg text-amber-700">
            เลือกผู้ใช้ที่ยังไม่เป็นสมาชิก แล้วกำหนดวันที่เข้าร่วม/สถานะ
          </p>
        </div>

        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/members")}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white bg-opacity-80 px-4 py-2.5 text-sm font-medium text-amber-800 hover:bg-amber-50 transition-colors shadow-sm"
          >
            <span>←</span>
            กลับหน้าสมาชิก
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-flex items-center gap-2 text-amber-700">
              <div className="w-4 h-4 bg-amber-600 rounded-full animate-pulse"></div>
              <span>กำลังโหลดรายชื่อผู้ใช้...</span>
            </div>
          </div>
        ) : err ? (
          <div className="py-20 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-100 text-rose-700 rounded-xl">
              <span>⚠️</span>
              <span>{err}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white bg-opacity-80 backdrop-blur-sm p-8 shadow-xl border border-amber-200">
            <form onSubmit={onSubmit} className="space-y-6">
              {/* User Selection */}
              <div>
                <label className="block text-sm font-semibold text-amber-900 mb-3">
                  🔍 ค้นหา / เลือกผู้ใช้
                </label>
                <div className="space-y-3">
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="พิมพ์ค้นหาชื่อ/อีเมล/คณะ"
                    className="w-full rounded-xl border border-amber-200 bg-white bg-opacity-80 px-4 py-3 text-sm text-amber-900 placeholder-amber-600 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                  />
                  <select
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="w-full rounded-xl border border-amber-200 bg-white bg-opacity-80 px-4 py-3 text-sm text-amber-900 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                  >
                    <option value="">— เลือกผู้ใช้ —</option>
                    {filtered.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} • {u.email} {u.faculty ? `• ${u.faculty}` : ""}
                      </option>
                    ))}
                  </select>
                  {filtered.length === 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                      📋 ไม่พบผู้ใช้ที่ตรงเงื่อนไข หรือทุกคนเป็นสมาชิกแล้ว
                    </div>
                  )}
                </div>
              </div>

              {/* Join Date */}
              <div>
                <label className="block text-sm font-semibold text-amber-900 mb-3">
                  📅 วันที่เข้าร่วม
                </label>
                <input
                  type="date"
                  value={joinDate}
                  onChange={(e) => setJoinDate(e.target.value)}
                  className="w-full rounded-xl border border-amber-200 bg-white bg-opacity-80 px-4 py-3 text-sm text-amber-900 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-amber-900 mb-3">
                  🟢 สถานะ
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-amber-200 bg-white bg-opacity-80 px-4 py-3 text-sm text-amber-900 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                >
                  <option value="active">🟢 active</option>
                  <option value="inactive">🟡 inactive</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4 pt-4">
                <button
                  disabled={!userId || submitting}
                  className={
                    "flex-1 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all shadow-lg " +
                    (!userId || submitting
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-gradient-to-r from-amber-600 to-orange-600 hover:opacity-90 hover:shadow-xl")
                  }
                >
                  {submitting ? (
                    <span className="inline-flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      กำลังบันทึก...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      ✅ เพิ่มสมาชิก
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/members")}
                  className="rounded-xl border border-amber-300 bg-white bg-opacity-80 px-6 py-3 text-sm font-medium text-amber-800 hover:bg-amber-50 transition-colors shadow-sm"
                >
                  ❌ ยกเลิก
                </button>
              </div>
            </form>

            {/* Helper Info */}
            <div className="mt-8 p-4 bg-amber-50 bg-opacity-60 border border-amber-200 rounded-xl">
              <div className="text-sm text-amber-800">
                <div className="font-medium mb-2">💡 คำแนะนำ:</div>
                <ul className="space-y-1 text-xs">
                  <li>• เลือกผู้ใช้ที่ลงทะเบียนในระบบแล้ว แต่ยังไม่ได้เป็นสมาชิกชมรม</li>
                  <li>• กำหนดวันที่เข้าร่วมตามความเหมาะสม</li>
                  <li>• สถานะ active = สมาชิกที่ใช้งานอยู่, inactive = สมาชิกที่พักใช้งาน</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}