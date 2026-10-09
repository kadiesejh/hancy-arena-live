
'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabaseBrowser } from '../lib/supabase';

type AuthMode = 'signup' | 'login' | 'forgot' | 'reset';

const events = [
  {
    name: 'Hancy Weekly Cup',
    type: '5v5 • Knockout',
    entry: 'NPR 100',
    prize: 'NPR 2,000',
  },
  {
    name: 'Night Battle',
    type: '5v5 • Best of 1',
    entry: 'NPR 50',
    prize: 'NPR 1,000',
  },
  {
    name: 'Hancy Championship',
    type: '5v5 • Best of 3',
    entry: 'NPR 250',
    prize: 'NPR 5,000',
  },
];

export default function Home() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<AuthMode>('signup');
  const [session, setSession] = useState<Session | null>(null);
  const [dashboard, setDashboard] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');

  useEffect(() => {
    let mounted = true;
    const sb = supabaseBrowser();

    if (!sb) return;

    sb.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;

      if (error) {
        setMsg(error.message);
        return;
      }

      setSession(data.session);

      if (data.session) {
        setEmail(data.session.user.email ?? '');
        setDashboard(true);
      }
    });

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      setSession(newSession);

      if (newSession?.user.email) {
        setEmail(newSession.user.email);
      }

      if (event === 'SIGNED_IN' && newSession) {
        setDashboard(true);
      }

      if (event === 'SIGNED_OUT') {
        setDashboard(false);
        setMode('login');
      }

      if (event === 'PASSWORD_RECOVERY') {
        setDashboard(false);
        setMode('reset');
        setMsg('Enter your new password below.');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  function openAuth(nextMode: AuthMode) {
    setMode(nextMode);
    setMsg('');
    setDashboard(false);
    window.location.hash = 'login';
  }

  async function handleAuth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg('');
    setBusy(true);

    try {
      const sb = supabaseBrowser();

      if (!sb) {
        setMsg('Supabase keys missing. Check your environment variables.');
        return;
      }

      if (mode === 'signup') {
        const { data, error } = await sb.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        if (data.session) {
          setSession(data.session);
          setDashboard(true);
          setMsg('');
        } else {
          setMsg(
            'Account created! Check your email to confirm your account, then log in.'
          );
          setMode('login');
        }
      } else if (mode === 'login') {
        const { data, error } = await sb.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        setSession(data.session);
        setDashboard(true);
        setMsg('');
      } else if (mode === 'forgot') {
        const { error } = await sb.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: window.location.origin,
          }
        );

        if (error) throw error;

        setMsg('Password reset email sent! Check your inbox.');
      } else if (mode === 'reset') {
        const { error } = await sb.auth.updateUser({
          password: newPassword,
        });

        if (error) throw error;

        setPassword('');
        setNewPassword('');
        setMode('login');
        setMsg('Password updated successfully. Please log in.');
      }
    } catch (error) {
      setMsg(
        error instanceof Error ? error.message : 'Something went wrong.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    const sb = supabaseBrowser();

    if (!sb) {
      setMsg('Supabase configuration is missing.');
      return;
    }

    setBusy(true);
    const { error } = await sb.auth.signOut();
    setBusy(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    setSession(null);
    setDashboard(false);
    setMode('login');
    setPassword('');
    setMsg('You have logged out successfully.');
    window.location.hash = 'login';
  }

  const btnStyle = {
    display: 'inline-block',
    border: 'none',
    borderRadius: '10px',
    padding: '12px 18px',
    fontWeight: 700,
    cursor: 'pointer',
    background: '#a3ff12',
    color: '#101010',
    textDecoration: 'none',
  } as const;

  const panelStyle = {
    background: '#171a22',
    border: '1px solid #303542',
    borderRadius: '16px',
    padding: '20px',
  } as const;

  const mutedStyle = {
    color: '#a6adbb',
    fontSize: '14px',
  } as const;

  const fieldStyle = {
    width: '100%',
    boxSizing: 'border-box' as const,
    padding: '13px',
    borderRadius: '9px',
    border: '1px solid #424957',
    background: '#0e1118',
    color: '#ffffff',
    marginBottom: '12px',
  };

  // PLAYER DASHBOARD
  if (dashboard && session) {
    return (
      <main
        style={{
          minHeight: '100vh',
          background: '#0b0d12',
          color: '#fff',
          padding: '20px',
        }}
      >
        <div style={{ maxWidth: '1150px', margin: '0 auto' }}>
          <header
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '15px',
              padding: '12px 0 25px',
              borderBottom: '1px solid #292e39',
            }}
          >
            <div
              style={{
                fontSize: '24px',
                fontWeight: 900,
                letterSpacing: '1px',
              }}
            >
              HANCY <span style={{ color: '#a3ff12' }}>ARENA</span>
            </div>

            <button
              onClick={logout}
              disabled={busy}
              style={btnStyle}
            >
              {busy ? 'Please wait...' : 'Logout'}
            </button>
          </header>

          <section style={{ padding: '32px 0 22px' }}>
            <p style={{ color: '#a3ff12', fontWeight: 700 }}>
              PLAYER PANEL
            </p>
            <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', margin: '8px 0' }}>
              Welcome to Hancy Arena! 🎮
            </h1>
            <p style={mutedStyle}>
              Logged in as: {session.user.email}
            </p>
          </section>

          <nav
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              marginBottom: '25px',
            }}
          >
            {['Overview', 'Tournaments', 'My Team', 'Match Results', 'Profile'].map(
              (tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    ...btnStyle,
                    background: activeTab === tab ? '#a3ff12' : '#202530',
                    color: activeTab === tab ? '#101010' : '#ffffff',
                  }}
                >
                  {tab}
                </button>
              )
            )}
          </nav>

          {activeTab === 'Overview' && (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '16px',
                  marginBottom: '28px',
                }}
              >
                <div style={panelStyle}>
                  <p style={mutedStyle}>My Tournaments</p>
                  <h2>0</h2>
                </div>
                <div style={panelStyle}>
                  <p style={mutedStyle}>Team Members</p>
                  <h2>0</h2>
                </div>
                <div style={panelStyle}>
                  <p style={mutedStyle}>Matches Played</p>
                  <h2>0</h2>
                </div>
                <div style={panelStyle}>
                  <p style={mutedStyle}>Total Winnings</p>
                  <h2>NPR 0</h2>
                </div>
              </div>

              <div style={panelStyle}>
                <h2>🏆 Featured Tournaments</h2>
                <p style={mutedStyle}>
                  Explore tournaments and check their entry fees and prize pools.
                </p>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '16px',
                    marginTop: '20px',
                  }}
                >
                  {events.map((event) => (
                    <div
                      key={event.name}
                      style={{
                        ...panelStyle,
                        background: '#10131a',
                      }}
                    >
                      <span style={{ color: '#a3ff12', fontWeight: 700 }}>
                        OPEN
                      </span>
                      <h3>{event.name}</h3>
                      <p style={mutedStyle}>{event.type}</p>
                      <p>Entry: {event.entry}</p>
                      <p>Prize Pool: {event.prize}</p>
                      <button
                        onClick={() => setActiveTab('Tournaments')}
                        style={btnStyle}
                      >
                        View Tournament
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'Tournaments' && (
            <section style={panelStyle}>
              <h2>🔥 Available Tournaments</h2>
              <p style={mutedStyle}>
                Choose a tournament to view its entry fee and prize pool.
              </p>
              {events.map((event) => (
                <div
                  key={event.name}
                  style={{
                    padding: '16px 0',
                    borderBottom: '1px solid #303542',
                  }}
                >
                  <h3>{event.name}</h3>
                  <p style={mutedStyle}>{event.type}</p>
                  <p>Entry: {event.entry} • Prize: {event.prize}</p>
                  <p style={mutedStyle}>
                    Registration will be enabled after the tournament database
                    and registration system are connected.
                  </p>
                </div>
              ))}
            </section>
          )}

          {activeTab === 'My Team' && (
            <section style={panelStyle}>
              <h2>👥 My Team</h2>
              <p style={mutedStyle}>
                You have not joined a team yet. Team creation and member
                management need to be connected to the database.
              </p>
            </section>
          )}

          {activeTab === 'Match Results' && (
            <section style={panelStyle}>
              <h2>🏆 Match Results</h2>
              <p style={mutedStyle}>
                Your match results will appear here after matches and results
                are connected to the database.
              </p>
            </section>
          )}

          {activeTab === 'Profile' && (
            <section style={panelStyle}>
              <h2>👤 My Profile</h2>
              <p style={mutedStyle}>Account email</p>
              <p>{session.user.email}</p>
              <p style={mutedStyle}>
                Your account is signed in with Supabase authentication.
              </p>
            </section>
          )}

          <footer
            style={{
              textAlign: 'center',
              padding: '35px 0 10px',
              color: '#a6adbb',
            }}
          >
            © 2026 Hancy Arena • MLBB Tournament Platform
          </footer>
        </div>
      </main>
    );
  }

  // ORIGINAL HOMEPAGE + AUTHENTICATION
  return (
    <>
      <header>
        <div className="wrap nav">
          <div className="logo">
            HANCY<span>ARENA</span>
          </div>
          <div className="links">
            <a href="#home">Home</a>
            <a href="#tournaments">Tournaments</a>
            <a href="#leaderboard">Leaderboard</a>
            <a href="#login" onClick={() => openAuth('login')}>
              Login
            </a>
          </div>
        </div>
      </header>

      <main id="home">
        <div className="wrap">
          <section className="hero">
            <div>
              <span className="badge">⚡ REAL MLBB TOURNAMENT PLATFORM</span>
              <h1>
                Play. Compete.
                <br />
                <span>Win.</span>
              </h1>
              <p>
                Hancy Arena is your place to join Mobile Legends tournaments,
                register your squad and track competition results.
              </p>
              <a className="btn" href="#tournaments">
                Join Tournament
              </a>
              <a
                className="btn alt"
                href="#login"
                onClick={() => openAuth('signup')}
              >
                Create Account
              </a>
            </div>

            <div className="panel">
              <div className="trophy">🏆</div>
              <h2 style={{ textAlign: 'center' }}>HANCY ARENA</h2>
              <p className="muted" style={{ textAlign: 'center' }}>
                Your MLBB tournament platform.
              </p>
            </div>
          </section>

          <section className="section">
            <div className="stats">
              <div className="panel stat">
                <strong>24+</strong>
                <span className="muted">Teams</span>
              </div>
              <div className="panel stat">
                <strong>08</strong>
                <span className="muted">Events</span>
              </div>
              <div className="panel stat">
                <strong>NPR 50K+</strong>
                <span className="muted">Prize Pool</span>
              </div>
              <div className="panel stat">
                <strong>4.9★</strong>
                <span className="muted">Rating</span>
              </div>
            </div>
          </section>

          <section className="section" id="tournaments">
            <h2>🔥 Featured Tournaments</h2>
            <p className="muted">
              Explore the featured Hancy Arena tournaments.
            </p>
            <div className="grid">
              {events.map((event) => (
                <div className="panel card" key={event.name}>
                  <span className="status">OPEN</span>
                  <h3>{event.name}</h3>
                  <p className="muted">{event.type}</p>
                  <b>Entry: {event.entry}</b>
                  <p className="muted">Prize Pool: {event.prize}</p>
                  <a
                    className="btn"
                    href="#login"
                    onClick={() => openAuth('login')}
                  >
                    Register
                  </a>
                </div>
              ))}
            </div>
          </section>

          <section className="section" id="leaderboard">
            <h2>🏆 Leaderboard</h2>
            <div className="panel">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Team</th>
                    <th>Wins</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td>Hancy Warriors</td>
                    <td>8</td>
                    <td>240</td>
                  </tr>
                  <tr>
                    <td>2</td>
                    <td>Shadow Five</td>
                    <td>7</td>
                    <td>210</td>
                  </tr>
                  <tr>
                    <td>3</td>
                    <td>Nova Squad</td>
                    <td>6</td>
                    <td>185</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="section" id="login">
            <h2>
              {mode === 'signup' && '📝 Create Account'}
              {mode === 'login' && '🔐 Login to Hancy Arena'}
              {mode === 'forgot' && '🔑 Forgot Password'}
              {mode === 'reset' && '🔒 Set New Password'}
            </h2>

            <p className="muted">
              {mode === 'signup' && 'Create your player account.'}
              {mode === 'login' && 'Welcome back! Log in to open your dashboard.'}
              {mode === 'forgot' && 'We will send a password reset link to your email.'}
              {mode === 'reset' && 'Enter a new password for your account.'}
            </p>

            <div className="panel">
              <form className="form" onSubmit={handleAuth}>
                {mode !== 'reset' && (
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                )}

                {(mode === 'signup' || mode === 'login') && (
                  <input
                    type="password"
                    placeholder="Password (minimum 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    autoComplete={
                      mode === 'signup' ? 'new-password' : 'current-password'
                    }
                    required
                  />
                )}

                {mode === 'reset' && (
                  <input
                    type="password"
                    placeholder="New password (minimum 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                    autoComplete="new-password"
                    required
                  />
                )}

                <button className="btn" disabled={busy}>
                  {busy
                    ? 'Please wait...'
                    : mode === 'signup'
                      ? 'Create Account'
                      : mode === 'login'
                        ? 'Login'
                        : mode === 'forgot'
                          ? 'Send Reset Link'
                          : 'Update Password'}
                </button>

                {msg && (
                  <p
                    role="status"
                    style={{
                      marginTop: '14px',
                      color:
                        /successful|sent!|created!|updated successfully|welcome/i.test(
                          msg
                        )
                          ? '#4ade80'
                          : '#f87171',
                    }}
                  >
                    {msg}
                  </p>
                )}
              </form>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '10px',
                  marginTop: '16px',
                }}
              >
                {mode !== 'login' && mode !== 'reset' && (
                  <button
                    type="button"
                    className="btn alt"
                    onClick={() => openAuth('login')}
                  >
                    Login
                  </button>
                )}

                {mode !== 'signup' && mode !== 'reset' && (
                  <button
                    type="button"
                    className="btn alt"
                    onClick={() => openAuth('signup')}
                  >
                    Create Account
                  </button>
                )}

                {mode === 'login' && (
                  <button
                    type="button"
                    className="btn alt"
                    onClick={() => openAuth('forgot')}
                  >
                    Forgot Password?
                  </button>
                )}

                {mode === 'reset' && (
                  <button
                    type="button"
                    className="btn alt"
                    onClick={() => openAuth('login')}
                  >
                    Back to Login
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer>© 2026 Hancy Arena • MLBB Tournament Platform</footer>
    </>
  );
}
