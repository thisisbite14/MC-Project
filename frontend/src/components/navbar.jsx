// src/components/Navbar.jsx
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import API from "../api";
import logo from "../assets/mc.jpg"; // 👈 เพิ่มบรรทัดนี้ (เปลี่ยนพาธ/ชื่อไฟล์ตามจริง)


export default function Navbar() {
  const { pathname } = useLocation();
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("mc_user");
    return stored ? JSON.parse(stored) : null;
  });
  const navigate = useNavigate();

  async function fetchMe() {
    try {
      const res = await fetch(`${API.BASE}/api/auth/me`, API.withCreds);
      if (!res.ok) { setUser(null); return; }
      const data = await res.json().catch(() => ({}));
      if (data?.user) {
        setUser(data.user);
        localStorage.setItem("mc_user", JSON.stringify(data.user));
      } else {
        setUser(null);
      }
    } catch { setUser(null); }
  }

  useEffect(() => { fetchMe(); }, [pathname]);
  useEffect(() => {
    const syncUser = () => {
      const stored = localStorage.getItem("mc_user");
      setUser(stored ? JSON.parse(stored) : null);
    };
    window.addEventListener("storage", syncUser);
    return () => window.removeEventListener("storage", syncUser);
  }, []);

  async function handleLogout() {
    try { await fetch(`${API.BASE}/api/auth/logout`, { method: "POST", ...API.withCreds }); } catch {}
    localStorage.removeItem("mc_authed");
    localStorage.removeItem("mc_user");
    setUser(null);
    navigate("/login", { replace: true });
  }

  const role = (user?.role || "").trim();
  const isAdminOrCommittee = role === "ผู้ดูแล" || role === "กรรมการ";
  const canSeeMembers = isAdminOrCommittee;
  const canSeeBusiness = isAdminOrCommittee;

  const active = ({ isActive }) =>
    "relative px-3 py-2 text-sm font-medium transition " +
    (isActive
      ? "text-amber-800 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-amber-700"
      : "text-amber-700 hover:text-amber-900");

  const [dealOpen, setDealOpen] = useState(false);
  const hideTimer = useRef(null);
  const openDeal = () => { if (hideTimer.current) clearTimeout(hideTimer.current); setDealOpen(true); };
  const closeDeal = () => { hideTimer.current = setTimeout(() => setDealOpen(false), 120); };

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-md border-b border-amber-200 shadow-sm"
      style={{ backgroundColor: "rgba(247, 243, 235, 0.95)" }}
    >
      <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
        {/* Logo (ใช้รูปภาพแทนตัวอักษร) */}
        <Link to="/" className="flex items-center gap-3">
          <img
            src={logo}
            alt="Music Club"
            className="h-10 w-auto rounded-xl border border-amber-200 shadow-md bg-white object-cover"
          />
          {/* ถ้าอยากเอาข้อความชื่อชมรมออก ให้ลบ span ด้านล่างนี้ */}
          <span className="hidden sm:inline text-lg font-bold text-amber-900">Music Club</span>
        </Link>

        {/* ===== เมนูเดิมทั้งหมดคงไว้ตามโค้ดของคุณ (ตัดออกในตัวอย่างเพื่อย่อ) ===== */}
        {/* ... เมนู, ดรอปดาวน์, ปุ่มเข้าสู่ระบบ/ออกจากระบบ ... */}
        <nav className="hidden md:flex gap-6 items-center">
          <NavLink to="/" className={active} end>หน้าหลัก</NavLink>
          {canSeeMembers && <NavLink to="/members" className={active}>สมาชิก</NavLink>}
          <NavLink to="/bands" className={active}>วง</NavLink>
          <NavLink to="/schedules" className={active}>ตารางกิจกรรม</NavLink>
          {!canSeeBusiness && <NavLink to="/documents" className={active}>เอกสาร</NavLink>}

          {canSeeBusiness && (
            <div className="relative" onMouseEnter={openDeal} onMouseLeave={closeDeal}>
              <button
                className={
                  "flex items-center gap-1 px-3 py-2 text-sm font-medium transition " +
                  (dealOpen ? "text-amber-900" : "text-amber-700 hover:text-amber-900")
                }
              >
                ธุรกรรม
                <svg width="14" height="14" viewBox="0 0 20 20" className="opacity-70">
                  <path d="M5 7l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </button>
              {dealOpen && (
                <div className="absolute left-0 mt-2 w-56 rounded-xl border border-amber-200 bg-white shadow-lg p-2">
                  <DropdownLink to="/documents" label="เอกสาร" desc="แบบฟอร์ม/ไฟล์" />
                  <DropdownLink to="/finances"  label="การเงิน" desc="รายรับรายจ่าย" />
                  <DropdownLink to="/equipments" label="ครุภัณฑ์" desc="อุปกรณ์/ซ่อมบำรุง" />
                </div>
              )}
            </div>
          )}
        </nav>

        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-amber-800">
              👋 {user.first_name || user.email} {isAdminOrCommittee ? `• ${role}` : ""}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-medium hover:opacity-90 transition shadow-lg"
            >
              ออกจากระบบ
            </button>
          </div>
        ) : (
          <Link
            to={pathname === "/login" ? "/register" : "/login"}
            className={
              pathname === "/login"
                ? "px-4 py-2 rounded-full bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-medium hover:opacity-90 transition shadow-lg"
                : "px-4 py-2 rounded-full bg-amber-900 text-white text-sm font-medium hover:bg-amber-800 transition shadow-lg"
            }
          >
            {pathname === "/login" ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
          </Link>
        )}
      </div>
    </header>
  );
}

function DropdownLink({ to, label, desc }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        "block rounded-lg px-3 py-2 transition " +
        (isActive ? "bg-amber-100 text-amber-900" : "hover:bg-amber-50 text-amber-800")
      }
    >
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs text-amber-700">{desc}</div>
    </NavLink>
  );
}
