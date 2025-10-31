// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import HomeEditor from "./pages/admin/HomeEditor.jsx";
import Navbar    from "./components/Navbar.jsx";
import Home      from "./pages/Home.jsx";

// auth
import Login     from "./pages/auth/Login.jsx";
import Register  from "./pages/auth/Register.jsx";

// members (โฟลเดอร์: Member)
import Members   from "./pages/Member/Members.jsx";
import AddMember from "./pages/Member/AddMember.jsx";

// bands (โฟลเดอร์: Band)
import Bands      from "./pages/Band/Bands.jsx";
import BandDetail from "./pages/Band/BandDetail.jsx";
import BandEdit   from "./pages/Band/BandEdit.jsx"; // ให้ตรงกับไฟล์จริงของคุณ

// schedules (โฟลเดอร์: Schedule)
import Schedules   from "./pages/Schedule/Schedules.jsx";
import AddSchedule from "./pages/Schedule/AddSchedules.jsx";

// others
import Finances   from "./pages/Finance/Finances.jsx";
import Equipments from "./pages/Equipment/Equipments.jsx";
import Documents  from "./pages/Documents.jsx";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 max-w-6xl mx-auto">
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/members" element={<Members />} />
          <Route path="/members/add" element={<AddMember />} />

          <Route path="/bands" element={<Bands />} />
          <Route path="/bands/:id" element={<BandDetail />} />
          <Route path="/bands/:id/edit" element={<BandEdit />} />

          <Route path="/schedules" element={<Schedules />} />
          <Route path="/schedules/add" element={<AddSchedule />} />

          <Route path="/finances" element={<Finances />} />
          <Route path="/equipments" element={<Equipments />} />
          <Route path="/documents" element={<Documents />} />

          <Route path="/admin/home" element={<HomeEditor />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
