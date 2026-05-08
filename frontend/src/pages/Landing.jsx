import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/useLanguage";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260315_073750_51473149-4350-4920-ae24-c8214286f323.mp4";

export default function Landing() {
  const { lang } = useLanguage();
  const canvasRef = useRef(null);
  const typingRef = useRef(null);
  const typingStateInfo = useRef({ pi: 0, ci: 0, deleting: false });
  const phrases = ['Pintar dengan AI.', 'Berkesan Hari Ini.', 'Lebih Mudah Kini.'];
  
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let timeout;
    const type = () => {
      const state = typingStateInfo.current;
      const word = phrases[state.pi];
      if (!typingRef.current) return;
      
      if (!state.deleting) {
        typingRef.current.textContent = word.slice(0, ++state.ci);
        if (state.ci === word.length) {
          state.deleting = true;
          timeout = setTimeout(type, 1800);
          return;
        }
      } else {
        typingRef.current.textContent = word.slice(0, --state.ci);
        if (state.ci === 0) {
          state.deleting = false;
          state.pi = (state.pi + 1) % phrases.length;
        }
      }
      timeout = setTimeout(type, state.deleting ? 55 : 95);
    };
    type();
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, particles = [];
    let animationFrameId;

    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        this.r = Math.random() * 1.5 + 0.3;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.alpha = Math.random() * 0.5 + 0.1;
        this.color = Math.random() > 0.7 ? '#00e5ff' : '#ffffff';
      }
      update() {
        this.x += this.vx; this.y += this.vy;
        if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.alpha;
        ctx.fill();
      }
    }

    for (let i = 0; i < 120; i++) particles.push(new Particle());

    const animParticles = () => {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => { p.update(); p.draw(); });
      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(animParticles);
    };
    animParticles();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    const reveals = document.querySelectorAll('.reveal');
    const revObs = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('visible'), i * 60);
          revObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    reveals.forEach(el => revObs.observe(el));

    let counted = false;
    const statsObserver = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !counted) {
        counted = true;
        countUp(document.getElementById('c1'), 500);
        countUp(document.getElementById('c2'), 98);
        countUp(document.getElementById('c3'), 2, 800);
      }
    }, { threshold: 0.5 });
    
    const statsEl = document.querySelector('.hero-stats');
    if (statsEl) statsObserver.observe(statsEl);

    return () => {
      revObs.disconnect();
      statsObserver.disconnect();
    };
  }, []);

  const countUp = (el, target, duration = 1600) => {
    if (!el) return;
    let start = 0, step = target / (duration / 16);
    const t = setInterval(() => {
      start = Math.min(start + step, target);
      el.textContent = Math.floor(start);
      if (start >= target) clearInterval(t);
    }, 16);
  };

  return (
    <div className="landing-v3">
      <svg width="0" height="0" style={{ position: 'absolute', visibility: 'hidden' }}>
        <defs>
          <linearGradient id="cyan-glow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00e5ff" />
            <stop offset="100%" stopColor="#7b5ea7" />
          </linearGradient>
        </defs>
      </svg>
      
      <div id="bg-fallback"></div>
      <canvas id="particle-canvas" ref={canvasRef}></canvas>
      <video id="bg-video" src={VIDEO_URL} autoPlay muted loop playsInline></video>

      <main>
        {/* NAVBAR */}
        <nav className={scrolled ? "scrolled" : ""}>
          <div className="nav-logo">
            <div className="logo-dot"></div>
            DeepLearner <span>AI</span>
          </div>
          <ul className="nav-links">
            <li><a href="#features">Ciri-ciri</a></li>
            <li><a href="#how">Cara Guna</a></li>
            <li><a href="#pricing">Harga</a></li>
          </ul>
          <div className="nav-actions">
            <Link to="/login" className="btn-ghost">Log Masuk</Link>
            <Link to="/register" className="btn-primary">Daftar Percuma</Link>
            <button className={`hamburger ${menuOpen ? "open" : ""}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
              <span></span><span></span><span></span>
            </button>
          </div>
        </nav>
        
        <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
          <a href="#features" onClick={() => setMenuOpen(false)}>Ciri-ciri</a>
          <a href="#how" onClick={() => setMenuOpen(false)}>Cara Guna</a>
          <a href="#pricing" onClick={() => setMenuOpen(false)}>Harga</a>
          <div className="mobile-btns">
            <Link to="/login" className="btn-ghost" style={{ flex: 1 }}>Log Masuk</Link>
            <Link to="/register" className="btn-primary" style={{ flex: 1 }}>Daftar Percuma</Link>
          </div>
        </div>

        {/* HERO */}
        <div className="hero">
          <div className="hero-grid"></div>
          <div className="hero-badge"><div className="badge-dot"></div>Kini Tersedia — Gemini AI Dioptimumkan</div>
          <h1>
            Belajar Lebih<br />
            <em ref={typingRef}></em><span className="typing-cursor"></span>
          </h1>
          <p>Dari rakaman kuliah hingga kuiz interaktif — DeepLearner menukarkan audio kepada nota, ringkasan, dan ujian dalam beberapa saat.</p>
          <div className="hero-cta">
            <Link to="/register" className="btn-hero-primary">🚀 Daftar Percuma</Link>
            <a href="#demo" className="btn-hero-outline">Tonton Demo ▶</a>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <div className="stat-num"><span id="c1">0</span><span>+</span></div>
              <div className="stat-label">Pelajar Malaysia</div>
            </div>
            <div className="stat">
              <div className="stat-num"><span id="c2">0</span><span>%</span></div>
              <div className="stat-label">Ketepatan Transkripsi</div>
            </div>
            <div className="stat">
              <div className="stat-num"><span id="c3">0</span><span>x</span></div>
              <div className="stat-label">Lebih Cepat Faham</div>
            </div>
            <div className="stat">
              <div className="stat-num">BM<span>+EN</span></div>
              <div className="stat-label">Dwi Bahasa</div>
            </div>
          </div>
        </div>

        {/* FEATURES */}
        <section id="features">
          <span className="section-tag reveal">Semua Dalam Satu Platform</span>
          <h2 className="section-title reveal">Segala yang anda perlukan<br />untuk belajar lebih berkesan.</h2>
          <p className="section-sub reveal">Dari audio kuliah hingga kuiz interaktif — fokus pada memahami, bukan mencatat.</p>
          <div className="bento">
            <div className="bento-card glass c-span-7 r-span-2 reveal">
              <div className="card-icon"><svg viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg></div>
              <div className="card-title">Transkripsi Audio Pintar</div>
              <div className="card-desc">Rakam kuliah atau muat naik fail audio — AI menukar ucapan kepada teks tepat dalam Bahasa Melayu dan Inggeris secara automatik.</div>
              <div className="wave-bars">
                {Array.from({ length: 12 }).map((_, i) => <div key={i} className="wave-bar"></div>)}
              </div>
              <div className="progress-wrap" style={{ marginTop: '24px' }}>
                <div className="progress-label"><span>Memproses Audio...</span><span style={{ color: '#00e5ff' }}>98%</span></div>
                <div className="progress-bar"><div className="progress-fill fill-cyan" style={{ width: '98%' }}></div></div>
                <div className="progress-label"><span>Bahasa Dikesan</span><span>BM + EN</span></div>
                <div className="progress-bar"><div className="progress-fill fill-purple" style={{ width: '100%' }}></div></div>
              </div>
              <div className="chips">
                <div className="chip cyan">Real-time</div>
                <div className="chip">AI Powered</div>
                <div className="chip green">BM + EN</div>
              </div>
            </div>
            
            <div className="bento-card glass c-span-5 reveal">
              <div className="card-icon"><svg viewBox="0 0 24 24"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M7 5H3"/></svg></div>
              <div className="card-title">Ringkasan Berkuasa AI</div>
              <div className="card-desc">Nota panjang diringkaskan kepada poin penting dalam masa beberapa saat.</div>
              <Link to="/register" className="cta-link">Cuba Sekarang →</Link>
            </div>
            
            <div className="bento-card glass c-span-5 reveal">
              <div className="card-icon"><svg viewBox="0 0 24 24"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg></div>
              <div className="card-title">Penjana Kuiz Adaptif</div>
              <div className="card-desc">Jana soalan MCQ berkaitan kuliah anda secara automatik. Uji pemahaman dan perkukuh ingatan.</div>
              <div className="chips" style={{ marginTop: '14px' }}><div className="chip">MCQ</div><div className="chip cyan">Adaptif</div></div>
            </div>
            
            <div className="bento-card glass c-span-5 reveal">
              <div className="card-icon"><svg viewBox="0 0 24 24"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg></div>
              <div className="card-title">Arkib Pengetahuan</div>
              <div className="card-desc">Semua sesi disimpan dalam pustaka nota peribadi anda.</div>
              <div className="archive-list">
                <div className="archive-item"><div className="archive-dot"></div>Kuliah 01 — Pengenalan Ekonomi</div>
                <div className="archive-item"><div className="archive-dot"></div>Kuliah 02 — Permintaan & Penawaran</div>
                <div className="archive-item"><div className="archive-dot"></div>Kuliah 03 — Keseimbangan Pasaran</div>
              </div>
            </div>
            
            <div className="bento-card glass c-span-4 reveal">
              <div className="card-icon"><svg viewBox="0 0 24 24"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg></div>
              <div className="card-title">Sokongan PDF & Slaid</div>
              <div className="card-desc">Muat naik nota kuliah PDF atau slaid untuk ditukar kepada ringkasan dan kuiz.</div>
            </div>
            
            <div className="bento-card glass c-span-3 reveal">
              <div className="card-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></div>
              <div className="card-title">Multi-Bahasa</div>
              <div className="card-desc">Sokong BM dan Inggeris. Gemini AI dioptimumkan.</div>
              <div className="chips" style={{ marginTop: '14px' }}><div className="chip cyan">BM</div><div className="chip">EN</div></div>
            </div>
            
            <div className="bento-card glass c-span-12 reveal card-flex">
              <div className="card-icon"><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg></div>
              <div>
                <div className="card-title">Sejarah Pembelajaran</div>
                <div className="card-desc">Cari, imbas semula, dan teruskan pembelajaran bila-bila masa dari mana-mana peranti. Penyegerakan awan automatik memastikan nota anda sentiasa selamat.</div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how">
          <span className="section-tag reveal">Mudah & Pantas</span>
          <h2 className="section-title reveal">Cara Guna DeepLearner</h2>
          <p className="section-sub reveal">Tiga langkah mudah untuk mengubah cara anda belajar.</p>
          <div className="steps-grid">
            <div className="step-card glass reveal">
              <div className="step-number">01</div>
              <div className="card-icon"><svg viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg></div>
              <div className="card-title">Rakam atau Muat Naik</div>
              <div className="card-desc">Rakam kuliah secara langsung atau muat naik fail audio/PDF yang sedia ada.</div>
            </div>
            <div className="step-card glass reveal" style={{ transitionDelay: '.1s' }}>
              <div className="step-number">02</div>
              <div className="card-icon"><svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
              <div className="card-title">AI Memproses Kandungan</div>
              <div className="card-desc">Gemini AI akan mentranskrip, meringkas, dan menjana kuiz dalam beberapa saat.</div>
            </div>
            <div className="step-card glass reveal" style={{ transitionDelay: '.2s' }}>
              <div className="step-number">03</div>
              <div className="card-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></div>
              <div className="card-title">Belajar Lebih Berkesan</div>
              <div className="card-desc">Semak nota ringkas dan jawab kuiz interaktif untuk meningkatkan prestasi.</div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing">
          <span className="section-tag reveal">Harga</span>
          <h2 className="section-title reveal">Pilih Pelan Yang Sesuai</h2>
          <p className="section-sub reveal">Mulakan percuma. Naik taraf bila anda bersedia.</p>
          <div className="pricing-grid">
            <div className="pricing-card glass reveal">
              <div className="price-plan">Percuma</div>
              <div className="price-amount"><sup>RM</sup>0</div>
              <div className="price-per">Selamanya percuma</div>
              <div className="price-divider"></div>
              <ul className="price-features">
                <li className="on"><span className="feat-check yes">✓</span>5 transkripsi / bulan</li>
                <li className="on"><span className="feat-check yes">✓</span>Ringkasan AI asas</li>
                <li className="on"><span className="feat-check yes">✓</span>10 soalan kuiz / sesi</li>
                <li><span className="feat-check no">✗</span>PDF & Slaid</li>
                <li><span className="feat-check no">✗</span>Arkib tanpa had</li>
                <li><span className="feat-check no">✗</span>Sokongan keutamaan</li>
              </ul>
              <Link to="/register" className="pricing-btn">Mulakan Percuma</Link>
            </div>
            
            <div className="pricing-card glass featured reveal" style={{ transitionDelay: '.1s' }}>
              <div className="price-plan">Pro</div>
              <div className="price-amount"><sup>RM</sup>19<sub>/bln</sub></div>
              <div className="price-per">Billed annually · Jimat 20%</div>
              <div className="price-divider"></div>
              <ul className="price-features">
                <li className="on"><span className="feat-check yes">✓</span>Transkripsi tanpa had</li>
                <li className="on"><span className="feat-check yes">✓</span>Ringkasan AI lanjutan</li>
                <li className="on"><span className="feat-check yes">✓</span>Kuiz adaptif penuh</li>
                <li className="on"><span className="feat-check yes">✓</span>PDF & Slaid sokongan</li>
                <li className="on"><span className="feat-check yes">✓</span>Arkib tanpa had</li>
                <li><span className="feat-check no">✗</span>Sokongan keutamaan</li>
              </ul>
              <Link to="/register" className="pricing-btn featured-btn">Mulakan Pro</Link>
            </div>
            
            <div className="pricing-card glass reveal" style={{ transitionDelay: '.2s' }}>
              <div className="price-plan">Pasukan</div>
              <div className="price-amount"><sup>RM</sup>49<sub>/bln</sub></div>
              <div className="price-per">Sehingga 10 ahli pasukan</div>
              <div className="price-divider"></div>
              <ul className="price-features">
                <li className="on"><span className="feat-check yes">✓</span>Semua ciri Pro</li>
                <li className="on"><span className="feat-check yes">✓</span>Papan pemuka pasukan</li>
                <li className="on"><span className="feat-check yes">✓</span>Nota dikongsi bersama</li>
                <li className="on"><span className="feat-check yes">✓</span>Analitik penggunaan</li>
                <li className="on"><span className="feat-check yes">✓</span>Arkib tanpa had</li>
                <li className="on"><span className="feat-check yes">✓</span>Sokongan keutamaan 24/7</li>
              </ul>
              <a href="mailto:contact@deeplearner.com" className="pricing-btn">Hubungi Kami</a>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="cta-section">
          <div className="cta-inner reveal">
            <div className="cta-glow"></div>
            <div className="cta-badge"><div className="badge-dot"></div>Sertai 500+ Pelajar Malaysia</div>
            <h2>Bersedia untuk belajar<br />dengan cara lebih <em>pintar?</em></h2>
            <p>Daftar percuma hari ini. Tiada kad kredit diperlukan.</p>
            <div className="cta-buttons">
              <Link to="/register" className="btn-hero-primary" style={{ fontSize: '1rem', padding: '16px 36px' }}>🚀 Daftar Percuma Sekarang</Link>
              <Link to="/login" className="btn-hero-outline" style={{ fontSize: '1rem', padding: '16px 36px' }}>Log Masuk</Link>
            </div>
            <div className="cta-social">
              <div className="avatar-stack">
                <div className="avatar">A</div><div className="avatar">Z</div>
                <div className="avatar">N</div><div className="avatar">R</div>
              </div>
              &nbsp; Disertai pelajar dari UiTM, UTM, UM & lebih lagi
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <footer>
          <div className="footer-inner">
            <div className="footer-top">
              <div className="footer-brand">
                <div className="nav-logo"><div className="logo-dot"></div>DeepLearner <span style={{ color: 'var(--cyan)' }}>AI</span></div>
                <p>Mempelopori cara belajar generasi baharu pelajar Malaysia dengan teknologi AI.</p>
              </div>
              <div className="footer-col">
                <h4>Platform</h4>
                <ul><li><a href="#">Transkripsi</a></li><li><a href="#">Ringkasan AI</a></li><li><a href="#">Kuiz Adaptif</a></li><li><a href="#">Arkib Nota</a></li></ul>
              </div>
              <div className="footer-col">
                <h4>Syarikat</h4>
                <ul><li><a href="#">Tentang Kami</a></li><li><a href="#">Blog</a></li><li><a href="#">Kerjaya</a></li><li><a href="#">Hubungi</a></li></ul>
              </div>
              <div className="footer-col">
                <h4>Undang-undang</h4>
                <ul><li><a href="#">Dasar Privasi</a></li><li><a href="#">Terma Perkhidmatan</a></li><li><a href="#">Pematuhan</a></li></ul>
              </div>
            </div>
            <div className="footer-bottom">
              <div>© 2026 DeepLearner AI. Semua hak terpelihara.</div>
              <div className="footer-social">
                <a href="#" className="social-btn">𝕏</a>
                <a href="#" className="social-btn">in</a>
                <a href="#" className="social-btn">gh</a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
