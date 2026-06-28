// Admin dashboard shell — tab switcher + logout.
// Tabs are functional with minimal styling; the UI gets polished later.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../lib/api";
import "../styles/admin.css";
import ScheduleTab from "../components/admin/ScheduleTab";
import GalleryTab from "../components/admin/GalleryTab";
import TeamTab from "../components/admin/TeamTab";

const TABS = [
  { key: "schedule", label: "Schedule", Component: ScheduleTab },
  { key: "gallery", label: "Gallery", Component: GalleryTab },
  { key: "team", label: "Team", Component: TeamTab },
];

export default function AdminPage() {
  const navigate = useNavigate();
  const [active, setActive] = useState("schedule");

  function handleLogout() {
    logout();
    navigate("/admin/login");
  }

  const ActiveComponent = TABS.find((t) => t.key === active).Component;

  return (
    <main className="admin-page">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <button onClick={handleLogout}>Log Out</button>
      </header>

      <nav className="admin-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={active === tab.key ? "admin-tab-active" : ""}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <ActiveComponent />
    </main>
  );
}
