// src/pages/auth/Login.jsx
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../api";
import mcImg from "../../assets/mc.jpg";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const navigate = useNavigate();

  const canSubmit = useMemo(
    () => /\S+@\S+\.\S+/.test(email) && pw.length >= 6,
    [email, pw]
  );

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit || loading) return;
    setMsg("");
    setLoading(true);

    try {
      const res = await fetch(`${API.BASE}/api/auth/login`, {
        method: "POST",
        ...API.withCreds,
        body: JSON.stringify({ email, password: pw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data?.message || "เข้าสู่ระบบไม่สำเร็จ");
        localStorage.removeItem("mc_authed");
        localStorage.removeItem("mc_user");
        setLoading(false);
        return;
      }

      // ดึงข้อมูลผู้ใช้เพื่อเก็บ role/ชื่อใน navbar
      try {
        const meRes = await fetch(`${API.BASE}/api/auth/me`, API.withCreds);
        if (meRes.ok) {
          const me = await meRes.json();
          if (me?.user) {
            localStorage.setItem("mc_user", JSON.stringify(me.user));
            window.dispatchEvent(new Event("storage"));
          }
        }
      } catch {}

      localStorage.setItem("mc_authed", "1");
      navigate("/", { replace: true });
    } catch {
      setMsg("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen py-10 px-6" style={{ backgroundColor: "#F7F3EB" }}>
      <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        {/* Left: form */}
        <div>
          <div className="inline-flex items-center px-4 py-2 bg-white/70 rounded-full text-sm text-amber-800 mb-4 backdrop-blur-sm border border-amber-200">
            <span className="w-2 h-2 bg-amber-600 rounded-full mr-2"></span>
            เข้าสู่ระบบ (Login)
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-amber-900 leading-tight">
            ยินดีต้อนรับกลับสู่
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">
              Music Club KUKPS
            </span>
          </h1>
          <p className="mt-3 text-lg text-amber-700">
            เข้าร่วมจัดการข้อมูลชมรม, กิจกรรม และสมาชิกได้ที่นี่
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-6 rounded-2xl border border-amber-200 bg-white/80 backdrop-blur shadow-xl p-6 space-y-5"
          >
            <div>
              <label className="block text-sm font-medium text-amber-900 mb-1">
                อีเมล
              </label>
              <input
                type="email"
                value={email}
                placeholder="Email"
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-xl border border-amber-300 bg-white/80 px-4 py-3 text-amber-900 placeholder-amber-600 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-amber-900 mb-1">
                รหัสผ่าน
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={pw}
                  placeholder="Passsword"
                  onChange={(e) => setPw(e.target.value)}
                  className="block w-full rounded-xl border border-amber-300 bg-white/80 px-4 py-3 pr-12 text-amber-900 placeholder-amber-600 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-700 hover:text-amber-900 px-2 py-1 rounded-lg"
                  aria-label={showPw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {showPw ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <button
              disabled={!canSubmit || loading}
              className={
                "w-full rounded-xl px-6 py-3 font-semibold shadow-lg transition " +
                (canSubmit && !loading
                  ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:opacity-90"
                  : "bg-amber-200 text-amber-600 cursor-not-allowed")
              }
            >
              {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            </button>

            {msg && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 text-sm text-center">
                {msg}
              </div>
            )}

            <p className="text-sm text-amber-800 text-center">
              ยังไม่มีบัญชี?{" "}
              <Link
                to="/register"
                className="text-amber-900 font-semibold underline underline-offset-2 hover:text-amber-700"
              >
                สมัครสมาชิก
              </Link>
            </p>
          </form>
        </div>

        {/* Right: image */}
        <div className="hidden md:block">
          <div className="rounded-3xl overflow-hidden border border-amber-200 shadow-2xl bg-white/70 backdrop-blur">
            <img
              className="w-full h-full object-cover aspect-[4/3]"
              src={mcImg}
              alt="Music Club"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
