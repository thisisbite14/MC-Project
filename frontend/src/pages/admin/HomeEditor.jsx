// src/pages/admin/HomeEditor.jsx
import { useEffect, useState } from "react";
import API from "../../api";

const bg = { backgroundColor: "#F7F3EB" };

function canEditByRole(user) {
  const r = String(user?.role || "").trim().toLowerCase();
  return r.includes("ผู้ดูแล") || r.includes("admin") || r.includes("แอดมิน");
}

export default function HomeEditor() {
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState("");
  const [msg, setMsg]           = useState("");
  const [form, setForm] = useState({
    heroTitle: "",
    heroSubtitle: "",
    heroImage: "",
    about: "",
    announcements: [],
    links: [],
  });

  const me = (() => {
    try { return JSON.parse(localStorage.getItem("mc_user") || "null"); }
    catch { return null; }
  })();
  const isAdmin = canEditByRole(me);

  // โหลดค่าเดิม
  async function loadHome() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`${API.BASE}/api/site/home`, { credentials: "include" });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data?.message || "โหลดค่าไม่สำเร็จ");

      const cfg = data?.home || data || {}; // รองรับทั้ง {home:{...}} หรือส่งตรง ๆ
      setForm({
        heroTitle: cfg.heroTitle || "",
        heroSubtitle: cfg.heroSubtitle || "",
        heroImage: cfg.heroImage || "",
        about: cfg.about || "",
        announcements: Array.isArray(cfg.announcements) ? cfg.announcements : [],
        links: Array.isArray(cfg.links) ? cfg.links : [],
      });

      localStorage.setItem("mc_home_cache", JSON.stringify(cfg));
    } catch (e) {
      setErr(e.message || "เกิดข้อผิดพลาด");
      // fallback cache
      try {
        const cached = JSON.parse(localStorage.getItem("mc_home_cache") || "{}");
        if (cached && Object.keys(cached).length) {
          setForm({
            heroTitle: cached.heroTitle || "",
            heroSubtitle: cached.heroSubtitle || "",
            heroImage: cached.heroImage || "",
            about: cached.about || "",
            announcements: Array.isArray(cached.announcements) ? cached.announcements : [],
            links: Array.isArray(cached.links) ? cached.links : [],
          });
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadHome(); }, []);

  // อัปโหลดรูป
  async function uploadImage(file) {
    const fd = new FormData();
    fd.append("file", file);
    const res  = await fetch(`${API.BASE}/api/files/upload`, {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const data = await res.json().catch(()=>({}));
    if (!res.ok) throw new Error(data?.message || "อัปโหลดรูปไม่สำเร็จ");
    return data.url || `${API.BASE}${data.path}`;
  }

  async function onPickHero(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const url = await uploadImage(f);
      setForm(x => ({ ...x, heroImage: url }));
      setMsg("อัปโหลดรูปสำเร็จ");
    } catch (e) {
      setErr(e.message || "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      e.target.value = "";
    }
  }

  const addAnnouncement = () =>
    setForm(x => ({ ...x, announcements: [...x.announcements, { title: "", url: "" }] }));
  const addLink = () =>
    setForm(x => ({ ...x, links: [...x.links, { label: "", url: "" }] }));

  const updateArray = (key, idx, field, value) =>
    setForm(x => {
      const arr = [...x[key]];
      arr[idx] = { ...arr[idx], [field]: value };
      return { ...x, [key]: arr };
    });

  const removeArray = (key, idx) =>
    setForm(x => ({ ...x, [key]: x[key].filter((_, i) => i !== idx) }));

  // บันทึก (merge ของเดิมกันชนกับ editor อื่น)
  async function onSave() {
    if (!isAdmin) return alert("เฉพาะผู้ดูแลเท่านั้น");
    try {
      setSaving(true);
      setErr("");
      setMsg("");

      // โหลดล่าสุดมาก่อน (กันชน)
      const resGet = await fetch(`${API.BASE}/api/site/home`, { credentials: "include" });
      const dataGet = await resGet.json().catch(()=>({}));
      const current = dataGet?.home || dataGet || {};

      const next = { ...current, ...form };

      const res = await fetch(`${API.BASE}/api/site/home`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next), // ← ถ้า backend ต้องการ {home: next} ให้ปรับเป็น JSON.stringify({ home: next })
      });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) {
        // แสดงสาเหตุ 401/403 ชัด ๆ
        if (res.status === 401) throw new Error("ยังไม่ได้เข้าสู่ระบบ");
        if (res.status === 403) throw new Error("ไม่มีสิทธิ์เข้าถึง");
        throw new Error(data?.message || "บันทึกไม่สำเร็จ");
      }

      localStorage.setItem("mc_home_cache", JSON.stringify(next));
      setMsg("บันทึกสำเร็จ");
      window.dispatchEvent(new CustomEvent("home_content_updated", { detail: next }));
    } catch (e) {
      setErr(e.message || "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) return <div className="p-6 text-center text-rose-600">ต้องเป็นผู้ดูแลระบบเท่านั้น</div>;
  if (loading)   return <div className="p-6 text-center text-amber-700">กำลังโหลด...</div>;

  return (
    <div className="min-h-screen py-10 px-6" style={bg}>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 bg-white bg-opacity-60 rounded-full text-sm text-amber-800 mb-4 border border-amber-200">
            ✏️ แก้ไขข้อมูลหน้าแรก (Admin)
          </div>
          <h1 className="text-3xl font-bold text-amber-900">Home Editor</h1>
        </div>

        {err && <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-rose-700">⚠️ {err}</div>}
        {msg && <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-700">✅ {msg}</div>}

        {/* HERO */}
        <div className="rounded-2xl bg-white/90 border border-amber-200 p-5">
          <h2 className="font-semibold text-amber-900 mb-3">ส่วน Hero</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-amber-700">หัวเรื่อง</label>
              <input className="w-full rounded-xl border border-amber-200 px-3 py-2"
                     value={form.heroTitle}
                     onChange={(e)=>setForm(x=>({...x, heroTitle:e.target.value}))}/>
            </div>
            <div>
              <label className="text-sm text-amber-700">คำโปรย</label>
              <input className="w-full rounded-xl border border-amber-200 px-3 py-2"
                     value={form.heroSubtitle}
                     onChange={(e)=>setForm(x=>({...x, heroSubtitle:e.target.value}))}/>
            </div>
          </div>
          <div className="mt-3">
            <label className="text-sm text-amber-700 block mb-1">รูปพื้นหลัง (อัปโหลดได้)</label>
            {form.heroImage && (
              <div className="mb-2">
                <img src={form.heroImage} alt="hero" className="h-36 rounded-xl object-cover border" />
              </div>
            )}
            <div className="flex gap-2">
              <input type="file" accept="image/*" onChange={onPickHero}/>
              <button className="rounded-lg border px-3 py-1.5"
                      onClick={()=>setForm(x=>({...x, heroImage:""}))}>
                ลบรูป
              </button>
            </div>
          </div>
        </div>

        {/* ABOUT */}
        <div className="rounded-2xl bg-white/90 border border-amber-200 p-5">
          <h2 className="font-semibold text-amber-900 mb-3">เกี่ยวกับชมรม</h2>
          <textarea rows={5} className="w-full rounded-xl border border-amber-200 px-3 py-2"
                    value={form.about}
                    onChange={(e)=>setForm(x=>({...x, about:e.target.value}))}/>
        </div>

        {/* ANNOUNCEMENTS */}
        <div className="rounded-2xl bg-white/90 border border-amber-200 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-amber-900">ประกาศ</h2>
            <button onClick={addAnnouncement}
                    className="rounded-lg bg-amber-700 text-white px-3 py-1.5">+ เพิ่มประกาศ</button>
          </div>
          <div className="mt-3 space-y-3">
            {form.announcements.map((a,i)=>(
              <div key={i} className="grid md:grid-cols-2 gap-3">
                <input placeholder="หัวข้อ"
                       className="rounded-xl border border-amber-200 px-3 py-2"
                       value={a.title}
                       onChange={(e)=>updateArray('announcements', i, 'title', e.target.value)} />
                <div className="flex gap-2">
                  <input placeholder="URL"
                         className="flex-1 rounded-xl border border-amber-200 px-3 py-2"
                         value={a.url}
                         onChange={(e)=>updateArray('announcements', i, 'url', e.target.value)} />
                  <button className="rounded-lg bg-rose-600 text-white px-3"
                          onClick={()=>removeArray('announcements', i)}>ลบ</button>
                </div>
              </div>
            ))}
            {!form.announcements.length && <div className="text-sm text-amber-700">ยังไม่มีประกาศ</div>}
          </div>
        </div>

        {/* LINKS */}
        <div className="rounded-2xl bg-white/90 border border-amber-200 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-amber-900">ลิงก์ด่วน</h2>
            <button onClick={addLink}
                    className="rounded-lg bg-amber-700 text-white px-3 py-1.5">+ เพิ่มลิงก์</button>
          </div>
          <div className="mt-3 space-y-3">
            {form.links.map((a,i)=>(
              <div key={i} className="grid md:grid-cols-2 gap-3">
                <input placeholder="ป้ายกำกับ"
                       className="rounded-xl border border-amber-200 px-3 py-2"
                       value={a.label}
                       onChange={(e)=>updateArray('links', i, 'label', e.target.value)} />
                <div className="flex gap-2">
                  <input placeholder="URL"
                         className="flex-1 rounded-xl border border-amber-200 px-3 py-2"
                         value={a.url}
                         onChange={(e)=>updateArray('links', i, 'url', e.target.value)} />
                  <button className="rounded-lg bg-rose-600 text-white px-3"
                          onClick={()=>removeArray('links', i)}>ลบ</button>
                </div>
              </div>
            ))}
            {!form.links.length && <div className="text-sm text-amber-700">ยังไม่มีลิงก์</div>}
          </div>
        </div>

        <div className="flex justify-end">
          <button disabled={saving}
                  onClick={onSave}
                  className="rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-3 text-white font-semibold shadow-lg hover:opacity-90 disabled:opacity-60">
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
  );
}
