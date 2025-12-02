import axios from 'axios';

// 1. ดึง URL หลัก (เช่น https://back-mc...app)
const BACKEND_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000").trim();

// 2. ตั้งค่า Axios (อันนี้เก็บ /api ไว้ได้ ถ้าคุณใช้ api.get('/auth/...') ในอนาคต)
const api = axios.create({
  baseURL: `${BACKEND_URL}/api`, 
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  }
});

// 3. Export
export default Object.assign(api, { 
  // 🚨 แก้ไขตรงนี้: ลบ /api ออก! 
  // เพื่อให้เวลาหน้าเว็บเอาไปใช้เป็น `${API.BASE}/api/auth/...` แล้ว path ไม่เบิ้ล
  BASE: BACKEND_URL, 
  
  withCreds: { 
    credentials: "include", 
    headers: { "Content-Type": "application/json" } 
  } 
});