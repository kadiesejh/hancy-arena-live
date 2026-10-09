
'use client';

import { FormEvent, useEffect, useState } from 'react';
import { supabaseBrowser } from '../lib/supabase';

const games = [
  { name: 'Mobile Legends', icon: '⚔️', color: '#7257ff', description: '5v5 MOBA', logo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mobile_Legends_Logo.webp' },
  { name: 'PUBG Mobile', icon: '🎯', color: '#f5a623', description: 'Battle Royale', logo: 'https://www.pubgmobile.com/images/event/brandassets/down-logo1.png' },
  { name: 'Free Fire', icon: '🔥', color: '#ff5738', description: 'Survival Battle', logo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Freefirelogo.png' },
  { name: 'Ludo King', icon: '🎲', color: '#20c997', description: 'Classic Board Game', logo: 'https://brandlogos.sgp1.digitaloceanspaces.com/png/arcticons/ludo-king-400.png' },
];

type Tournament = {
  id: string;
  name: string;
  game_name?: string;
  format?: string;
  entry_fee_npr?: number;
  prize_pool_npr?: number;
  entry_fee?: number;
  prize_pool?: number;
  start_at?: string;
  status?: string;
  [key: string]: unknown;
};

export default function Home() {
  const [selectedGame, setSelectedGame] = useState('All Games');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);

  const [user, setUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [playerName, setPlayerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [captainName, setCaptainName] = useState('');
  const [gameId, setGameId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [phone, setPhone] = useState('');
  const [registrationMsg, setRegistrationMsg] = useState('');
  const [registrationBusy, setRegistrationBusy] = useState(false);

  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) {
      setLoadingTournaments(false);
      setMsg('Supabase keys missing. Check environment variables.');
      return;
    }

    let mounted = true;

    async function loadTournaments() {
      const { data, error } = await sb!
        .from('tournaments')
        .select('*')
        .order('start_at', { ascending: true });

      if (!mounted) return;

      if (error) {
        setMsg(`Tournament loading error: ${error.message}`);
      } else {
        setTournaments((data || []) as Tournament[]);
      }

      setLoadingTournaments(false);
    }

    async function loadSession() {
      const { data } = await sb!.auth.getSession();
      if (mounted) setUser(data.session?.user ?? null);
    }

    void loadTournaments();
    void loadSession();

    const { data: authListener } = sb.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const filteredTournaments = tournaments.filter((t) => {
    if (selectedGame === 'All Games') return true;
    return getGameName(t) === selectedGame;
  });

  function getGameName(t: Tournament) {
    if (typeof t.game_name === 'string' && t.game_name) return t.game_name;

    const name = t.name.toLowerCase();
    if (name.includes('pubg')) return 'PUBG Mobile';
    if (name.includes('free fire')) return 'Free Fire';
    if (name.includes('ludo')) return 'Ludo King';
    return 'Mobile Legends';
  }

  function getFee(t: Tournament) {
    return Number(t.entry_fee_npr || t.entry_fee || 0);
  }

  function getPrize(t: Tournament) {
    return Number(t.prize_pool_npr || t.prize_pool || 0);
  }

  function formatMoney(amount: number) {
    return `NPR ${amount.toLocaleString('en-IN')}`;
  }

  async function handleAuth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg('');
    setBusy(true);

    try {
      const sb = supabaseBrowser();
      if (!sb) {
        setMsg('Supabase keys missing. Check environment variables.');
        return;
      }

      if (authMode === 'signup') {
        const { data, error } = await sb.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { player_name: playerName.trim() },
          },
        });

        if (error) {
          setMsg(`Signup error: ${error.message}`);
        } else if (data.session) {
          setUser(data.user);
          setMsg('Account created successfully! Ab tournament register kar sakte ho.');
          setCaptainName(playerName.trim());
          setPlayerName('');
          setEmail('');
          setPassword('');
        } else {
          setMsg('Account created! Email confirmation enabled hai to Gmail check karo, phir Sign In karo.');
          setAuthMode('signin');
          setPassword('');
        }
      } else {
        const { data, error } = await sb.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          setMsg(`Sign in error: ${error.message}`);
        } else {
          setUser(data.user);
          setCaptainName(
            String(data.user.user_metadata?.player_name || '')
          );
          setMsg('Login successful! Ab tournament register kar sakte ho.');
          setEmail('');
          setPassword('');
        }
      }
    } catch {
      setMsg('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRegistration(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setRegistrationMsg('');

    if (!selectedTournament) {
      setRegistrationMsg('Pehle tournament select karo.');
      return;
    }

    if (!user) {
      setRegistrationMsg('Registration se pehle account mein Sign In karo.');
      document.getElementById('login')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setRegistrationBusy(true);

    try {
      const sb = supabaseBrowser();
      if (!sb) {
        setRegistrationMsg('Supabase connection missing hai.');
        return;
      }

      // Save the player's game details in their own profile.
      const { error: profileError } = await sb
        .from('players')
        .update({
          game_name: getGameName(selectedTournament),
          game_id: gameId.trim(),
        })
        .eq('id', user.id);

      if (profileError) {
        setRegistrationMsg(`Profile error: ${profileError.message}`);
        return;
      }

      // Save the tournament registration.
      const { error: registrationError } = await sb
        .from('registrations')
        .insert({
          user_id: user.id,
          tournament_id: selectedTournament.id,
          team_name: teamName.trim(),
          captain_name: captainName.trim(),
          phone: phone.trim(),
        });

      if (registrationError) {
        if (
          registrationError.code === '23505' ||
          registrationError.message.toLowerCase().includes('duplicate')
        ) {
          setRegistrationMsg('Tum is tournament mein pehle hi register ho chuke ho.');
        } else {
          setRegistrationMsg(`Registration error: ${registrationError.message}`);
        }
        return;
      }

      setRegistrationMsg(`Registration successful! Tournament: ${selectedTournament.name}`);
      setTeamName('');
      setPhone('');
      setGameId('');
    } catch {
      setRegistrationMsg('Registration nahi ho payi. Dobara try karo.');
    } finally {
      setRegistrationBusy(false);
    }
  }

  async function logout() {
    const sb = supabaseBrowser();
    if (!sb) return;

    const { error } = await sb.auth.signOut();
    if (error) {
      setMsg(`Logout error: ${error.message}`);
    } else {
      setUser(null);
      setMsg('You have been signed out.');
      setSelectedTournament(null);
      setRegistrationMsg('');
    }
  }

  return (
    <>
      <header>
        <div className="wrap nav">
          <div className="logo">HANCY<span>ARENA</span></div>
          <div className="links">
            <a href="#home">Home</a>
            <a href="#games">Games</a>
            <a href="#tournaments">Tournaments</a>
            <a href="#leaderboard">Leaderboard</a>
            <a href="#login">{user ? 'My Account' : 'Sign In'}</a>
          </div>
        </div>
      </header>

      <main id="home">
        <div className="wrap">
          <section className="hero">
            <div>
              <span className="badge">⚡ MULTI-GAME TOURNAMENT PLATFORM</span>
              <h1>Play. Compete.<br /><span>Win.</span></h1>
              <p>Hancy Arena mein apni squad banao, tournaments join karo aur competition mein apna naam banao.</p>
              <a className="btn" href="#games">Explore Games</a>{' '}
              <a className="btn alt" href="#tournaments">View Tournaments</a>
            </div>

            <div className="panel hero-panel">
              <div className="trophy">🏆</div>
              <h2>HANCY ARENA</h2>
              <p className="muted">Choose your game. Join the battle.</p>
              <div className="hero-icons"><span>⚔️</span><span>🎯</span><span>🔥</span><span>🎲</span></div>
            </div>
          </section>

          <section className="section">
            <div className="stats">
              <div className="panel stat"><strong>{tournaments.length}</strong><span className="muted">Tournaments</span></div>
              <div className="panel stat"><strong>{new Set(tournaments.map((t) => t.game_name || getGameName(t))).size}</strong><span className="muted">Games</span></div>
              <div className="panel stat"><strong>NPR</strong><span className="muted">Prize pools</span></div>
              <div className="panel stat"><strong>{user ? 'ONLINE' : 'JOIN US'}</strong><span className="muted">Player status</span></div>
            </div>
          </section>

          <section className="section" id="games">
            <h2>🎮 Choose Your Game</h2>
            <p className="muted">Game select karo aur uske tournaments dekho.</p>
            <div className="game-grid">
              <button type="button" className={`game-card all-card ${selectedGame === 'All Games' ? 'selected' : ''}`} onClick={() => setSelectedGame('All Games')}>
                <span className="game-icon all-icon">🎮</span>
                <strong>All Games</strong><small>All tournaments</small>
              </button>

              {games.map((game) => (
                <button type="button" key={game.name} className={`game-card ${selectedGame === game.name ? 'selected' : ''}`} style={{ '--game-color': game.color } as React.CSSProperties} onClick={() => setSelectedGame(game.name)}>
                  <span className="game-icon">
                    <img src={game.logo} alt={`${game.name} logo`} className="game-logo" loading="lazy" onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                      if (fallback) fallback.style.display = 'grid';
                    }} />
                    <span className="logo-fallback">{game.icon}</span>
                  </span>
                  <strong>{game.name}</strong><small>{game.description}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="section" id="tournaments">
            <h2>🔥 Featured Tournaments</h2>
            <p className="muted">{selectedGame === 'All Games' ? 'Database se available tournaments.' : `${selectedGame} ke tournaments`}</p>

            {loadingTournaments && <div className="panel card">Tournaments load ho rahe hain...</div>}

            {!loadingTournaments && (
              <div className="grid">
                {filteredTournaments.map((tournament) => {
                  const gameName = getGameName(tournament);
                  const game = games.find((g) => g.name === gameName);

                  return (
                    <div className="panel card" key={tournament.id}>
                      <span className="status">{tournament.status || 'OPEN'}</span>
                      <div className="event-game">
                        <span className="event-logo-box">
                          <span>{game?.icon || '🎮'}</span>
                        </span>
                        <small>{gameName}</small>
                      </div>
                      <h3>{tournament.name}</h3>
                      <p className="muted">{String(tournament.format || 'Tournament')}</p>
                      <b>Entry: {formatMoney(getFee(tournament))}</b>
                      <p className="muted">Prize Pool: {formatMoney(getPrize(tournament))}</p>
                      {tournament.start_at && (
                        <p className="muted">Starts: {new Date(tournament.start_at).toLocaleString()}</p>
                      )}
                      <button
                        type="button"
                        className="btn"
                        disabled={String(tournament.status || 'open').toLowerCase() !== 'open'}
                        onClick={() => {
                          setSelectedTournament(tournament);
                          setRegistrationMsg('');
                          document.getElementById('register-form')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        Register
                      </button>
                    </div>
                  );
                })}

                {filteredTournaments.length === 0 && !loadingTournaments && (
                  <div className="panel card">
                    <h3>Abhi tournament available nahi hai.</h3>
                    <p className="muted">Supabase ke tournaments table mein open tournaments check karo.</p>
                  </div>
                )}
              </div>
            )}
          </section>

          {selectedTournament && (
            <section className="section" id="register-form">
              <h2>📝 Tournament Registration</h2>
              <div className="panel registration-panel">
                <h3>{selectedTournament.name}</h3>
                <p className="muted">
                  {getGameName(selectedTournament)} · Entry {formatMoney(getFee(selectedTournament))}
                </p>

                {!user && (
                  <p className="muted">Registration submit karne ke liye pehle neeche account banao ya Sign In karo.</p>
                )}

                <form className="form" onSubmit={handleRegistration}>
                  <input
                    type="text"
                    placeholder="Captain / Player Name"
                    value={captainName}
                    onChange={(e) => setCaptainName(e.target.value)}
                    minLength={2}
                    maxLength={60}
                    required
                  />
                  <input
                    type="text"
                    placeholder="In-game ID / UID"
                    value={gameId}
                    onChange={(e) => setGameId(e.target.value)}
                    maxLength={100}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Team Name"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    maxLength={80}
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={25}
                    required
                  />

                  <button className="btn" disabled={registrationBusy}>
                    {registrationBusy ? 'Registering...' : 'Submit Registration'}
                  </button>
                  <button type="button" className="btn alt" onClick={() => {
                    setSelectedTournament(null);
                    setRegistrationMsg('');
                  }}>
                    Cancel
                  </button>

                  {registrationMsg && <div className={`msg ${registrationMsg.toLowerCase().includes('error') || registrationMsg.toLowerCase().includes('nahi') ? 'err' : ''}`} role="status">{registrationMsg}</div>}
                </form>
              </div>
            </section>
          )}

          <section className="section" id="leaderboard">
            <h2>🏆 Leaderboard</h2>
            <div className="panel">
              <table className="table">
                <thead><tr><th>#</th><th>Team</th><th>Wins</th><th>Points</th></tr></thead>
                <tbody>
                  <tr><td>1</td><td>Hancy Warriors</td><td>8</td><td>240</td></tr>
                  <tr><td>2</td><td>Shadow Five</td><td>7</td><td>210</td></tr>
                  <tr><td>3</td><td>Nova Squad</td><td>6</td><td>185</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="section" id="login">
            <h2>🔐 {user ? 'Your Account' : authMode === 'signup' ? 'Create Account' : 'Sign In'}</h2>
            <p className="muted">
              {user ? `Logged in as ${user.email}` : 'Account banao ya apne existing account mein login karo.'}
            </p>

            <div className="panel">
              {user ? (
                <div className="form">
                  <p>Login successful. Ab tournament select karke registration submit kar sakte ho.</p>
                  <button type="button" className="btn alt" onClick={logout}>Sign Out</button>
                </div>
              ) : (
                <form className="form" onSubmit={handleAuth}>
                  {authMode === 'signup' && (
                    <input type="text" placeholder="Player Name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} minLength={2} maxLength={40} required />
                  )}
                  <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <input type="password" placeholder="Password (minimum 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
                  <button className="btn" disabled={busy}>{busy ? 'Please wait...' : authMode === 'signup' ? 'Create Account' : 'Sign In'}</button>
                  <button type="button" className="btn alt" onClick={() => {
                    setAuthMode(authMode === 'signup' ? 'signin' : 'signup');
                    setMsg('');
                  }}>
                    {authMode === 'signup' ? 'Already have an account? Sign In' : 'New player? Create Account'}
                  </button>
                </form>
              )}

              {msg && <div className={`msg ${msg.toLowerCase().includes('error') || msg.toLowerCase().includes('missing') || msg.toLowerCase().includes('failed') ? 'err' : ''}`} role="status">{msg}</div>}
            </div>
          </section>
        </div>
      </main>

      <footer>© 2026 Hancy Arena • Multi-Game Tournament Platform</footer>

      <style jsx>{`
        .game-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          margin-top: 22px;
        }
        .game-card {
          --game-color: #7257ff;
          min-width: 0;
          min-height: 180px;
          padding: 20px 12px;
          border: 1px solid rgba(255,255,255,.14);
          border-radius: 18px;
          background: linear-gradient(145deg,#191d35,#0c0f1c);
          color: inherit;
          text-align: center;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          transition: transform .25s ease,border-color .25s ease,box-shadow .25s ease;
        }
        .game-card:hover { transform: translateY(-4px); border-color: var(--game-color); }
        .game-card.selected { border: 2px solid var(--game-color); background: linear-gradient(145deg,#242748,#111426); }
        .game-icon {
          position: relative; width: 100px; height: 100px; flex-shrink: 0;
          border-radius: 20px; display: grid; place-items: center; overflow: hidden;
          background: #fff; border: 2px solid var(--game-color);
        }
        .game-logo { display: block; width: 100%; height: 100%; object-fit: contain; padding: 2px; }
        .logo-fallback { display: none; position: absolute; inset: 0; place-items: center; font-size: 42px; background: #171b2d; }
        .all-card { --game-color: #fff; }
        .all-icon { background: #171b2d; font-size: 42px; }
        .game-card strong { font-size: 15px; font-weight: 700; }
        .game-card small { font-size: 12px; opacity: .75; }
        .event-game { display: flex; align-items: center; gap: 9px; margin-bottom: 12px; font-size: 13px; }
        .event-logo-box { display: grid; place-items: center; width: 42px; height: 42px; overflow: hidden; background: #171b2d; border-radius: 10px; flex-shrink: 0; font-size: 25px; }
        .hero-panel { text-align: center; padding: 28px; }
        .hero-icons { display: flex; justify-content: center; gap: 14px; margin-top: 20px; font-size: 27px; }
        .registration-panel { padding: 24px; }
        .form { display: flex; flex-direction: column; gap: 12px; }
        .form input { width: 100%; min-width: 0; box-sizing: border-box; padding: 13px 14px; border: 1px solid rgba(255,255,255,.18); border-radius: 10px; background: #101426; color: white; font: inherit; }
        .form input:focus { outline: 2px solid #7257ff; }
        .form button:disabled { opacity: .6; cursor: not-allowed; }
        .msg { margin-top: 12px; padding: 12px; border-radius: 10px; background: rgba(32,201,151,.12); overflow-wrap: anywhere; }
        .err { background: rgba(255,87,56,.14); }
        @media (max-width: 480px) {
          .game-grid { gap: 12px; }
          .game-card { min-height: 155px; padding: 16px 8px; }
          .game-icon { width: 88px; height: 88px; border-radius: 16px; }
          .game-card strong { font-size: 13px; }
        }
      `}</style>
    </>
  );
}
