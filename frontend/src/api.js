import axios from 'axios';

// ตรวจสอบว่าอยู่ในโหมด Production หรือไม่
const isProduction = import.meta.env.PROD;

// ดึงค่าจาก Env
let BACKEND_URL = import.meta.env.VITE_API_BASE_URL;

// ถ้าไม่มีค่าใน Env และอยู่ใน Production ให้แจ้งเตือน (หรือไม่ก็กำหนดค่า Hardcode ของ Railway ไปเลยเพื่อความชัวร์)
if (!BACKEND_URL && isProduction) {
  console.error("🚨 VITE_API_BASE_URL is missing in production environment!");
  // ใส่ URL ของ Railway ของคุณตรงนี้เป็น Backup plan
  BACKEND_URL = "https://back-mc-production-8046.up.railway.app"; 
}

// ถ้ายังไม่มีค่า (เช่น รัน Local) ให้ใช้ Localhost
if (!BACKEND_URL) {
  BACKEND_URL = "http://localhost:3000";
}

// ตัด / ท้ายออกเสมอเพื่อความชัวร์
BACKEND_URL = BACKEND_URL.trim().replace(/\/$/, "");

console.log("🔗 Connecting to Backend:", BACKEND_URL);

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`, 
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  }
});

export default Object.assign(api, { 
  BASE: BACKEND_URL, // ส่งออก BASE URL ที่ถูกต้อง
  withCreds: { 
    credentials: "include", 
    headers: { "Content-Type": "application/json" } 
  } 
});