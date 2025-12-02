import axios from 'axios';

// 1. ใช้ชื่อ VITE_API_BASE_URL ให้ตรงกับใน Vercel เป๊ะๆ
const BACKEND_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:3000").trim();

// 2. สร้าง axios instance (วิธีนี้ดีกว่า fetch เพราะจัดการ cookie/credentails ให้อัตโนมัติ)
const api = axios.create({
  baseURL: `${BACKEND_URL}/api`, // เติม /api ต่อท้ายให้เลย
  withCredentials: true,         // สำคัญมาก! ส่ง Cookie/Session ไปด้วย
  headers: {
    "Content-Type": "application/json",
  }
});

// 3. export default ออกไป
// แถมตัวแปร BASE เผื่อโค้ดเก่าเรียกใช้ (แต่แนะนำให้เปลี่ยนไปใช้ api.get/post แทน)
export default Object.assign(api, { 
  BASE: `${BACKEND_URL}/api`, 
  withCreds: { 
    credentials: "include", 
    headers: { "Content-Type": "application/json" } 
  } 
});