// src/guards/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  // วิธีง่ายสุด: เช็คจาก localStorage flag หลัง login สำเร็จ
  // (ถ้ามี endpoint /auth/me ก็สามารถเรียกตรวจฝั่ง server ได้)
  const isAuthed = localStorage.getItem("mc_authed") === "1";
  return isAuthed ? children : <Navigate to="/login" replace />;
}
