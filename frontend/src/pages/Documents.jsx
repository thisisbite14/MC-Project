// src/pages/Documents.jsx  (หรือ path เดิมของคุณ)
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

const ENDPOINT = `${API.BASE}/api/files/upload`;
const LIST_EP = `${API.BASE}/api/files/list`;
const DELETE_EP = (filename) =>
  `${API.BASE}/api/files/${encodeURIComponent(filename)}`;

const bg = { backgroundColor: "#F7F3EB" };
const acceptMime = ["application/pdf"];
const acceptExt = [".pdf"];
const maxSize = 5 * 1024 * 1024;

export default function Documents() {
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // เลือกไฟล์ก่อน + ตั้งชื่อ
  const [selectedFile, setSelectedFile] = useState(null);
  const [docName, setDocName] = useState("");

  // auth
  const [authChecked, setAuthChecked] = useState(false);
  const [me, setMe] = useState(null);
  const isLoggedIn = !!me;
  const canManage = ["ผู้ดูแล", "กรรมการ"].includes(me?.role || "");

  const [deletingFile, setDeletingFile] = useState(null); // filename กำลังลบ
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const toast = (m) => {
    try { window.alert(m); } catch { /* noop */ }
  };

  /* ---------- Utils ---------- */
  const isPdf = (file) => {
    const mimeOk = acceptMime.includes((file.type || "").toLowerCase());
    const name = (file.name || "").toLowerCase();
    const extOk = acceptExt.some((ext) => name.endsWith(ext));
    return mimeOk || extOk;
  };

  const humanSize = (n = 0) =>
    n >= 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(2)} MB` : `${(n / 1024).toFixed(1)} KB`;

  const validateOne = (file) => {
    if (!file) return "กรุณาเลือกไฟล์";
    if (!isPdf(file)) return "หน้านี้อนุญาตเฉพาะไฟล์ PDF เท่านั้น";
    if (file.size > maxSize) return "ไฟล์ต้องไม่เกิน 5MB";
    return "";
  };

  /* ---------- Session check ---------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API.BASE}/api/auth/me`, { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        setMe(data?.user || null);
      } catch {
        setMe(null);
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []);

  /* ---------- Load list (after me ready) ---------- */
  useEffect(() => {
    if (!authChecked) return;
    // ถ้ายังไม่ล็อกอินก็แสดงหน้า login prompt (handled in render)
    if (!isLoggedIn) {
      setItems([]);
      setLoadingList(false);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setLoadingList(true);
        setError("");
        const res = await fetch(LIST_EP, { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.message || "โหลดรายการไฟล์ไม่สำเร็จ");
          setItems([]);
          return;
        }
        const list = Array.isArray(data.files) ? data.files : [];
        if (!mounted) return;
        setItems(
          list
            .filter(
              (f) =>
                (f.type && f.type.toLowerCase().includes("pdf")) ||
                (f.filename && f.filename.toLowerCase().endsWith(".pdf"))
            )
            .map((f) => ({
              url: f.url || `${API.BASE}${f.path || ""}`,
              name: f.filename || f.name || "unnamed.pdf",
              type: f.type || "application/pdf",
              size: f.size ?? 0,
            }))
        );
      } catch (e) {
        if (!mounted) return;
        setError("ไม่สามารถโหลดรายการไฟล์ได้");
        setItems([]);
      } finally {
        if (mounted) setLoadingList(false);
      }
    })();

    return () => (mounted = false);
  }, [authChecked, isLoggedIn]);

  /* ---------- Upload (XHR with progress, fallback to fetch if needed) ---------- */
  const sendFile = (file, nameOverride) =>
    new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append("file", file);
      if (nameOverride) fd.append("name", nameOverride);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", ENDPOINT, true);
      xhr.withCredentials = true;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded * 100) / e.total));
      };

      xhr.onload = async () => {
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = JSON.parse(xhr.responseText || "{}");
            return resolve(data);
          }
          // fallback: try fetch (some servers may reject XHR)
          const fd2 = new FormData();
          fd2.append("file", file);
          if (nameOverride) fd2.append("name", nameOverride);
          try {
            const r = await fetch(ENDPOINT, { method: "POST", body: fd2, credentials: "include" });
            const d = await r.json().catch(() => ({}));
            if (!r.ok) return reject(new Error(d.message || "อัปโหลดไม่สำเร็จ"));
            return resolve(d);
          } catch (er) {
            return reject(er);
          }
        } catch (err) {
          return reject(err);
        }
      };

      xhr.onerror = () => reject(new Error("Network error"));
      try {
        xhr.send(fd);
      } catch (e) {
        reject(e);
      }
    });

  const startUpload = async () => {
    if (!canManage) return setError("คุณไม่มีสิทธิ์อัปโหลดไฟล์");
    setError("");
    if (!selectedFile) return setError("กรุณาเลือกไฟล์ PDF ก่อน");
    const err = validateOne(selectedFile);
    if (err) return setError(err);
    if (!docName.trim()) return setError("กรุณาตั้งชื่อเอกสาร");

    try {
      setUploading(true);
      setProgress(0);
      const j = await sendFile(selectedFile, docName.trim());
      const url = j.url || `${API.BASE}${j.path || ""}`;
      const name = j.filename || `${docName.trim()}.pdf`;
      const t = (j.mimetype || selectedFile.type || "application/pdf").toLowerCase();

      // เพิ่มที่หัวรายการ
      setItems((prev) => [
        { url, name, type: t.includes("pdf") ? "application/pdf" : t, size: j.size ?? selectedFile.size },
        ...prev,
      ]);

      // ล้าง form
      setSelectedFile(null);
      setDocName("");
      setProgress(0);
      toast("เพิ่มเอกสารสำเร็จ");
    } catch (e) {
      setError(e?.message || "อัปโหลดไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  /* ---------- Delete ---------- */
  async function askDelete(name) {
    if (!canManage) return setError("คุณไม่มีสิทธิ์ลบไฟล์");
    if (!confirm(`ยืนยันลบไฟล์ “${name}” ?`)) return;
    try {
      setDeletingFile(name);
      setError("");
      const res = await fetch(DELETE_EP(name), { method: "DELETE", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "ลบไม่สำเร็จ");
      setItems((prev) => prev.filter((x) => x.name !== name));
      toast("ลบไฟล์สำเร็จ");
    } catch (e) {
      setError(e?.message || "ลบไฟล์ไม่สำเร็จ");
    } finally {
      setDeletingFile(null);
    }
  }

  /* ---------- Handlers ---------- */
  const pickFile = async (file) => {
    const err = validateOne(file);
    if (err) {
      setSelectedFile(null);
      setDocName("");
      setError(err);
      return;
    }
    setError("");
    setSelectedFile(file);
    const base = (file.name || "").replace(/\.pdf$/i, "");
    setDocName(base || "");
  };

  const onInputChange = async (e) => {
    const f = e.target.files?.[0];
    if (f) await pickFile(f);
    e.target.value = "";
  };

  const onDrop = useCallback(
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      if (!canManage) {
        setError("คุณไม่มีสิทธิ์อัปโหลดไฟล์");
        return;
      }
      const f = e.dataTransfer.files?.[0];
      if (f) await pickFile(f);
    },
    [canManage]
  );

  const handleCopy = async (url) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // fallback
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toast("คัดลอกลิงก์แล้ว");
    } catch {
      setError("ไม่สามารถคัดลอกลิงก์ได้");
    }
  };

  /* ---------- Guards ---------- */
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={bg}>
        <p className="text-amber-800">กำลังตรวจสอบสถานะผู้ใช้...</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4" style={bg}>
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl p-10 border border-amber-200 max-w-md">
          <h2 className="text-2xl font-bold text-amber-900 mb-3">กรุณาเข้าสู่ระบบก่อนเข้าดูเอกสาร</h2>
          <p className="text-amber-700 mb-6">เฉพาะสมาชิกที่เข้าสู่ระบบเท่านั้นจึงจะสามารถดูไฟล์ได้</p>
          <button onClick={() => navigate("/login")} className="rounded-full bg-amber-700 text-white px-6 py-2 font-semibold hover:bg-amber-800 transition">
            ไปหน้าล็อกอิน
          </button>
        </div>
      </div>
    );
  }

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen py-10 px-6" style={bg}>
      <div className="mx-auto max-w-4xl">
        {/* Uploader */}
        <div
          className={`relative rounded-2xl border-2 border-dashed p-8 bg-white/80 backdrop-blur shadow-xl transition-all ${dragOver ? "border-amber-500 bg-amber-50" : "border-amber-200"}`}
          onDragOver={(e) => { e.preventDefault(); if (!canManage) return; setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          {!canManage ? (
            <div className="text-center space-y-2">
              <p className="text-amber-900 font-semibold">ดูเอกสารได้เท่านั้น</p>
              <p className="text-amber-700 text-sm">เฉพาะ <b>ผู้ดูแล</b> และ <b>กรรมการ</b> จึงจะอัปโหลด/ลบไฟล์ได้</p>
            </div>
          ) : (
            <div className="space-y-5">
              {!selectedFile ? (
                <div className="text-center space-y-4">
                  <p className="text-amber-800">ลากไฟล์มาวางที่นี่ หรือ</p>
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => inputRef.current?.click()} className="rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-3 text-sm font-semibold text-white hover:opacity-90 shadow-lg">
                      เลือกไฟล์ (PDF)
                    </button>
                    <div className="text-sm text-amber-600">ไฟล์ที่รองรับ: .pdf | ขนาด ≤ 5MB</div>
                  </div>
                  <input ref={inputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={onInputChange} />
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-white/80 p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-amber-900 truncate">ไฟล์ที่เลือก: {selectedFile.name}</div>
                      <div className="text-xs text-amber-700">{selectedFile.type || "application/pdf"} · {humanSize(selectedFile.size)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setSelectedFile(null); setDocName(""); setError(""); }} className="rounded-lg border border-amber-300 bg-white/80 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50" disabled={uploading}>ล้างไฟล์</button>
                    </div>
                  </div>

                  <div className="mt-4 grid md:grid-cols-6 gap-3">
                    <label className="md:col-span-2 text-sm text-amber-800 flex items-center">ชื่อเอกสาร</label>
                    <input className="md:col-span-3 rounded-xl border border-amber-200 px-4 py-2 text-amber-900 outline-none focus:ring-2 focus:ring-amber-500" placeholder="เช่น ระเบียบชมรมปี 2568" value={docName} onChange={(e) => setDocName(e.target.value)} maxLength={120} disabled={uploading} />
                    <button onClick={startUpload} disabled={uploading || !docName.trim()} className={`md:col-span-1 rounded-xl px-4 py-2 font-semibold shadow-lg ${uploading || !docName.trim() ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-amber-700 text-white hover:bg-amber-800"}`}>
                      {uploading ? "กำลังเพิ่ม..." : "เพิ่มเอกสาร"}
                    </button>
                  </div>

                  {uploading && (
                    <div className="pt-4">
                      <div className="text-sm text-amber-800 mb-1">อัปโหลด... {progress}%</div>
                      <div className="w-full bg-amber-100 h-2 rounded-full overflow-hidden">
                        <div className="h-2 bg-amber-600" style={{ width: `${progress}%`, transition: "width .2s" }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>}
            </div>
          )}
        </div>

        {/* list */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {loadingList && <div className="col-span-full text-center text-amber-700">กำลังโหลดรายการไฟล์...</div>}

          {!loadingList && items.map((it) => (
            <div key={it.name} className="rounded-2xl bg-white/80 backdrop-blur border border-amber-200 shadow p-4 flex gap-4">
              <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden border border-amber-100 bg-amber-50 flex items-center justify-center">
                <span className="text-amber-800 text-sm">PDF</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-semibold text-amber-900 truncate">{it.name}</div>
                <div className="text-xs text-amber-700 mt-1">{it.type} · {humanSize(it.size)}</div>

                <div className="mt-2 flex gap-2">
                  <a href={it.url} target="_blank" rel="noreferrer" className="rounded-lg border border-amber-300 bg-white/80 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50">เปิดดู</a>

                  <button onClick={() => handleCopy(it.url)} className="rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-900">คัดลอกลิงก์</button>

                  {canManage && (
                    <button onClick={() => askDelete(it.name)} disabled={deletingFile === it.name} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700" title="ลบไฟล์นี้">
                      {deletingFile === it.name ? "กำลังลบ..." : "ลบ"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

        </div>

        {!loadingList && !items.length && <div className="mt-6 text-center text-amber-700">ยังไม่มีไฟล์ให้แสดง</div>}
      </div>
    </div>
  );
}
