import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { BackgroundLayer } from "./components/ui/BackgroundLayer";
import { Sidebar } from "./components/ui/Sidebar";

const Landing = lazy(() => import("./pages/Landing"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const InputPage = lazy(() => import("./pages/InputPage"));
const Transcript = lazy(() => import("./pages/Transcript"));
const Summary = lazy(() => import("./pages/Summary"));
const Quiz = lazy(() => import("./pages/Quiz"));
const History = lazy(() => import("./pages/History"));
const Flashcards = lazy(() => import("./pages/Flashcards"));
const FlashcardReview = lazy(() => import("./pages/FlashcardReview"));

function ProtectedRoute({ children, user }) {
  if (user === undefined) return <div className="loading-screen"><div className="spinner" /></div>;
  return user ? children : <Navigate to="/" replace />;
}

function getActiveItem(pathname) {
  if (pathname === "/app") return "dashboard";
  if (pathname === "/input") return "new-session";
  if (pathname === "/history") return "history";
  if (pathname.startsWith("/flashcards")) return "flashcards";
  if (pathname.startsWith("/transcript")) return "new-session";
  if (pathname.startsWith("/summary")) return "new-session";
  if (pathname.startsWith("/quiz")) return "new-session";
  return "dashboard";
}

function AppLayout({ user, children }) {
  const location = useLocation();
  const activeItem = getActiveItem(location.pathname);

  return (
    <div className="proto-layout">
      {/* Background */}
      <BackgroundLayer />

      {/* Sidebar Navigation */}
      <Sidebar user={user} activeItem={activeItem} />

      {/* Main Content */}
      <main className="proto-main">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    // Guard against Firebase never initialising (keeps us off an infinite
    // spinner). Generous so it does NOT fire during normal auth restore —
    // a 1s value used to force-logout slow-but-valid sessions, which flashed
    // the Landing page before snapping back to the dashboard.
    const timeout = setTimeout(() => {
      setUser((prev) => (prev === undefined ? null : prev));
    }, 5000);

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
      <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
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
            <AppLayout user={user}><InputPage /></AppLayout>
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
        <Route path="/flashcards" element={
          <ProtectedRoute user={user}>
            <AppLayout user={user}><Flashcards /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="/flashcards/:id/review" element={
          <ProtectedRoute user={user}>
            <AppLayout user={user}><FlashcardReview /></AppLayout>
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
