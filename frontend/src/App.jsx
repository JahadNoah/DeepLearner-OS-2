import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { useTheme } from "./context/useTheme";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AudioInput from "./pages/AudioInput";
import Transcript from "./pages/Transcript";
import Summary from "./pages/Summary";
import Quiz from "./pages/Quiz";
import History from "./pages/History";
import Sidebar from "./components/Navbar";

function ProtectedRoute({ children, user }) {
  if (user === undefined) return <div className="loading-screen"><div className="spinner" /></div>;
  return user ? children : <Navigate to="/" replace />;
}

function TopBar({ user, onMenuClick }) {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const name = user?.displayName || user?.email?.split("@")[0] || "Pelajar";
  const initial = user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "P";

  const PAGE_TITLES = {
    "/app": "Papan Pemuka",
    "/input": "Input Kandungan",
    "/history": "Sejarah Nota",
  };
  const title = PAGE_TITLES[location.pathname] ?? "DeepLearner";

  return (
    <div className="main-topbar">
      <div className="topbar-left">
        <button className="topbar-menu-btn" onClick={onMenuClick} aria-label="Toggle menu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="topbar-title">{title}</span>
      </div>
      <div className="topbar-right">
        <button
          className="topbar-icon-btn"
          onClick={toggleTheme}
          title={`Tukar ke mod ${theme === "dark" ? "terang" : "gelap"}`}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
        <div className="topbar-user">
          <div className="topbar-user-info">
            <div className="topbar-user-name">{name}</div>
            <div className="topbar-user-email">{user?.email || ""}</div>
          </div>
          <div className="nav-avatar">{initial}</div>
        </div>
      </div>
    </div>
  );
}

function AppLayout({ user, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="app-layout">
      <Sidebar user={user} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div
        className={`sidebar-overlay${sidebarOpen ? " active" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />
      <div className="main-wrapper">
        <TopBar user={user} onMenuClick={() => setSidebarOpen(o => !o)} />
        <div className="main-content">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setUser((prev) => (prev === undefined ? null : prev));
    }, 4000);

    const unsub = onAuthStateChanged(auth, (u) => {
      clearTimeout(timeout);
      setUser(u || null);
    });

    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/app" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/app" /> : <Register />} />
        <Route path="/" element={
          user === undefined
            ? <div className="loading-screen"><div className="spinner" /></div>
            : user
              ? <Navigate to="/app" replace />
              : <Landing />
        } />
        <Route path="/app" element={
          <ProtectedRoute user={user}>
            <AppLayout user={user}><Dashboard /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/input" element={
          <ProtectedRoute user={user}>
            <AppLayout user={user}><AudioInput /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/transcript/:id" element={
          <ProtectedRoute user={user}>
            <AppLayout user={user}><Transcript /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/summary/:id" element={
          <ProtectedRoute user={user}>
            <AppLayout user={user}><Summary /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/quiz/:id" element={
          <ProtectedRoute user={user}>
            <AppLayout user={user}><Quiz /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute user={user}>
            <AppLayout user={user}><History /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
