import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useLanguage } from "../context/useLanguage";
import { t } from "../i18n/translations";
import {
  Plus, History, Clock, BookOpen, Brain,
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
    { icon: <Mic size={20} />, title: t(lang, "dashboard.f1Title"), desc: t(lang, "dashboard.chip1Sub"), path: "/input", color: "#6C63FF" },
    { icon: <FileText size={20} />, title: t(lang, "dashboard.f2Title"), desc: t(lang, "dashboard.f2Desc").slice(0, 30) + "…", path: "/input", color: "#43E8D8" },
    { icon: <Sparkles size={20} />, title: t(lang, "dashboard.f3Title"), desc: t(lang, "dashboard.chip2Sub"), path: "/input", color: "#FF6584" },
    { icon: <HelpCircle size={20} />, title: t(lang, "dashboard.f4Title"), desc: t(lang, "dashboard.chip3Sub"), path: "/input", color: "#FFB74D" },
    { icon: <History size={20} />, title: t(lang, "dashboard.f5Title"), desc: t(lang, "dashboard.f5Desc").slice(0, 30) + "…", path: "/history", color: "#4CAF75" },
  ];

  return (
    <div className="proto-content" style={{ display: "flex", gap: "24px" }}>
      {/* ═══ Main Column ═══ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Search Bar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "var(--proto-surface)",
          border: "1px solid var(--proto-border)",
          borderRadius: "12px",
          padding: "10px 16px",
          backdropFilter: "var(--proto-glass-blur)",
        }}>
          <Search size={16} style={{ color: "var(--proto-text-2)" }} />
          <input
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
              color: "var(--proto-text)",
            }}
          />
          <span style={{ fontSize: "11px", color: "var(--proto-text-2)", background: "var(--proto-surface2)", padding: "2px 8px", borderRadius: "4px" }}>⌘K</span>
        </div>

        {/* Welcome Card */}
        <div className="proto-card" style={{ background: "var(--amber)", borderColor: "var(--amber)" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.1em", opacity: 0.8, marginBottom: "8px" }}>
            ✦ DEEPLEARNER OS
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, fontFamily: "var(--proto-font)", marginBottom: "8px" }}>
            {t(lang, "dashboard.welcome", { name })}
          </h1>
          <p style={{ fontSize: "13px", opacity: 0.9, marginBottom: "20px", maxWidth: "400px", lineHeight: 1.6 }}>
            {t(lang, "dashboard.subtitle")}
          </p>
          <div style={{ display: "flex", gap: "12px" }}>
            <Link to="/input" className="proto-btn" style={{ background: "rgba(255,255,255,0.2)", color: "#fff", textDecoration: "none" }}>
              <Plus size={16} /> {lang === "ms" ? "Sesi Baharu" : "New Session"}
            </Link>
            <Link to="/history" className="proto-btn-ghost" style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none" }}>
              <History size={16} /> {lang === "ms" ? "Sejarah" : "History"}
            </Link>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          <div className="proto-card" style={{ textAlign: "center", padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "8px" }}>
              <BookOpen size={16} style={{ color: "#6C63FF" }} />
              <span style={{ fontSize: "11px", color: "var(--proto-text-2)", fontWeight: 500 }}>{lang === "ms" ? "Nota Disimpan" : "Saved Notes"}</span>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--proto-text)", fontFamily: "var(--proto-font)" }}>
              {statsLoading ? "..." : totalNotes}
            </div>
          </div>
          <div className="proto-card" style={{ textAlign: "center", padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "8px" }}>
              <Brain size={16} style={{ color: "var(--amber)" }} />
              <span style={{ fontSize: "11px", color: "var(--proto-text-2)", fontWeight: 500 }}>{lang === "ms" ? "Kuiz Selesai" : "Quizzes Done"}</span>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--proto-text)", fontFamily: "var(--proto-font)" }}>
              {statsLoading ? "..." : totalQuizzes}
            </div>
          </div>
          <div className="proto-card" style={{ textAlign: "center", padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "8px" }}>
              <Clock size={16} style={{ color: "#FF6584" }} />
              <span style={{ fontSize: "11px", color: "var(--proto-text-2)", fontWeight: 500 }}>{lang === "ms" ? "Sesi Hari Ini" : "Today's Sessions"}</span>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--proto-text)", fontFamily: "var(--proto-font)" }}>
              {todayCount}
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--proto-text)", marginBottom: "4px" }}>
            {t(lang, "dashboard.featuresHeading")}
          </div>
          <div style={{ fontSize: "12px", color: "var(--proto-text-2)", marginBottom: "16px" }}>
            {t(lang, "dashboard.featuresSubtitle")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" }}>
            {features.map((f) => (
              <div
                key={f.title}
                className="proto-card"
                onClick={() => navigate(f.path)}
                style={{ cursor: "pointer", padding: "16px", textAlign: "center", transition: "all var(--proto-transition)" }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = f.color}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--proto-border)"}
              >
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  background: `${f.color}20`,
                  color: f.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 10px",
                }}>
                  {f.icon}
                </div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--proto-text)", marginBottom: "4px" }}>{f.title}</div>
                <div style={{ fontSize: "10px", color: "var(--proto-text-2)" }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sessions */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
            <Clock size={14} style={{ color: "var(--proto-text-2)" }} />
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--proto-text)" }}>
              {lang === "ms" ? "Sesi Terkini" : "Recent Sessions"}
            </span>
          </div>

          {histLoading ? (
            <div className="proto-card" style={{ padding: "24px", textAlign: "center" }}>
              <div className="spinner" style={{ margin: "0 auto" }} />
            </div>
          ) : recentNotes.length === 0 ? (
            <div className="proto-card" style={{ padding: "24px", textAlign: "center" }}>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>📭</div>
              <div style={{ fontSize: "13px", color: "var(--proto-text-2)", marginBottom: "12px" }}>
                {lang === "ms" ? "Belum ada sesi disimpan." : "No saved sessions yet."}
              </div>
              <Link to="/input" style={{ fontSize: "12px", color: "var(--amber)" }}>
                {lang === "ms" ? "Mulakan sekarang →" : "Start now →"}
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {recentNotes.map((note) => (
                <Link
                  key={note.id}
                  to={`/summary/${note.idRingkasan}`}
                  className="proto-card"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 16px",
                    textDecoration: "none",
                    transition: "all var(--proto-transition)",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>📄</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--proto-text)" }}>
                      {note.tajuk || (lang === "ms" ? "Nota Tanpa Tajuk" : "Untitled Note")}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--proto-text-2)" }}>
                      {formatDate(note.tarikhSimpan, lang)}
                    </div>
                  </div>
                  <ChevronRight size={14} style={{ color: "var(--proto-text-2)" }} />
                </Link>
              ))}
              <Link to="/history" style={{ fontSize: "12px", color: "var(--amber)", textAlign: "right", marginTop: "4px" }}>
                {lang === "ms" ? "Lihat semua →" : "See all →"}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Right Stats Sidebar ═══ */}
      <div style={{ width: "240px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* Nota Disimpan Card */}
        <div className="proto-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--proto-text-2)", marginBottom: "12px", fontWeight: 500 }}>
            {lang === "ms" ? "NOTA DISIMPAN" : "SAVED NOTES"}
          </div>
          <div style={{ fontSize: "48px", fontWeight: 800, color: "var(--proto-text)", fontFamily: "var(--proto-font)" }}>
            {statsLoading ? "..." : totalNotes}
          </div>
        </div>

        {/* Kuiz Selesai Card - Amber */}
        <div className="proto-card" style={{ textAlign: "center", background: "var(--amber)", borderColor: "var(--amber)" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.1em", color: "rgba(255,255,255,0.8)", marginBottom: "12px", fontWeight: 500 }}>
            {lang === "ms" ? "KUIZ SELESAI" : "QUIZZES DONE"}
          </div>
          <div style={{ fontSize: "48px", fontWeight: 800, fontFamily: "var(--proto-font)", color: "#fff" }}>
            {statsLoading ? "..." : totalQuizzes}
          </div>
        </div>

        {/* Sesi Hari Ini Card */}
        <div className="proto-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--proto-text-2)", marginBottom: "12px", fontWeight: 500 }}>
            {lang === "ms" ? "SESI HARI INI" : "TODAY'S SESSIONS"}
          </div>
          <div style={{ fontSize: "48px", fontWeight: 800, color: "var(--proto-text)", fontFamily: "var(--proto-font)" }}>
            {todayCount}
          </div>
        </div>

        {/* Continue Last Session Card */}
        {lastSession && (
          <div className="proto-card" style={{ background: "var(--proto-surface2)", borderColor: "var(--proto-border)" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--proto-text-2)", marginBottom: "8px", fontWeight: 500 }}>
              {lang === "ms" ? "TERUSKAN SESI" : "CONTINUE SESSION"}
            </div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--proto-text)", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {lastSession.tajuk || (lang === "ms" ? "Nota Tanpa Tajuk" : "Untitled Note")}
            </div>
            <div style={{ fontSize: "11px", color: "var(--proto-text-2)", marginBottom: "12px" }}>
              {formatDate(lastSession.tarikhSimpan, lang)}
            </div>
            <Link
              to={`/summary/${lastSession.idRingkasan}`}
              className="proto-btn-outline"
              style={{ textDecoration: "none", width: "100%", justifyContent: "center", fontSize: "12px" }}
            >
              {lang === "ms" ? "Teruskan →" : "Continue →"}
            </Link>
          </div>
        )}

        {/* Tip Belajar Card */}
        <div className="proto-card" style={{ background: "var(--proto-surface2)" }}>
          <div style={{ fontSize: "20px", marginBottom: "8px" }}>💡</div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--proto-text)", marginBottom: "8px" }}>
            {lang === "ms" ? "Tip Belajar" : "Study Tip"}
          </div>
          <p style={{ fontSize: "12px", color: "var(--proto-text-2)", lineHeight: 1.6 }}>
            {lang === "ms"
              ? <>Gunakan <strong style={{ color: "var(--proto-text)" }}>"Ringkasan Automatik"</strong> selepas merakam kuliah untuk mendapatkan poin utama dengan pantas.</>
              : <>Use <strong style={{ color: "var(--proto-text)" }}>"Auto Summary"</strong> after recording a lecture to instantly extract key points.</>
            }
          </p>
        </div>

        {/* CTA Button */}
        <button
          className="proto-btn-primary"
          onClick={() => navigate("/input")}
          style={{ width: "100%", justifyContent: "center", padding: "14px" }}
        >
          <Plus size={16} /> {lang === "ms" ? "Sesi Baharu" : "New Session"}
        </button>
      </div>
    </div>
  );
}
