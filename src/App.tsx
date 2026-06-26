import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import type { User } from "./types";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import InvoicesPage from "./pages/InvoicesPage";
import ProposalsPage from "./pages/ProposalsPage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { LayoutDashboard, FileText, Sparkles, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

function App() {
  const [googleClientId, setGoogleClientId] = useState("");
  const [user, setUser] = useState<User | null>(() => {
    const token = localStorage.getItem("token");
    const saved = localStorage.getItem("user");
    if (token && saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });

  useEffect(() => {
    fetch("/api/config")
      .then(r => r.json())
      .then(d => setGoogleClientId(d.google_client_id || ""))
      .catch(() => {});
  }, []);

  const handleLogin = (loggedUser: User, token: string) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(loggedUser));
    setUser(loggedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  if (!googleClientId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <GoogleOAuthProvider clientId={googleClientId}>
        <LoginPage onLogin={handleLogin} />
        <Toaster />
      </GoogleOAuthProvider>
    );
  }

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/invoices", icon: FileText, label: "Invoices" },
    { to: "/proposals", icon: Sparkles, label: "Proposals" },
  ];

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <BrowserRouter>
        <div className="min-h-screen flex bg-background">
          {/* Sidebar */}
          <aside className="w-56 flex-shrink-0 bg-card border-r border-border flex flex-col">
            {/* Logo */}
            <div className="p-5 border-b border-border">
              <span className="text-lg font-bold text-foreground">⚡ InvoiceAI</span>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-3 space-y-1">
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </nav>

            {/* User + Logout */}
            <div className="p-3 border-t border-border">
              <div className="flex items-center gap-2 px-2 mb-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.picture} alt={user.name} />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground hover:text-foreground"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/proposals" element={<ProposalsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
      <Toaster />
    </GoogleOAuthProvider>
  );
}

export default App;
