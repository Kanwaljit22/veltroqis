import React from 'react';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import {
  Zap, GitPullRequest, Bug, Users, BarChart3, Calendar,
  ArrowRight, Layers, Target, Shield, Rocket, Activity,
  Star, Sparkles, Play,
} from 'lucide-react';

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: <Layers />,   title: 'Scrum Board',      desc: 'Drag-and-drop Kanban with 6 columns, sprint management, burndown charts, and story-point tracking.', accent: '#00d4ff' },
  { icon: <Target />,   title: 'Task Tracker',      desc: 'Multi-assignee tasks, custom priorities, labels, due dates, and inline threaded comments.',            accent: '#7c3aed' },
  { icon: <Bug />,      title: 'Issue Monitor',     desc: 'Track bugs with severity levels, reproducibility flags, and structured resolution workflows.',         accent: '#f59e0b' },
  { icon: <Calendar />, title: 'Daily Standup',     desc: "Structured async standups. Log blockers, plans, and yesterday's work — all in one place.",             accent: '#10b981' },
  { icon: <Users />,    title: 'Team Management',   desc: 'Role-based access control. Invite by email. Developers, designers, QA, and PMs all covered.',         accent: '#f43f5e' },
  { icon: <BarChart3 />,title: 'Analytics',         desc: 'Real-time dashboard with velocity metrics, bug trends, role distribution, and activity feeds.',        accent: '#06b6d4' },
];

const ROLES = [
  { role: 'Admin',        color: '#f43f5e', desc: 'Full control, analytics, user management' },
  { role: 'Project Lead', color: '#f59e0b', desc: 'Manage sprints, assign tasks, track progress' },
  { role: 'Developer',    color: '#00d4ff', desc: 'Code tasks, pull requests, issue resolution' },
  { role: 'Designer',     color: '#a855f7', desc: 'Design tasks, Figma links, UI reviews' },
  { role: 'QA Engineer',  color: '#10b981', desc: 'Bug tracking, test cases, sign-offs' },
  { role: 'Viewer',       color: '#64748b', desc: 'Read-only access to projects and boards' },
];

const STATS   = [
  { n: '2,400+', label: 'Teams sprinting' },
  { n: '99.9%',  label: 'Uptime SLA' },
  { n: '6',      label: 'Role types' },
  { n: '∞',      label: 'Projects per workspace' },
];

const STEPS = [
  { n: '01', icon: <Target size={22} />,         title: 'Plan your sprint',    desc: 'Create tasks, assign story points, set priorities, and organise your backlog into a focused sprint.' },
  { n: '02', icon: <GitPullRequest size={22} />,  title: 'Execute with focus',  desc: 'Move cards through the board, log standups, track issues, and stay aligned in real-time.' },
  { n: '03', icon: <Rocket size={22} />,          title: 'Ship and retrospect', desc: 'Complete sprints, review burndown charts, analyse velocity, and continuously improve.' },
];

// ─── Shared animation variants ────────────────────────────────────────────────

type BezierEase = [number, number, number, number];
const EASE_QUART:  BezierEase = [0.25, 0.46, 0.45, 0.94];
const EASE_SPRING: BezierEase = [0.34, 1.56, 0.64, 1];

const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0,  transition: { duration: 0.62, ease: EASE_QUART } },
};

const staggerContainer: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const staggerContainerSlow: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const cardVariant: Variants = {
  hidden:  { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0,  transition: { duration: 0.5, ease: EASE_QUART } },
};

const scaleIn: Variants = {
  hidden:  { opacity: 0, scale: 0.88 },
  visible: { opacity: 1, scale: 1,    transition: { duration: 0.55, ease: EASE_SPRING } },
};

// ─── Component ────────────────────────────────────────────────────────────────

export const LandingPage: React.FC = () => {

  return (
    <>
      <style>{`
        :root {
          --lp-bg:        #050d1a;
          --lp-surface:   #0d1b2e;
          --lp-surface2:  #112234;
          --lp-border:    #1a3049;
          --lp-border-hi: #1e4060;
          --lp-cyan:      #00d4ff;
          --lp-cyan-dim:  rgba(0,212,255,0.12);
          --lp-violet:    #7c3aed;
          --lp-text:      #e2e8f0;
          --lp-dim:       #94a3b8;
          --lp-muted:     #64748b;
          --ff-display:   'Geist', 'Geist Fallback', sans-serif;
          --ff-body:      'Geist', 'Geist Fallback', sans-serif;
          --ff-mono:      'Geist Mono', 'Geist Fallback', monospace;
        }

        .lp-root { font-family:var(--ff-body); background:var(--lp-bg); color:var(--lp-text); min-height:100vh; overflow-x:hidden; }
        .lp-root * { box-sizing:border-box; margin:0; padding:0; }

        .lp-grid-bg {
          background-image:
            linear-gradient(rgba(0,212,255,.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,212,255,.035) 1px, transparent 1px);
          background-size:52px 52px;
        }

        .lp-nav {
          position:sticky; top:0; z-index:50;
          backdrop-filter:blur(14px);
          background:rgba(5,13,26,.88);
          border-bottom:1px solid var(--lp-border);
        }

        .lp-orb { position:absolute; border-radius:50%; filter:blur(90px); pointer-events:none; }

        .lp-h1 {
          font-family:var(--ff-display);
          font-size:clamp(2.75rem,6vw,4.75rem);
          font-weight:800; line-height:1.08; letter-spacing:-.025em;
          color:var(--lp-text);
        }
        .lp-h1 .grad {
          background:linear-gradient(125deg,#00d4ff 0%,#7c3aed 100%);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
          display:block;
        }

        .lp-h2 {
          font-family:var(--ff-display);
          font-size:clamp(1.875rem,3.5vw,2.625rem);
          font-weight:700; line-height:1.15; letter-spacing:-.02em;
          color:var(--lp-text);
        }

        .btn-cyan {
          display:inline-flex; align-items:center; gap:8px;
          padding:13px 26px; border-radius:10px; border:none; cursor:pointer;
          font-family:var(--ff-body); font-size:.9375rem; font-weight:600;
          background:linear-gradient(135deg,#00d4ff,#0095ff);
          color:#050d1a; text-decoration:none; white-space:nowrap;
          box-shadow:0 0 28px rgba(0,212,255,.28);
          transition:transform .2s,box-shadow .2s;
        }
        .btn-cyan:hover { transform:translateY(-2px); box-shadow:0 0 44px rgba(0,212,255,.5); }

        .btn-outline {
          display:inline-flex; align-items:center; gap:8px;
          padding:12px 22px; border-radius:10px; cursor:pointer;
          font-family:var(--ff-body); font-size:.9375rem; font-weight:500;
          border:1px solid var(--lp-border-hi); background:transparent;
          color:var(--lp-dim); text-decoration:none; white-space:nowrap;
          transition:color .2s,border-color .2s,background .2s;
        }
        .btn-outline:hover { color:var(--lp-text); border-color:var(--lp-cyan); background:var(--lp-cyan-dim); }

        .lp-tag {
          display:inline-flex; align-items:center; gap:6px;
          padding:5px 13px; border-radius:99px;
          border:1px solid rgba(0,212,255,.25); background:rgba(0,212,255,.07);
          color:var(--lp-cyan); font-family:var(--ff-mono);
          font-size:.68rem; font-weight:500; letter-spacing:.1em; text-transform:uppercase;
        }

        .feat-card {
          background:var(--lp-surface); border:1px solid var(--lp-border);
          border-radius:16px; padding:28px; position:relative; overflow:hidden;
          transition:border-color .3s,box-shadow .3s;
        }
        .feat-card::after {
          content:''; position:absolute; inset:0; border-radius:16px;
          opacity:0; transition:opacity .3s;
          background:linear-gradient(135deg,var(--ca-dim,rgba(0,212,255,.06)),transparent);
        }
        .feat-card:hover { border-color:var(--ca,#00d4ff); box-shadow:0 24px 64px rgba(0,0,0,.45); }
        .feat-card:hover::after { opacity:1; }

        .feat-icon { width:46px; height:46px; border-radius:12px; display:flex; align-items:center; justify-content:center; margin-bottom:16px; }

        .lp-stat-n {
          font-family:var(--ff-display); font-size:3.25rem; font-weight:800; line-height:1;
          background:linear-gradient(135deg,var(--lp-cyan),#fff);
          -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
        }

        .lp-step-n {
          font-family:var(--ff-mono); font-size:3.5rem; font-weight:500;
          color:var(--lp-border-hi); line-height:1; user-select:none; margin-bottom:4px;
        }

        .lp-divider { height:1px; background:linear-gradient(90deg,transparent,var(--lp-border-hi),transparent); }

        .lp-navlink { color:var(--lp-muted); text-decoration:none; font-size:.9rem; font-weight:500; transition:color .2s; }
        .lp-navlink:hover { color:var(--lp-text); }

        .mk-col { background:var(--lp-surface); border:1px solid var(--lp-border); border-radius:10px; padding:10px; flex:1; min-width:0; }
        .mk-card { background:var(--lp-surface2); border:1px solid var(--lp-border); border-radius:7px; padding:9px 11px; margin-top:7px; }

        .role-card { background:var(--lp-surface); border-radius:12px; padding:16px 18px; transition:transform .2s,box-shadow .2s; }
        .role-card:hover { transform:translateY(-2px); box-shadow:0 10px 32px rgba(0,0,0,.35); }

        .lp-footer { border-top:1px solid var(--lp-border); background:var(--lp-surface); }

        .lp-hero-badge {
          display:inline-flex; align-items:center; gap:6px; padding:5px 12px;
          border-radius:99px; background:rgba(124,58,237,.12); border:1px solid rgba(124,58,237,.3);
          color:#a78bfa; font-size:.72rem; font-weight:500; font-family:var(--ff-mono);
        }

        .lp-root::-webkit-scrollbar { width:5px; }
        .lp-root::-webkit-scrollbar-track { background:var(--lp-bg); }
        .lp-root::-webkit-scrollbar-thumb { background:var(--lp-border-hi); border-radius:3px; }
      `}</style>

      <div className="lp-root">

        {/* ── NAV ─────────────────────────────────────────────────────── */}
        <nav className="lp-nav">
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link to="/login" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#00d4ff,#0077ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 14px rgba(0,212,255,.45)' }}>
                <Zap size={15} color="#050d1a" strokeWidth={2.5} />
              </div>
              <span style={{ fontFamily: 'var(--ff-display)', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '.12em', color: 'var(--lp-text)' }}>VELTROQIS</span>
            </Link>

            <div style={{ display: 'flex', gap: 28 }}>
              {['Features', 'How it works', 'Team'].map((l) => (
                <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`} className="lp-navlink">{l}</a>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <Link to="/login"  className="btn-outline" style={{ padding: '8px 18px', fontSize: '.875rem' }}>Sign in</Link>
              <Link to="/signup" className="btn-cyan"    style={{ padding: '8px 18px', fontSize: '.875rem' }}>Get started</Link>
            </div>
          </div>
        </nav>

        {/* ── HERO ────────────────────────────────────────────────────── */}
        <section className="lp-grid-bg" style={{ position: 'relative', padding: '100px 24px 120px', overflow: 'hidden' }}>
          <div className="lp-orb" style={{ width: 700, height: 700, background: 'radial-gradient(circle,rgba(0,212,255,.16) 0%,transparent 70%)', top: -250, left: '40%', transform: 'translateX(-50%)' }} />
          <div className="lp-orb" style={{ width: 420, height: 420, background: 'radial-gradient(circle,rgba(124,58,237,.22) 0%,transparent 70%)', top: 60, right: '5%' }} />

          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>

            {/* ── Hero copy ─────────────────────────────────────────── */}
            <div>
              {/* Badge */}
              <motion.div
                className="lp-hero-badge"
                style={{ marginBottom: 22 }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.05, ease: 'easeOut' }}
              >
                <Star size={11} fill="currentColor" /> New: Daily Standup + Issue Tracker →
              </motion.div>

              {/* Headline — each line slides up independently */}
              <h1 className="lp-h1" style={{ marginBottom: 22 }}>
                {['Ship sprints.', 'Crush bugs.'].map((line, i) => (
                  <motion.span
                    key={line}
                    style={{ display: 'block' }}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.65, delay: 0.2 + i * 0.14, ease: EASE_QUART }}
                  >
                    {line}
                  </motion.span>
                ))}
                {/* Gradient line — clip-path wipe reveal */}
                <motion.span
                  className="grad"
                  initial={{ clipPath: 'inset(0 100% 0 0)' }}
                  animate={{ clipPath: 'inset(0 0% 0 0)' }}
                  transition={{ duration: 0.85, delay: 0.54, ease: [0.77, 0, 0.175, 1] as BezierEase }}
                >
                  Ship together.
                </motion.span>
              </h1>

              {/* Subline */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.72, ease: 'easeOut' }}
                style={{ fontSize: '1.0625rem', lineHeight: 1.72, color: 'var(--lp-dim)', marginBottom: 38, maxWidth: 430 }}
              >
                Veltroqis is the all-in-one dev collaboration platform — scrum boards, issue tracking, daily standups, and team analytics in one sharp workspace.
              </motion.p>

              {/* CTA buttons */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.88, ease: 'easeOut' }}
                style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}
              >
                <Link to="/signup" className="btn-cyan">Start for free <ArrowRight size={16} /></Link>
                <Link to="/login"  className="btn-outline"><Play size={14} /> Sign in</Link>
              </motion.div>

              {/* Social proof */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.06 }}
                style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 14 }}
              >
                <div style={{ display: 'flex' }}>
                  {['#00d4ff','#7c3aed','#10b981','#f59e0b','#f43f5e'].map((c, i) => (
                    <div key={c} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: '2px solid var(--lp-bg)', marginLeft: i ? -7 : 0, opacity: .9 }} />
                  ))}
                </div>
                <p style={{ fontSize: '.8125rem', color: 'var(--lp-muted)' }}>
                  <strong style={{ color: 'var(--lp-dim)' }}>2,400+ teams</strong> sprint with Veltroqis
                </p>
              </motion.div>
            </div>

            {/* ── Dashboard mockup — infinite float ─────────────────── */}
            <motion.div
              style={{ position: 'relative' }}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.75, delay: 0.35, ease: EASE_QUART }}
            >
              <motion.div
                animate={{ y: [0, -14, 0] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ position: 'relative' }}
              >
                {/* Frame */}
                <div style={{ background: 'var(--lp-surface)', border: '1px solid var(--lp-border-hi)', borderRadius: 18, padding: 20, boxShadow: '0 40px 100px rgba(0,0,0,.65),0 0 80px rgba(0,212,255,.08)', position: 'relative' }}>
                  {/* Chrome dots */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 14 }}>
                    {(['#ff5f57','#ffbd2e','#28c840'] as const).map((c) => (
                      <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c, opacity: .8 }} />
                    ))}
                    <div style={{ flex: 1, margin: '0 10px', height: 5, background: 'var(--lp-border)', borderRadius: 3 }} />
                  </div>

                  {/* Board header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <span style={{ fontFamily: 'var(--ff-display)', fontWeight: 700, fontSize: '.8125rem', color: 'var(--lp-text)' }}>Sprint Board — Veltroqis</span>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <div style={{ height: 20, width: 54, borderRadius: 5, background: 'rgba(0,212,255,.18)', border: '1px solid rgba(0,212,255,.3)' }} />
                      <div style={{ height: 20, width: 34, borderRadius: 5, background: 'var(--lp-border)' }} />
                    </div>
                  </div>

                  {/* Kanban columns */}
                  <div style={{ display: 'flex', gap: 9 }}>
                    {[
                      { label: 'Backlog',     col: '#64748b', cards: ['Design system v2', 'API rate limiting'] },
                      { label: 'In Progress', col: '#00d4ff', cards: ['Auth module', 'Dashboard widgets'] },
                      { label: 'Done',        col: '#10b981', cards: ['OAuth 2.0'] },
                    ].map((c) => (
                      <div key={c.label} className="mk-col">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.col }} />
                          <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 8, color: c.col, fontWeight: 500 }}>{c.label}</span>
                        </div>
                        {c.cards.map((card) => (
                          <div key={card} className="mk-card">
                            <div style={{ width: '65%', height: 5, borderRadius: 3, background: 'var(--lp-border-hi)', marginBottom: 5 }} />
                            <span style={{ color: 'var(--lp-muted)', fontFamily: 'var(--ff-mono)', fontSize: 8.5 }}>{card}</span>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 7 }}>
                              <div style={{ width: 14, height: 14, borderRadius: '50%', background: c.col, opacity: .7 }} />
                              <span style={{ fontSize: 7.5, color: 'var(--lp-muted)', fontFamily: 'var(--ff-mono)' }}>3 SP</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 14, height: 1, background: 'linear-gradient(90deg,transparent,var(--lp-cyan),transparent)', opacity: .35 }} />
                </div>

                {/* Sprint badge */}
                <div style={{ position: 'absolute', top: -16, right: -12, background: 'var(--lp-surface)', border: '1px solid rgba(16,185,129,.4)', borderRadius: 9, padding: '7px 13px', display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 8px 22px rgba(0,0,0,.45)' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                  <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9.5, color: '#10b981' }}>Sprint Active</span>
                </div>

                {/* Activity badge */}
                <div style={{ position: 'absolute', bottom: -18, left: -16, background: 'var(--lp-surface)', border: '1px solid var(--lp-border-hi)', borderRadius: 9, padding: '9px 14px', boxShadow: '0 8px 22px rgba(0,0,0,.45)', minWidth: 158 }}>
                  <p style={{ fontFamily: 'var(--ff-mono)', fontSize: 8, color: 'var(--lp-muted)', marginBottom: 5, letterSpacing: '.08em' }}>RECENT ACTIVITY</p>
                  {['Task moved → Done', 'Bug #43 resolved', '2 comments added'].map((a) => (
                    <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--lp-cyan)', flexShrink: 0 }} />
                      <span style={{ fontSize: 8.5, fontFamily: 'var(--ff-mono)', color: 'var(--lp-dim)' }}>{a}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>

          </div>
        </section>

        <div className="lp-divider" style={{ maxWidth: 1200, margin: '0 auto' }} />

        {/* ── FEATURES ────────────────────────────────────────────────── */}
        <section id="features" style={{ padding: '96px 24px', maxWidth: 1200, margin: '0 auto' }}>
          <motion.div
            style={{ textAlign: 'center', marginBottom: 54 }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={staggerContainer}
          >
            <motion.div className="lp-tag" style={{ marginBottom: 14 }} variants={fadeUp}>
              <Zap size={10} /> What's inside
            </motion.div>
            <motion.h2 className="lp-h2" variants={fadeUp}>
              Everything your team needs<br />
              <span style={{ color: 'var(--lp-muted)' }}>to ship without friction</span>
            </motion.h2>
          </motion.div>

          <motion.div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={staggerContainer}
          >
            {FEATURES.map((f) => (
              <motion.div
                key={f.title}
                className="feat-card"
                style={{ '--ca': f.accent, '--ca-dim': f.accent + '10' } as React.CSSProperties}
                variants={cardVariant}
                whileHover={{ y: -5, transition: { duration: 0.22 } }}
              >
                <div className="feat-icon" style={{ background: f.accent + '18', border: `1px solid ${f.accent}30` }}>
                  {React.cloneElement(f.icon as React.ReactElement<{ size?: number; color?: string; strokeWidth?: number }>, {
                    size: 19, color: f.accent, strokeWidth: 1.75,
                  })}
                </div>
                <h3 style={{ fontFamily: 'var(--ff-display)', fontWeight: 700, fontSize: '1.0625rem', color: 'var(--lp-text)', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: '.875rem', lineHeight: 1.65, color: 'var(--lp-muted)' }}>{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        <div className="lp-divider" style={{ maxWidth: 1200, margin: '0 auto' }} />

        {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
        <section id="how-it-works" style={{ padding: '96px 24px', maxWidth: 1200, margin: '0 auto' }}>
          <motion.div
            style={{ textAlign: 'center', marginBottom: 60 }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={staggerContainer}
          >
            <motion.div className="lp-tag" style={{ marginBottom: 14 }} variants={fadeUp}>
              <Activity size={10} /> The workflow
            </motion.div>
            <motion.h2 className="lp-h2" variants={fadeUp}>From idea to ship in three steps</motion.h2>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 40, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 27, left: '18%', right: '18%', height: 1, background: 'linear-gradient(90deg,var(--lp-cyan),var(--lp-violet),var(--lp-cyan))', opacity: .22 }} />

            {STEPS.map((step, i) => (
              <motion.div
                key={step.n}
                style={{ textAlign: 'center', position: 'relative' }}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={fadeUp}
                transition={{ delay: i * 0.14 } as never}
              >
                <motion.div
                  style={{ width: 54, height: 54, borderRadius: 15, background: 'var(--lp-surface)', border: '1px solid var(--lp-border-hi)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', color: 'var(--lp-cyan)' }}
                  variants={scaleIn}
                >
                  {step.icon}
                </motion.div>
                <div className="lp-step-n">{step.n}</div>
                <h3 style={{ fontFamily: 'var(--ff-display)', fontWeight: 700, fontSize: '1.0625rem', color: 'var(--lp-text)', margin: '10px 0 10px' }}>{step.title}</h3>
                <p style={{ fontSize: '.875rem', lineHeight: 1.65, color: 'var(--lp-muted)' }}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── STATS ────────────────────────────────────────────────────── */}
        <div style={{ background: 'var(--lp-surface)', borderTop: '1px solid var(--lp-border)', borderBottom: '1px solid var(--lp-border)', padding: '60px 24px' }}>
          <motion.div
            style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24, textAlign: 'center' }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={staggerContainerSlow}
          >
            {STATS.map((s) => (
              <motion.div
                key={s.label}
                variants={{
                  hidden:  { opacity: 0, scale: 0.8, y: 16 },
                  visible: { opacity: 1, scale: 1,   y: 0, transition: { duration: 0.55, ease: EASE_SPRING } },
                }}
              >
                <div className="lp-stat-n">{s.n}</div>
                <p style={{ fontFamily: 'var(--ff-mono)', fontSize: '.72rem', color: 'var(--lp-muted)', marginTop: 8, letterSpacing: '.06em' }}>{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* ── ROLES ────────────────────────────────────────────────────── */}
        <section id="team" style={{ padding: '96px 24px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center' }}>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              variants={staggerContainer}
            >
              <motion.div className="lp-tag" style={{ marginBottom: 14 }} variants={fadeUp}>
                <Shield size={10} /> Role-based access
              </motion.div>
              <motion.h2 className="lp-h2" style={{ marginBottom: 18 }} variants={fadeUp}>
                Built for every<br />role on your team
              </motion.h2>
              <motion.p style={{ fontSize: '1rem', lineHeight: 1.72, color: 'var(--lp-muted)', marginBottom: 32 }} variants={fadeUp}>
                Veltroqis adapts to how each person works. Developers, designers, QA engineers, project leads, and admins all get tailored views and appropriate permissions — out of the box.
              </motion.p>
              <motion.div variants={fadeUp}>
                <Link to="/signup" className="btn-cyan" style={{ display: 'inline-flex' }}>
                  Build your team <ArrowRight size={16} />
                </Link>
              </motion.div>
            </motion.div>

            <motion.div
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={staggerContainerSlow}
            >
              {ROLES.map((r) => (
                <motion.div
                  key={r.role}
                  className="role-card"
                  style={{ border: `1px solid ${r.color}22` }}
                  variants={cardVariant}
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: r.color, boxShadow: `0 0 7px ${r.color}` }} />
                    <span style={{ fontFamily: 'var(--ff-display)', fontWeight: 700, fontSize: '.8125rem', color: 'var(--lp-text)' }}>{r.role}</span>
                  </div>
                  <p style={{ fontSize: '.75rem', lineHeight: 1.5, color: 'var(--lp-muted)' }}>{r.desc}</p>
                </motion.div>
              ))}
            </motion.div>

          </div>
        </section>

        {/* ── FINAL CTA ─────────────────────────────────────────────────── */}
        <section style={{ padding: '100px 24px', position: 'relative', overflow: 'hidden' }}>
          <div className="lp-orb" style={{ width: 700, height: 700, background: 'radial-gradient(circle,rgba(0,212,255,.11) 0%,transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
          <motion.div
            style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', position: 'relative' }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={staggerContainer}
          >
            <motion.div className="lp-tag" style={{ marginBottom: 18 }} variants={fadeUp}>
              <Sparkles size={10} /> Start today
            </motion.div>
            <motion.h2 className="lp-h2" style={{ marginBottom: 14 }} variants={fadeUp}>
              Your next sprint starts<br />
              <span style={{ color: 'var(--lp-cyan)' }}>right here.</span>
            </motion.h2>
            <motion.p style={{ fontSize: '1rem', lineHeight: 1.72, color: 'var(--lp-muted)', marginBottom: 38 }} variants={fadeUp}>
              Join thousands of dev teams who ship faster, track smarter, and collaborate without chaos using Veltroqis.
            </motion.p>
            <motion.div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }} variants={fadeUp}>
              <Link to="/signup" className="btn-cyan"    style={{ fontSize: '.9375rem', padding: '14px 30px' }}>Create your workspace <ArrowRight size={16} /></Link>
              <Link to="/login"  className="btn-outline" style={{ fontSize: '.9375rem', padding: '14px 22px' }}>Sign in</Link>
            </motion.div>
            <motion.p style={{ marginTop: 18, fontSize: '.775rem', color: 'var(--lp-muted)', fontFamily: 'var(--ff-mono)' }} variants={fadeUp}>
              No credit card required · Free forever for small teams
            </motion.p>
          </motion.div>
        </section>

        {/* ── FOOTER ──────────────────────────────────────────────────── */}
        <footer className="lp-footer">
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg,#00d4ff,#0077ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={12} color="#050d1a" strokeWidth={2.5} />
              </div>
              <span style={{ fontFamily: 'var(--ff-display)', fontWeight: 800, fontSize: '.875rem', letterSpacing: '.12em', color: 'var(--lp-text)' }}>VELTROQIS</span>
            </div>
            <div style={{ display: 'flex', gap: 22 }}>
              {['Features', 'Docs', 'Changelog', 'Privacy'].map((l) => (
                <span key={l} style={{ fontSize: '.8rem', color: 'var(--lp-muted)', cursor: 'default', fontFamily: 'var(--ff-body)' }}>{l}</span>
              ))}
            </div>
            <p style={{ fontSize: '.72rem', color: 'var(--lp-muted)', fontFamily: 'var(--ff-mono)' }}>
              © 2026 Veltroqis. All rights reserved.
            </p>
          </div>
        </footer>

      </div>
    </>
  );
};
