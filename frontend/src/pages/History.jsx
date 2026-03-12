import { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";

export default function History() {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [deleting, setDeleting] = useState(null);
    const navigate = useNavigate();
    const noMatrik = auth.currentUser?.email?.split("@")[0] || "";

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        setLoading(true);
        setError("");
        try {
            // orderBy is intentionally omitted to avoid requiring a composite
            // Firestore index. We sort client-side instead.
            const q = query(
                collection(db, "nota"),
                where("noMatrik", "==", noMatrik)
            );
            const snap = await getDocs(q);
            const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Sort descending by tarikhSimpan client-side
            items.sort((a, b) => {
                const ta = a.tarikhSimpan?.toDate?.() ?? new Date(a.tarikhSimpan ?? 0);
                const tb = b.tarikhSimpan?.toDate?.() ?? new Date(b.tarikhSimpan ?? 0);
                return tb - ta;
            });
            setNotes(items);
        } catch (err) {
            console.error(err);
            setError("Gagal memuatkan nota. Sila cuba lagi.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (idNota) => {
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
        return d.toLocaleDateString("ms-MY", { day: "numeric", month: "long", year: "numeric" });
    };

    return (
        <div className="page">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                    <h1>📚 Sejarah Nota</h1>
                    <p>Semua sesi pembelajaran yang telah disimpan.</p>
                </div>
                <Link to="/input" className="btn btn-primary">+ Sesi Baharu</Link>
            </div>

            {error && (
                <div className="error-msg" style={{ marginBottom: "1rem" }}>{error}</div>
            )}

            <input
                className="input"
                placeholder="🔍 Cari nota..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ marginBottom: "1.5rem" }}
            />

            {loading ? (
                <div style={{ textAlign: "center", padding: "3rem" }}>
                    <div className="spinner" style={{ margin: "0 auto" }} />
                </div>
            ) : filtered.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📭</div>
                    <h3>Tiada nota dijumpai</h3>
                    <p style={{ marginTop: "0.5rem" }}>
                        {search ? "Cuba carian lain." : "Mulakan sesi pembelajaran baharu untuk simpan nota pertama anda!"}
                    </p>
                    {!search && (
                        <Link to="/input" className="btn btn-primary" style={{ marginTop: "1.5rem", display: "inline-flex" }}>
                            🎙️ Mulakan Sekarang
                        </Link>
                    )}
                </div>
            ) : (
                <div>
                    <p style={{ marginBottom: "1rem", fontSize: "0.9rem" }}>{filtered.length} nota dijumpai</p>
                    {filtered.map((note) => (
                        <div key={note.id} className="history-item">
                            <div>
                                <div style={{ fontWeight: 600, color: "var(--text)" }}>📄 {note.tajuk || "Nota Tanpa Tajuk"}</div>
                                <div className="history-meta">{formatDate(note.tarikhSimpan)}</div>
                            </div>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button
                                    className="btn btn-outline"
                                    style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                                    onClick={() => navigate(`/summary/${note.idRingkasan}`)}
                                >
                                    👁 Lihat
                                </button>
                                <button
                                    className="btn btn-danger"
                                    style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                                    disabled={deleting === note.id}
                                    onClick={() => handleDelete(note.id)}
                                >
                                    {deleting === note.id ? "..." : "🗑"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
