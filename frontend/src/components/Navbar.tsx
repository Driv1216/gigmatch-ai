import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { dashboardPathForRole } from "../lib/auth";

const navItems = [
  { label: "Login", to: "/login" },
  { label: "Signup", to: "/signup" },
];

export function Navbar() {
  const { role, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <header className="border-b border-line bg-white/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <NavLink to="/" className="text-base font-bold tracking-normal text-ink">
          GigMatch AI
        </NavLink>
        <div className="flex items-center gap-2">
          {role ? (
            <>
              <NavLink
                to={dashboardPathForRole(role)}
                className={({ isActive }) =>
                  [
                    "rounded-md px-3 py-2 text-sm font-medium capitalize transition",
                    isActive ? "bg-slate-100 text-ink" : "text-muted hover:bg-slate-50 hover:text-ink",
                  ].join(" ")
                }
              >
                {role} Dashboard
              </NavLink>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink transition hover:bg-slate-50"
              >
                Logout
              </button>
            </>
          ) : (
            navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "rounded-md px-3 py-2 text-sm font-medium transition",
                    isActive ? "bg-slate-100 text-ink" : "text-muted hover:bg-slate-50 hover:text-ink",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))
          )}
        </div>
      </nav>
    </header>
  );
}
