// src/api.js
import axios from 'axios';

// 1. ต้องใช้ชื่อตัวแปร VITE_API_BASE_URL ให้ตรงกับที่ตั้งใน Vercel
const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export default {
  BASE: BACKEND_URL, // ส่งค่า URL ที่ถูกต้องออกไป
  withCreds: {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  },
};