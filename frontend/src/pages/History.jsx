import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../context/useLanguage";
import { t } from "../i18n/translations";
import { FileText, Trash2, Inbox, Plus, Search } from "lucide-react";

export default function History() {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [deleting, setDeleting] = useState(null);
    const navigate = useNavigate();
    const { lang } = useLanguage();
    const noMatrik = auth.currentUser?.email?.split("@")[0] || "";

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        setLoading(true);
        setError("");
        try {
            const q = query(
                collection(db, "nota"),
                where("noMatrik", "==", noMatrik)
            );
            const snap = await getDocs(q);
            const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            items.sort((a, b) => {
                const ta = a.tarikhSimpan?.toDate?.() ?? new Date(a.tarikhSimpan ?? 0);
                const tb = b.tarikhSimpan?.toDate?.() ?? new Date(b.tarikhSimpan ?? 0);
                return tb - ta;
            });
            setNotes(items);
        } catch (err) {
            console.error(err);
            setError(t(lang, "history.errLoad"));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (idNota) => {
        const ok = window.confirm(lang === "ms" ? "Padam nota ini? Tindakan ini tidak boleh dibatalkan." : "Delete this note? This cannot be undone.");
        if (!ok) return;
        setDeleting(idNota);
        await deleteDoc(doc(db, "nota", idNota));
        setNotes(prev => prev.filter(n => n.id !== idNota));
        setDeleting(null);
    };

    const filtered = notes.filter(n =>
        n.tajuk?.toLowerCase().includes(search.toLowerCase())
    );

    const formatDate = (ts) => {
        if (!ts) return "";
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleDateString(lang === "ms" ? "ms-MY" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
    };

    const deleteLabel = lang === "ms" ? "Padam nota" : "Delete note";

    return (
        <div className="proto-content">
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
                <div>
                    <h1 style={{ fontFamily: "var(--proto-font)", fontSize: "24px", fontWeight: 700, color: "var(--proto-text)", marginBottom: "6px" }}>
                        {t(lang, "history.heading")}
                    </h1>
                    <p style={{ color: "var(--proto-text-2)", fontSize: "14px" }}>{t(lang, "history.subtitle")}</p>
                </div>
                <Link to="/input" className="proto-btn-primary" style={{ textDecoration: "none" }}>
                    <Plus size={16} /> {t(lang, "history.newSession")}
                </Link>
            </div>

            {/* Error */}
            {error && (
                <div style={{ background: "rgba(244,67,54,0.1)", border: "1px solid #f44336", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", color: "#f44336", fontSize: "13px" }}>
                    {error}
                </div>
            )}

            {/* Search */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "var(--proto-surface)", border: "1px solid var(--proto-border)", borderRadius: "12px", padding: "10px 16px", marginBottom: "20px", backdropFilter: "var(--proto-glass-blur)" }}>
                <Search size={16} style={{ color: "var(--proto-text-2)" }} />
                <input
                    type="text"
                    placeholder={t(lang, "history.searchPlaceholder")}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "13px", color: "var(--proto-text)" }}
                />
            </div>

            {loading ? (
                <div className="proto-card" style={{ padding: "48px", textAlign: "center" }}>
                    <div className="spinner" style={{ margin: "0 auto" }} />
                </div>
            ) : filtered.length === 0 ? (
                <div className="proto-card" style={{ textAlign: "center", padding: "48px" }}>
                    <div style={{ marginBottom: "16px", display: "flex", justifyContent: "center", color: "var(--proto-text-3)" }}>
                        <Inbox size={40} />
                    </div>
                    <h2 style={{ fontFamily: "var(--proto-font)", fontSize: "16px", fontWeight: 700, color: "var(--proto-text)", margin: "0 0 6px" }}>
                        {t(lang, "history.emptyHeading")}
                    </h2>
                    <p style={{ color: "var(--proto-text-2)", fontSize: "13px" }}>
                        {search ? t(lang, "history.emptySearch") : t(lang, "history.emptyDefault")}
                    </p>
                    {!search && (
                        <Link to="/input" className="proto-btn-primary" style={{ textDecoration: "none", marginTop: "20px", display: "inline-flex" }}>
                            {t(lang, "history.emptyBtn")}
                        </Link>
                    )}
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <p style={{ marginBottom: "4px", fontSize: "12px", color: "var(--proto-text-2)" }}>
                        {t(lang, "history.resultCount", { n: filtered.length })}
                    </p>
                    {filtered.map((note) => (
                        <div key={note.id} className="proto-card" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px" }}>
                            <FileText size={16} style={{ color: "var(--amber)", flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--proto-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {note.tajuk || t(lang, "history.untitled")}
                                </div>
                                <div style={{ fontSize: "11px", color: "var(--proto-text-2)" }}>{formatDate(note.tarikhSimpan)}</div>
                            </div>
                            <button
                                className="proto-btn-outline"
                                style={{ padding: "8px 14px", fontSize: "12px" }}
                                onClick={() => navigate(`/summary/${note.idRingkasan}`)}
                            >
                                {t(lang, "history.viewBtn")}
                            </button>
                            <button
                                className="proto-btn-ghost"
                                style={{ padding: "8px 10px", fontSize: "12px", color: "#f44336" }}
                                disabled={deleting === note.id}
                                onClick={() => handleDelete(note.id)}
                                aria-label={deleteLabel}
                                title={deleteLabel}
                            >
                                {deleting === note.id ? "..." : <Trash2 size={14} />}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
