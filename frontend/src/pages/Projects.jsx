import { useEffect, useState } from "react";
import API from "../api";

export default function Projects() {
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    API.get("/projects").then((res) => setProjects(res.data || []));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">โครงการ</h1>
      <div className="space-y-4">
        {projects.map((p) => (
          <div key={p.id} className="bg-white p-4 shadow rounded">
            <p className="font-bold">{p.name}</p>
            <p className="text-sm text-gray-600">{p.start_date} - {p.end_date}</p>
            <p className="text-sm">งบประมาณ: ฿{p.budget}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
