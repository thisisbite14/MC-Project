// src/pages/auth/Register.jsx
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({
    prefix: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    faculty: "",
  });

  const [msg, setMsg] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const navigate = useNavigate();

  const prefixes = ["นาย", "นาง", "นางสาว"];
  const faculties = [
    "คณะเกษตร กำแพงแสน",
    "คณะวิศวกรรมศาสตร์ กำแพงแสน",
    "คณะสัตวแพทยศาสตร์",
    "คณะวิทยาศาสตร์การกีฬาและสุขภาพ",
    "คณะศิลปศาสตร์และวิทยาศาสตร์",
    "คณะศึกษาศาสตร์และพัฒนศาสตร์",
    "คณะประมง",
    "คณะสิ่งแวดล้อม",
    "บัณฑิตวิทยาลัย",
    "คณะอุตสาหกรรมบริการ",
  ];

  const onChange = (k, v) => {
    setForm((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  /* ----------------------- VALIDATIONS ----------------------- */
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

  const passwordStrength = useMemo(() => {
    const p = form.password || "";
    const hasLower = /[a-z]/.test(p);
    const hasUpper = /[A-Z]/.test(p);
    const hasNum = /\d/.test(p);
    const hasSpec = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p);
    const noSpace = !/\s/.test(p);
    const len = p.length;

    let score = 0;
    if (hasLower) score++;
    if (hasUpper) score++;
    if (hasNum) score++;
    if (hasSpec) score++;
    if (noSpace) score++;
    if (len >= 8) score++;
    if (len >= 12) score++;

    let level = "อ่อน";
    let percent = 33;
    let color = "bg-rose-500";
    if (score >= 6) {
      level = "ปานกลาง";
      percent = 66;
      color = "bg-amber-500";
    }
    if (score >= 7) {
      level = "แข็งแรง";
      percent = 100;
      color = "bg-emerald-600";
    }

    return {
      hasLower,
      hasUpper,
      hasNum,
      hasSpec,
      noSpace,
      len,
      level,
      percent,
      color,
      ok: passwordRegex.test(p),
    };
  }, [form.password]);

  function validateAll() {
    const e = {};
    if (!form.prefix) e.prefix = "กรุณาเลือกคำนำหน้า";
    if (!form.faculty) e.faculty = "กรุณาเลือกคณะ/สังกัด";
    if (!form.first_name.trim()) e.first_name = "กรุณากรอกชื่อ";
    if (!form.last_name.trim()) e.last_name = "กรุณากรอกนามสกุล";

    if (!form.email.trim()) e.email = "กรุณากรอกอีเมล";
    else if (!emailRegex.test(form.email.trim()))
      e.email = "รูปแบบอีเมลไม่ถูกต้อง";

    if (!form.password) e.password = "กรุณากรอกรหัสผ่าน";
    else if (!passwordRegex.test(form.password)) {
      e.password =
        "รหัสผ่านต้องมีอย่างน้อย 8 ตัว และมีทั้งพิมพ์ใหญ่/พิมพ์เล็ก/ตัวเลข/อักขระพิเศษ";
    } else if (/\s/.test(form.password)) {
      e.password = "ห้ามมีช่องว่างในรหัสผ่าน";
    }

    if (!form.confirmPassword) e.confirmPassword = "กรุณายืนยันรหัสผ่าน";
    else if (form.password !== form.confirmPassword)
      e.confirmPassword = "รหัสผ่านไม่ตรงกัน";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  /* ----------------------- SUBMIT ----------------------- */
  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    if (!validateAll()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefix: form.prefix,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          password: form.password,
          faculty: form.faculty,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data?.message || "สมัครสมาชิกไม่สำเร็จ");
        return;
      }

      const login = await fetch(`/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
        }),
      });
      const loginData = await login.json();
      if (!login.ok) {
        setMsg(loginData?.message || "เข้าสู่ระบบอัตโนมัติไม่สำเร็จ");
        return;
      }

      setMsg("สมัครและเข้าสู่ระบบสำเร็จ");
      navigate("/", { replace: true });
    } catch {
      setMsg("Network error");
    } finally {
      setLoading(false);
    }
  }

  /* ----------------------- UI helpers ----------------------- */
  const hintItem = (ok, text) => (
    <li
      className={
        "text-sm flex items-center gap-2 " +
        (ok ? "text-emerald-700" : "text-amber-600/70")
      }
    >
      <span
        className={
          "inline-block w-2.5 h-2.5 rounded-full " +
          (ok ? "bg-emerald-600" : "bg-amber-300")
        }
      />
      {text}
    </li>
  );

  return (
    <div
      className="min-h-screen py-10 px-6"
      style={{ backgroundColor: "#F7F3EB" }}
    >
      <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-10 items-start">
        {/* Left: header + form */}
        <div>
          <div className="inline-flex items-center px-4 py-2 bg-white/70 rounded-full text-sm text-amber-800 mb-4 backdrop-blur-sm border border-amber-200">
            <span className="w-2 h-2 bg-amber-600 rounded-full mr-2"></span>
            สมัครสมาชิก (Register)
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-amber-900 leading-tight">
            มาเป็นส่วนหนึ่งกับ
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">
              Music Club KUKPS
            </span>
          </h1>
          <p className="mt-3 text-lg text-amber-700">
            กรอกข้อมูลให้ครบถ้วนเพื่อเข้าร่วมระบบชมรม
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-6 bg-white/80 backdrop-blur rounded-2xl border border-amber-200 shadow-xl p-6 space-y-5"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <select
                  className="w-full rounded-xl border border-amber-300 bg-white/80 px-4 py-3 text-amber-900 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  value={form.prefix}
                  onChange={(e) => onChange("prefix", e.target.value)}
                >
                  <option value="">เลือกคำนำหน้า</option>
                  {prefixes.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                {errors.prefix && (
                  <p className="mt-1 text-xs text-rose-600">{errors.prefix}</p>
                )}
              </div>

              <div>
                <select
                  className="w-full rounded-xl border border-amber-300 bg-white/80 px-4 py-3 text-amber-900 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  value={form.faculty}
                  onChange={(e) => onChange("faculty", e.target.value)}
                >
                  <option value="">เลือกคณะ/สังกัด</option>
                  {faculties.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                {errors.faculty && (
                  <p className="mt-1 text-xs text-rose-600">{errors.faculty}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <input
                  className="w-full rounded-xl border border-amber-300 bg-white/80 px-4 py-3 text-amber-900 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="ชื่อ"
                  value={form.first_name}
                  onChange={(e) => onChange("first_name", e.target.value)}
                />
                {errors.first_name && (
                  <p className="mt-1 text-xs text-rose-600">
                    {errors.first_name}
                  </p>
                )}
              </div>
              <div>
                <input
                  className="w-full rounded-xl border border-amber-300 bg-white/80 px-4 py-3 text-amber-900 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="นามสกุล"
                  value={form.last_name}
                  onChange={(e) => onChange("last_name", e.target.value)}
                />
                {errors.last_name && (
                  <p className="mt-1 text-xs text-rose-600">
                    {errors.last_name}
                  </p>
                )}
              </div>
            </div>

            <div>
              <input
                className="w-full rounded-xl border border-amber-300 bg-white/80 px-4 py-3 text-amber-900 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                placeholder="อีเมล"
                type="email"
                value={form.email}
                onChange={(e) => onChange("email", e.target.value)}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-rose-600">{errors.email}</p>
              )}
            </div>

            <div>
              <div className="relative">
                <input
                  className="w-full rounded-xl border border-amber-300 bg-white/80 px-4 py-3 pr-12 text-amber-900 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="รหัสผ่าน"
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => onChange("password", e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-700 hover:text-amber-900 px-2 py-1 rounded-lg"
                  onClick={() => setShowPw((v) => !v)}
                >
                  {showPw ? "🙈" : "👁️"}
                </button>
              </div>

              {/* strength */}
              <div className="mt-2">
                <div className="h-2 w-full bg-amber-100 rounded-full overflow-hidden">
                  <div
                    className={`h-2 ${passwordStrength.color} transition-all`}
                    style={{ width: `${passwordStrength.percent}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-amber-700">
                  ความแข็งแรงรหัสผ่าน:{" "}
                  <span
                    className={
                      passwordStrength.level === "แข็งแรง"
                        ? "text-emerald-700 font-semibold"
                        : passwordStrength.level === "ปานกลาง"
                        ? "text-amber-700 font-semibold"
                        : "text-rose-600 font-semibold"
                    }
                  >
                    {passwordStrength.level}
                  </span>
                </div>
                <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  {hintItem(passwordStrength.len >= 8, "อย่างน้อย 8 ตัว")}
                  {hintItem(passwordStrength.hasUpper, "มีตัวพิมพ์ใหญ่ (A–Z)")}
                  {hintItem(passwordStrength.hasLower, "มีตัวพิมพ์เล็ก (a–z)")}
                  {hintItem(passwordStrength.hasNum, "มีตัวเลข (0–9)")}
                  {hintItem(passwordStrength.hasSpec, "มีอักขระพิเศษ")}
                  {hintItem(passwordStrength.noSpace, "ไม่มีช่องว่าง")}
                </ul>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-rose-600">{errors.password}</p>
              )}
            </div>

            <div>
              <div className="relative">
                <input
                  className="w-full rounded-xl border border-amber-300 bg-white/80 px-4 py-3 pr-12 text-amber-900 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="ยืนยันรหัสผ่าน"
                  type={showPw2 ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => onChange("confirmPassword", e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-700 hover:text-amber-900 px-2 py-1 rounded-lg"
                  onClick={() => setShowPw2((v) => !v)}
                >
                  {showPw2 ? "🙈" : "👁️"}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <button
              disabled={loading}
              className={
                "w-full rounded-xl px-6 py-3 font-semibold shadow-lg transition " +
                (loading
                  ? "bg-amber-200 text-amber-600 cursor-not-allowed"
                  : "bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:opacity-90")
              }
            >
              {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
            </button>

            {msg && (
              <div className="rounded-xl border border-amber-200 bg-white px-4 py-3 text-amber-800 text-center">
                {msg}
              </div>
            )}

            <p className="text-sm text-amber-800 text-center">
              มีบัญชีอยู่แล้ว?{" "}
              <Link
                to="/login"
                className="text-amber-900 font-semibold underline underline-offset-2 hover:text-amber-700"
              >
                เข้าสู่ระบบ
              </Link>
            </p>
          </form>
        </div>

        {/* Right: illustration */}
        <div className="hidden md:block">
          <div className="rounded-3xl overflow-hidden border border-amber-200 shadow-2xl bg-white/70 backdrop-blur">
            <img
              className="w-full h-full object-cover aspect-[4/3]"
              src="https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=1400&auto=format&fit=crop"
              alt="Register music club"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
