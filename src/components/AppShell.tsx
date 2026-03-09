import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Heart, BookOpen, TrendingUp, Settings } from "lucide-react";

const tabs = [
  { path: "/app", icon: Heart, label: "EI Mentor" },
  { path: "/app/journal", icon: BookOpen, label: "Journal" },
  { path: "/app/progress", icon: TrendingUp, label: "Progress" },
  { path: "/app/settings", icon: Settings, label: "Settings" },
];

const AppShell = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Hide bottom nav during active chat
  const isInChat = location.pathname.includes("/mentor/");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      {!isInChat && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border safe-bottom z-50">
          <div className="flex items-center justify-around max-w-lg mx-auto px-2 py-2">
            {tabs.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path || 
                (path !== "/app" && location.pathname.startsWith(path));
              const isMentorActive = path === "/app" && (location.pathname === "/app" || location.pathname.startsWith("/app/mentor"));
              const active = isActive || isMentorActive;

              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors ${
                    active
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                  <span className="text-[11px] font-medium">{label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
};

export default AppShell;
