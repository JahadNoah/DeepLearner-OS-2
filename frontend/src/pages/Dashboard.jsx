import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useLanguage } from "../context/useLanguage";
import { t } from "../i18n/translations";
import {
  Plus, History, Clock,
  Search, Mic, FileText, Sparkles, HelpCircle, ChevronRight
} from "lucide-react";

function formatDate(ts, lang) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString(lang === "ms" ? "ms-MY" : "en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function Dashboard() {
  const user = auth.currentUser;
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const name = user?.displayName?.split(" ")[0] || (lang === "ms" ? "Pelajar" : "Student");
  const noMatrik = user?.email?.split("@")[0] || "";

  const [statsLoading, setStatsLoading] = useState(true);
  const [histLoading, setHistLoading] = useState(true);
  const [totalNotes, setTotalNotes] = useState(0);
  const [totalQuizzes, setTotalQuizzes] = useState(0);
  const [recentNotes, setRecentNotes] = useState([]);
  const [lastSession, setLastSession] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef(null);

  // ⌘K / Ctrl+K focuses the search box
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Fetch stats
  useEffect(() => {
    if (!noMatrik) { setStatsLoading(false); return; }
    const go = async () => {
      try {
        const notaQ = query(collection(db, "nota"), where("noMatrik", "==", noMatrik));
        const kuizQ = query(collection(db, "kuiz"), where("noMatrik", "==", noMatrik));
        const [notaSnap, kuizSnap] = await Promise.all([getDocs(notaQ), getDocs(kuizQ)]);
        setTotalNotes(notaSnap.size);
        setTotalQuizzes(kuizSnap.size);
      } catch (e) { console.error(e); }
      finally { setStatsLoading(false); }
    };
    go();
  }, [noMatrik]);

  // Fetch recent notes
  useEffect(() => {
    if (!noMatrik) { setHistLoading(false); return; }
    const go = async () => {
      try {
        const q = query(collection(db, "nota"), where("noMatrik", "==", noMatrik));
        const snap = await getDocs(q);
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        items.sort((a, b) => {
          const ta = a.tarikhSimpan?.toDate?.() ?? new Date(a.tarikhSimpan ?? 0);
          const tb = b.tarikhSimpan?.toDate?.() ?? new Date(b.tarikhSimpan ?? 0);
          return tb - ta;
        });
        setRecentNotes(items.slice(0, 5));
        if (items.length > 0) setLastSession(items[0]);
      } catch (e) { console.error(e); }
      finally { setHistLoading(false); }
    };
    go();
  }, [noMatrik]);

  const todayCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return recentNotes.filter(n => {
      const d = n.tarikhSimpan?.toDate?.() ?? new Date(n.tarikhSimpan ?? 0);
      return d >= today;
    }).length;
  }, [recentNotes]);

  const handleSearch = (e) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      navigate(`/history?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const features = [
    { icon: <Mic size={20} />, title: t(lang, "dashboard.f1Title"), desc: t(lang, "dashboard.chip1Sub"), path: "/input" },
    { icon: <FileText size={20} />, title: t(lang, "dashboard.f2Title"), desc: t(lang, "dashboard.f2Sub"), path: "/input" },
    { icon: <Sparkles size={20} />, title: t(lang, "dashboard.f3Title"), desc: t(lang, "dashboard.chip2Sub"), path: "/input" },
    { icon: <HelpCircle size={20} />, title: t(lang, "dashboard.f4Title"), desc: t(lang, "dashboard.chip3Sub"), path: "/input" },
    { icon: <History size={20} />, title: t(lang, "dashboard.f5Title"), desc: t(lang, "dashboard.f5Sub"), path: "/history" },
  ];

  return (
    <div className="proto-content" style={{ display: "flex", gap: "24px" }}>
      {/* ═══ Main Column ═══ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Search Bar */}
        <div
          className="clay-input"
          style={{ display: "flex", alignItems: "center", gap: "10px" }}
        >
          <Search size={16} style={{ color: "var(--clay-text-sub)" }} />
          <input
            ref={searchRef}
            type="text"
            placeholder={lang === "ms" ? "Cari nota..." : "Search notes..."}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: "13px",
              color: "var(--clay-text)",
              fontFamily: "var(--clay-font-body)",
            }}
          />
          <span className="clay-badge">⌘K</span>
        </div>

        {/* Welcome Card */}
        <div
          className="clay-card"
          style={{ background: "var(--clay-primary-deep)", color: "#FFFFFF" }}
        >
          <div style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--clay-on-primary-muted)", marginBottom: "8px" }}>
            ✦ DEEPLEARNER OS
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, fontFamily: "var(--clay-font-head)", marginBottom: "8px", color: "#FFFFFF" }}>
            {t(lang, "dashboard.welcome", { name })}
          </h1>
          <p style={{ fontSize: "13px", color: "var(--clay-on-primary-muted)", marginBottom: "20px", maxWidth: "400px", lineHeight: 1.6 }}>
            {t(lang, "dashboard.subtitle")}
          </p>
          <div style={{ display: "flex", gap: "12px" }}>
            <Link to="/input" className="clay-btn" style={{ background: "#FFFFFF", color: "var(--clay-primary-deep)" }}>
              <Plus size={16} /> {lang === "ms" ? "Sesi Baharu" : "New Session"}
            </Link>
            <Link to="/history" className="clay-btn" style={{ color: "#FFFFFF", background: "transparent", border: "1px solid rgba(255,255,255,0.4)" }}>
              <History size={16} /> {lang === "ms" ? "Sejarah" : "History"}
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--clay-text)", fontFamily: "var(--clay-font-head)", margin: "0 0 4px" }}>
            {t(lang, "dashboard.featuresHeading")}
          </h2>
          <div style={{ fontSize: "12px", color: "var(--clay-text-sub)", marginBottom: "16px" }}>
            {t(lang, "dashboard.featuresSubtitle")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" }}>
            {features.map((f) => (
              <Link
                key={f.title}
                to={f.path}
                className="clay-card"
                style={{ padding: "16px", textAlign: "center", color: "var(--clay-text)" }}
              >
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: "var(--clay-accent)",
                  color: "var(--clay-on-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 10px",
                }}>
                  {f.icon}
                </div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--clay-text)", marginBottom: "4px" }}>{f.title}</div>
                <div style={{ fontSize: "10px", color: "var(--clay-text-sub)" }}>{f.desc}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Sessions */}
        <div>
          <h2 style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px", fontSize: "12px", fontWeight: 600, color: "var(--clay-text)", fontFamily: "var(--clay-font-head)" }}>
            <Clock size={14} style={{ color: "var(--clay-text-sub)" }} />
            {lang === "ms" ? "Sesi Terkini" : "Recent Sessions"}
          </h2>

          {histLoading ? (
            <div className="clay-card" style={{ padding: "24px", textAlign: "center" }}>
              <div className="spinner" style={{ margin: "0 auto" }} />
            </div>
          ) : recentNotes.length === 0 ? (
            <div className="clay-card" style={{ padding: "24px", textAlign: "center" }}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>📭</div>
              <div style={{ fontSize: "13px", color: "var(--clay-text-sub)", marginBottom: "12px" }}>
                {lang === "ms" ? "Belum ada sesi disimpan." : "No saved sessions yet."}
              </div>
              <Link to="/input" style={{ fontSize: "12px", color: "var(--clay-link)", fontWeight: 600 }}>
                {lang === "ms" ? "Mulakan sekarang →" : "Start now →"}
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {recentNotes.map((note) => (
                <Link
                  key={note.id}
                  to={`/summary/${note.idRingkasan}`}
                  className="clay-card"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 16px",
                    color: "var(--clay-text)",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>📄</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--clay-text)" }}>
                      {note.tajuk || (lang === "ms" ? "Nota Tanpa Tajuk" : "Untitled Note")}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--clay-text-sub)" }}>
                      {formatDate(note.tarikhSimpan, lang)}
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color: "var(--clay-text-sub)" }} />
                </Link>
              ))}
              <Link to="/history" style={{ fontSize: "12px", color: "var(--clay-link)", textAlign: "right", marginTop: "4px", fontWeight: 600 }}>
                {lang === "ms" ? "Lihat semua →" : "See all →"}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Right Stats Sidebar ═══ */}
      <div style={{ width: "240px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Nota Disimpan Card */}
        <div className="clay-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--clay-text-sub)", marginBottom: "12px", fontWeight: 500 }}>
            {lang === "ms" ? "NOTA DISIMPAN" : "SAVED NOTES"}
          </div>
          <div style={{ fontSize: "48px", fontWeight: 800, color: "var(--clay-text)", fontFamily: "var(--clay-font-head)" }}>
            {statsLoading ? "..." : totalNotes}
          </div>
        </div>

        {/* Kuiz Selesai Card */}
        <div className="clay-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--clay-text-sub)", marginBottom: "12px", fontWeight: 500 }}>
            {lang === "ms" ? "KUIZ SELESAI" : "QUIZZES DONE"}
          </div>
          <div style={{ fontSize: "48px", fontWeight: 800, fontFamily: "var(--clay-font-head)", color: "var(--clay-link)" }}>
            {statsLoading ? "..." : totalQuizzes}
          </div>
        </div>

        {/* Sesi Hari Ini Card */}
        <div className="clay-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--clay-text-sub)", marginBottom: "12px", fontWeight: 500 }}>
            {lang === "ms" ? "SESI HARI INI" : "TODAY'S SESSIONS"}
          </div>
          <div style={{ fontSize: "48px", fontWeight: 800, color: "var(--clay-text)", fontFamily: "var(--clay-font-head)" }}>
            {todayCount}
          </div>
        </div>

        {/* Continue Last Session Card */}
        {lastSession && (
          <div className="clay-card">
            <div style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--clay-text-sub)", marginBottom: "8px", fontWeight: 500 }}>
              {lang === "ms" ? "TERUSKAN SESI" : "CONTINUE SESSION"}
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--clay-text)", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {lastSession.tajuk || (lang === "ms" ? "Nota Tanpa Tajuk" : "Untitled Note")}
            </div>
            <div style={{ fontSize: "11px", color: "var(--clay-text-sub)", marginBottom: "12px" }}>
              {formatDate(lastSession.tarikhSimpan, lang)}
            </div>
            <Link
              to={`/summary/${lastSession.idRingkasan}`}
              className="clay-btn clay-btn-primary"
              style={{ width: "100%", fontSize: "12px" }}
            >
              {lang === "ms" ? "Teruskan →" : "Continue →"}
            </Link>
          </div>
        )}

        {/* Tip Belajar Card */}
        <div className="clay-card">
          <div style={{ fontSize: "20px", marginBottom: "8px" }}>💡</div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--clay-text)", marginBottom: "8px", fontFamily: "var(--clay-font-head)" }}>
            {lang === "ms" ? "Tip Belajar" : "Study Tip"}
          </div>
          <p style={{ fontSize: "12px", color: "var(--clay-text-sub)", lineHeight: 1.6 }}>
            {lang === "ms"
              ? <>Gunakan <strong style={{ color: "var(--clay-text)" }}>"Ringkasan Automatik"</strong> selepas merakam kuliah untuk mendapatkan poin utama dengan pantas.</>
              : <>Use <strong style={{ color: "var(--clay-text)" }}>"Auto Summary"</strong> after recording a lecture to instantly extract key points.</>
            }
          </p>
        </div>
      </div>
    </div>
  );
}
