import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";

const ROLES = ["สมาชิก", "กรรมการ", "ผู้ดูแล"]; // ลำดับบทบาท

function twStatusBadge(status) {
  const on = status === "active";
  return `inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
    on
      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
      : "bg-amber-100 text-amber-700 border border-amber-200"
  }`;
}

function roleBadge(role) {
  const base = "inline-flex px-2 py-1 rounded-lg text-xs font-medium";
  if (role === "ผู้ดูแล")
    return `${base} bg-purple-100 text-purple-800 border border-purple-200`;
  if (role === "กรรมการ")
    return `${base} bg-amber-100 text-amber-800 border border-amber-200`;
  return `${base} bg-gray-100 text-gray-700 border border-gray-200`;
}

function formatDateTH(d) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return d;
  }
}

export default function Members() {
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [me] = useState(() => {
    const s = localStorage.getItem("mc_user");
    return s ? JSON.parse(s) : null;
  });

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const canEditStatus = ["ผู้ดูแล", "กรรมการ"].includes(me?.role);
  const canDelete = me?.role === "ผู้ดูแล";
  const canAdd = ["ผู้ดูแล", "กรรมการ"].includes(me?.role);
  const canEditRole = me?.role === "ผู้ดูแล"; // ✅ แก้ role ได้เฉพาะผู้ดูแล

  async function load() {
    try {
      setLoading(true);
      setErr("");
      const res = await fetch(`${API.BASE}/api/members`, API.withCreds);

      if (res.status === 401) {
        setErr("กรุณาเข้าสู่ระบบก่อน");
        setMembers([]);
        navigate("/login", { replace: true });
        return;
      }

      if (!res.ok) {
        const msg =
          (await res.json().catch(() => ({})))?.message ||
          "โหลดข้อมูลสมาชิกไม่สำเร็จ";
        throw new Error(msg);
      }

      const data = await res.json();
      setMembers(Array.isArray(data?.members) ? data.members : []);
    } catch (e) {
      setErr(e.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return members.filter((m) => {
      const passQ =
        !kw ||
        m.name?.toLowerCase().includes(kw) ||
        m.email?.toLowerCase().includes(kw) ||
        m.faculty?.toLowerCase().includes(kw) ||
        m.role?.toLowerCase().includes(kw);
      const passStatus = statusFilter === "all" ? true : m.status === statusFilter;
      return passQ && passStatus;
    });
  }, [members, q, statusFilter]);

  // ✅ เปลี่ยนสถานะ (เดิม)
  async function handleToggleStatus(id, current) {
    if (!canEditStatus) return;
    const next = current === "active" ? "inactive" : "active";
    if (!confirm(`ยืนยันเปลี่ยนสถานะสมาชิกเป็น "${next}" ?`)) return;
    try {
      const res = await fetch(
        `${API.BASE}/api/members/updateMemberStatus/${id}`,
        {
          method: "PUT",
          ...API.withCreds,
          body: JSON.stringify({ status: next }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "อัปเดตสถานะไม่สำเร็จ");
      }
      setMembers((old) =>
        old.map((m) => (m.id === id ? { ...m, status: next } : m))
      );
    } catch (e) {
      alert(e.message || "เกิดข้อผิดพลาด");
    }
  }

  // ✅ เปลี่ยนบทบาท (เฉพาะผู้ดูแล)
  async function handleChangeRole(id, newRole) {
    if (!canEditRole) return;
    if (!ROLES.includes(newRole)) return alert("บทบาทไม่ถูกต้อง");

    // กันไม่ให้ผู้ดูแลลดสิทธิ์ตัวเองโดยไม่ตั้งใจ (optional)
    if (id === me?.id && newRole !== "ผู้ดูแล") {
      const ok = confirm(
        "คุณกำลังจะเปลี่ยนบทบาทของตัวเองจาก 'ผู้ดูแล' อาจทำให้สิทธิ์ลดลง ต้องการทำต่อหรือไม่?"
      );
      if (!ok) return;
    }

    try {
      const res = await fetch(
        `${API.BASE}/api/members/updateMemberRole/${id}`,
        {
          method: "PUT",
          ...API.withCreds,
          body: JSON.stringify({ role: newRole }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "อัปเดตบทบาทไม่สำเร็จ");
      }
      setMembers((old) =>
        old.map((m) => (m.id === id ? { ...m, role: newRole } : m))
      );
    } catch (e) {
      alert(e.message || "เกิดข้อผิดพลาด");
    }
  }

  // ✅ ลบสมาชิก (เฉพาะผู้ดูแล)
  async function handleDelete(id) {
    if (!canDelete) return;
    if (!confirm("ยืนยันลบสมาชิกคนนี้?")) return;
    try {
      const res = await fetch(`${API.BASE}/api/members/deleteMember/${id}`, {
        method: "DELETE",
        ...API.withCreds,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "ลบสมาชิกไม่สำเร็จ");
      }
      setMembers((old) => old.filter((m) => m.id !== id));
    } catch (e) {
      alert(e.message || "เกิดข้อผิดพลาด");
    }
  }

  return (
    <div className="min-h-screen py-10 px-6" style={{ backgroundColor: "#F7F3EB" }}>
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center px-4 py-2 bg-white bg-opacity-60 rounded-full text-sm text-amber-800 mb-4 backdrop-blur-sm">
              <span className="w-2 h-2 bg-amber-600 rounded-full mr-2"></span>
              รายชื่อสมาชิก
            </div>
            <h1 className="text-4xl font-bold text-amber-900 mb-2">
              สมาชิก Music Club
            </h1>
            <p className="text-lg text-amber-700">
              ชุมชนนักดนตรีที่แบ่งปันความรักในเสียงเพลง
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white bg-opacity-60 backdrop-blur-sm rounded-2xl p-6 border border-amber-200">
            <div className="flex flex-wrap gap-3 w-full lg:w-auto">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหาชื่อ/อีเมล/คณะ/บทบาท"
                className="flex-1 min-w-[200px] rounded-xl border border-amber-200 bg-white bg-opacity-80 px-4 py-3 text-sm text-amber-900 placeholder-amber-600 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-xl border border-amber-200 bg-white bg-opacity-80 px-4 py-3 text-sm text-amber-900 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="all">สถานะทั้งหมด</option>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={load}
                className="rounded-xl bg-amber-800 px-6 py-3 text-sm font-medium text-white hover:bg-amber-900 transition-colors shadow-lg"
              >
                🔄 รีเฟรช
              </button>
              {canAdd && (
                <button
                  onClick={() => navigate("/members/add")}
                  className="rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-3 text-sm font-medium text-white hover:opacity-90 transition-all shadow-lg"
                >
                  ➕ เพิ่มสมาชิก
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-flex items-center gap-2 text-amber-700">
              <div className="w-4 h-4 bg-amber-600 rounded-full animate-pulse"></div>
              <span>กำลังโหลดข้อมูลสมาชิก...</span>
            </div>
          </div>
        ) : err ? (
          <div className="py-20 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-100 text-rose-700 rounded-xl">
              <span>⚠️</span>
              <span>{err}</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="text-amber-600 text-lg">
              🔍 ไม่พบข้อมูลสมาชิกที่ตรงกับการค้นหา
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white bg-opacity-80 backdrop-blur-sm shadow-xl border border-amber-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-amber-200">
                <thead className="bg-amber-100 bg-opacity-60">
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-amber-800">
                    <th className="px-6 py-4">👤 ชื่อ</th>
                    <th className="px-6 py-4">📧 อีเมล</th>
                    <th className="px-6 py-4">🏛️ คณะ/สังกัด</th>
                    <th className="px-6 py-4">🎭 บทบาท</th>
                    <th className="px-6 py-4">📅 เข้าร่วม</th>
                    <th className="px-6 py-4">🟢 สถานะ</th>
                    {(canEditStatus || canDelete) && (
                      <th className="px-6 py-4">⚙️ จัดการ</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100">
                  {filtered.map((m, i) => (
                    <tr
                      key={m.id}
                      className={`text-sm text-amber-900 hover:bg-amber-50 hover:bg-opacity-50 transition-colors ${
                        i % 2 === 0
                          ? "bg-white bg-opacity-40"
                          : "bg-amber-50 bg-opacity-30"
                      }`}
                    >
                      <td className="px-6 py-4 font-medium">{m.name}</td>
                      <td className="px-6 py-4 text-amber-700">{m.email}</td>
                      <td className="px-6 py-4">{m.faculty || "-"}</td>

                      {/* 🎭 บทบาท */}
                      <td className="px-6 py-4">
                        {canEditRole ? (
                          <select
                            value={m.role || "สมาชิก"}
                            onChange={(e) => handleChangeRole(m.id, e.target.value)}
                            className="rounded-lg border border-amber-300 bg-white bg-opacity-80 px-2 py-1 text-xs text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                            disabled={m.id === me?.id && m.role === "ผู้ดูแล" && ROLES.includes("ผู้ดูแล") === false}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className={roleBadge(m.role || "สมาชิก")}>
                            {m.role || "สมาชิก"}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">{formatDateTH(m.join_date)}</td>

                      <td className="px-6 py-4">
                        <span className={twStatusBadge(m.status)}>
                          {m.status === "active" ? "🟢 active" : "🟡 inactive"}
                        </span>
                      </td>

                      {(canEditStatus || canDelete) && (
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {canEditStatus && (
                              <button
                                onClick={() => handleToggleStatus(m.id, m.status)}
                                className="rounded-lg border border-amber-300 bg-white bg-opacity-80 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50 transition-colors"
                              >
                                {m.status === "active" ? "⏸️ ระงับ" : "▶️ เปิดใช้งาน"}
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(m.id)}
                                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 transition-colors shadow-sm"
                              >
                                🗑️ ลบ
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary footer */}
            <div className="px-6 py-4 bg-amber-100 bg-opacity-40 border-t border-amber-200">
              <div className="flex justify-between items-center text-sm text-amber-800">
                <span>
                  📊 รวมสมาชิก: <strong>{filtered.length}</strong> คน
                </span>
                <span>
                  🟢 Active:{" "}
                  <strong>{filtered.filter((m) => m.status === "active").length}</strong>{" "}
                  • 🟡 Inactive:{" "}
                  <strong>{filtered.filter((m) => m.status === "inactive").length}</strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
