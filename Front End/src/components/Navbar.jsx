import { NavLink } from "react-router-dom";

const base =
  "px-3 py-2 rounded-xl text-sm font-semibold transition ring-1 ring-transparent";
const inactive = "text-gray-700 hover:bg-gray-100 hover:ring-gray-200";
const active = "bg-gray-900 text-white ring-gray-900";

export default function Navbar() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        <div>
          <div className="text-xl font-bold text-gray-900">SprintPilotAI</div>

        </div>

        <nav className="flex gap-2 flex-wrap justify-end">
          <NavLink
            to="/fr03"
            className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
          >
            Sprint Plan Generator
          </NavLink>

          <NavLink
            to="/fr04"
            className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
          >
            Review and Approve Sprint 
          </NavLink>

          <NavLink
            to="/fr05"
            className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
          >
            Task Success Predictor
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
