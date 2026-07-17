import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { useLanguage } from "../context/useLanguage";
import { t } from "../i18n/translations";
import { BookOpen, Clock, List, HelpCircle, ArrowLeft, RefreshCw } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://deeplearner.onrender.com/api" : "/api");

const TABS = [
  { id: "guide", labelKey: "study.tabGuide", icon: BookOpen },
  { id: "timeline", labelKey: "study.tabTimeline", icon: Clock },
  { id: "glossary", labelKey: "study.tabGlossary", icon: List },
  { id: "faq", labelKey: "study.tabFaq", icon: HelpCircle },
];

export default function StudyPack() {
  const { id } = useParams(); // IDtranskripsi
  const location = useLocation();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const noMatrik = auth.currentUser?.email?.split("@")[0] || "";
  const cacheId = `${noMatrik}_${id}`;

  const [active, setActive] = useState("guide");
  const [content, setContent] = useState({}); // { guide, timeline, glossary, faq }
  const [loading, setLoading] = useState({}); // per-type booleans
  const [error, setError] = useState({});     // per-type strings
  const [tajuk, setTajuk] = useState(location.state?.tajuk || "");
  const [hydrated, setHydrated] = useState(false);

  // Load cached artifacts + lecture title
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, "bahanBelajar", cacheId));
        if (!cancelled && snap.exists()) {
          const d = snap.data();
          setContent({ guide: d.guide, timeline: d.timeline, glossary: d.glossary, faq: d.faq });
        }
      } catch (e) { console.error(e); }
      if (!location.state?.tajuk) {
        try {
          const tx = await getDoc(doc(db, "transkripsi", id));
          if (!cancelled && tx.exists()) setTajuk(tx.data().tajuk || "");
        } catch (e) { console.error(e); }
      }
      if (!cancelled) setHydrated(true);
    };
    load();
    return () => { cancelled = true; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const generate = async (type) => {
    setError((e) => ({ ...e, [type]: "" }));
    setLoading((l) => ({ ...l, [type]: true }));
    try {
      const res = await axios.post(`${API_URL}/study`, { IDtranskripsi: id, noMatrik, type });
      const value = res.data.content;
      setContent((c) => ({ ...c, [type]: value }));
      // Cache to Firestore (merge so other artifacts are preserved)
      setDoc(
        doc(db, "bahanBelajar", cacheId),
        { noMatrik, IDtranskripsi: id, [type]: value, tarikhKemaskini: serverTimestamp() },
        { merge: true }
      ).catch((e) => console.error(e));
    } catch (err) {
      setError((e) => ({ ...e, [type]: t(lang, "study.error") }));
    } finally {
      setLoading((l) => ({ ...l, [type]: false }));
    }
  };

  // Auto-generate the active tab on first view once hydrated
  useEffect(() => {
    if (!hydrated) return;
    if (content[active] === undefined && !loading[active] && !error[active]) {
      generate(active);
    }
  }, [active, hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderContent = () => {
    if (loading[active]) {
      return (
        <div className="proto-card" style={{ padding: "48px", textAlign: "center" }}>
          <div className="spinner" style={{ margin: "0 auto 16px" }} />
          <p style={{ color: "var(--proto-text-2)", fontSize: "13px" }}>{t(lang, "study.generating")}</p>
        </div>
      );
    }
    if (error[active]) {
      return (
        <div className="proto-card" style={{ padding: "40px", textAlign: "center" }}>
          <p style={{ color: "var(--clay-text)", marginBottom: "16px", fontSize: "14px" }}>{error[active]}</p>
          <button className="proto-btn proto-btn-primary" onClick={() => generate(active)}>
            <RefreshCw size={14} /> {t(lang, "study.retry")}
          </button>
        </div>
      );
    }
    const data = content[active];
    if (data === undefined) return null;

    if (active === "guide") {
      return (
        <div className="proto-card" style={{ padding: "28px 32px" }}>
          <div className="chat-markdown"><ReactMarkdown>{data || ""}</ReactMarkdown></div>
        </div>
      );
    }

    if (active === "timeline") {
      if (!data || data.length === 0) return <EmptyState text={t(lang, "study.emptyTimeline")} />;
      return (
        <div className="study-timeline">
          {data.map((ev, i) => (
            <div key={i} className="study-timeline-item">
              <div className="study-timeline-dot" />
              <div className="study-timeline-body">
                {ev.tempoh && <span className="study-timeline-period">{ev.tempoh}</span>}
                <div className="study-timeline-title">{ev.tajuk}</div>
                {ev.keterangan && <div className="study-timeline-desc">{ev.keterangan}</div>}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (active === "glossary") {
      if (!data || data.length === 0) return <EmptyState text={t(lang, "study.emptyGlossary")} />;
      return (
        <div className="study-glossary">
          {data.map((g, i) => (
            <div key={i} className="study-term">
              <div className="study-term-name">{g.istilah}</div>
              <div className="study-term-def">{g.takrif}</div>
            </div>
          ))}
        </div>
      );
    }

    if (active === "faq") {
      if (!data || data.length === 0) return <EmptyState text={t(lang, "study.emptyFaq")} />;
      return (
        <div className="study-faq">
          {data.map((f, i) => (
            <div key={i} className="study-faq-item">
              <div className="study-faq-q">{f.soalan}</div>
              <div className="study-faq-a">{f.jawapan}</div>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="proto-content" style={{ maxWidth: "820px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
        <button className="proto-btn-ghost" onClick={() => navigate(-1)} style={{ padding: "8px 10px" }} aria-label={t(lang, "study.backBtn")}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 style={{ fontFamily: "var(--proto-font)", fontSize: "22px", fontWeight: 700, color: "var(--proto-text)" }}>
            {tajuk || t(lang, "study.heading")}
          </h1>
          <p style={{ color: "var(--proto-text-3)", fontSize: "12px" }}>{t(lang, "study.subtitle")}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="study-tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`study-tab ${active === tab.id ? "active" : ""}`}
              onClick={() => setActive(tab.id)}
            >
              <Icon size={14} /> {t(lang, tab.labelKey)}
            </button>
          );
        })}
      </div>

      {/* Active tab content */}
      <div style={{ marginTop: "20px" }}>{renderContent()}</div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="proto-card" style={{ padding: "40px", textAlign: "center" }}>
      <p style={{ color: "var(--proto-text-2)", fontSize: "13px" }}>{text}</p>
    </div>
  );
}
