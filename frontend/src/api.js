// src/api.js
// ถ้ามี VITE_API_BASE ให้ใช้; ถ้าไม่มีก็ใช้ path relative ("")
const RAW_BASE = (import.meta.env.VITE_API_BASE ?? "").trim();
// ถ้า set เป็น "http://localhost:3000" จะกลายเป็น cross-origin (คุกกี้ไม่ถูกส่ง)
const API_BASE = RAW_BASE || ""; // => เรียก /api/... ตรง ๆ

export default {
  BASE: API_BASE,
  withCreds: {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  },
};
