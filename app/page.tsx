'use client';

import { FormEvent, useState } from 'react';
import { supabaseBrowser } from '../lib/supabase';

const games = [
  {
    name: 'Mobile Legends',
    icon: '⚔️',
    color: '#7257ff',
    description: '5v5 MOBA',
    logo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mobile_Legends_Logo.webp',
  },
  {
    name: 'PUBG Mobile',
    icon: '🎯',
    color: '#f5a623',
    description: 'Battle Royale',
    logo: 'https://www.pubgmobile.com/images/event/brandassets/down-logo1.png',
  },
  {
    name: 'Free Fire',
    icon: '🔥',
    color: '#ff5738',
    description: 'Survival Battle',
    logo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Freefirelogo.png',
  },
  {
    name: 'Ludo King',
    icon: '🎲',
    color: '#20c997',
    description: 'Classic Board Game',
    logo: 'https://brandlogos.sgp1.digitaloceanspaces.com/png/arcticons/ludo-king-400.png',
  },
];

const events = [
  { name: 'Hancy Weekly Cup', game: 'Mobile Legends', mode: '5v5 • Knockout', entry: 'NPR 100', prize: 'NPR 2,000' },
  { name: 'Night Battle', game: 'Mobile Legends', mode: '5v5 • Best of 1', entry: 'NPR 50', prize: 'NPR 1,000' },
  { name: 'Hancy Championship', game: 'Mobile Legends', mode: '5v5 • Best of 3', entry: 'NPR 250', prize: 'NPR 5,000' },
  { name: 'PUBG Squad Clash', game: 'PUBG Mobile', mode: 'Squad • Battle Royale', entry: 'NPR 100', prize: 'NPR 2,500' },
  { name: 'PUBG Night Survival', game: 'PUBG Mobile', mode: 'Squad • Survival', entry: 'NPR 50', prize: 'NPR 1,000' },
  { name: 'Free Fire Booyah Cup', game: 'Free Fire', mode: 'Squad • Battle Royale', entry: 'NPR 100', prize: 'NPR 2,000' },
  { name: 'Free Fire Clash', game: 'Free Fire', mode: 'Clash Squad', entry: 'NPR 50', prize: 'NPR 1,000' },
  { name: 'Hancy Ludo King Challenge', game: 'Ludo King', mode: '1v1 • Classic', entry: 'NPR 20', prize: 'NPR 300' },
];

export default function Home() {
  const [selectedGame, setSelectedGame] = useState('All Games');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const filteredEvents =
    selectedGame === 'All Games'
      ? events
      : events.filter((event) => event.game === selectedGame);

  async function signup(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    setBusy(true);

    try {
      const sb = supabaseBrowser();

      if (!sb) {
        setMsg('Supabase keys missing. Add them to .env.local');
        return;
      }

      const { error } = await sb.auth.signUp({ email, password });

      setMsg(
        error
          ? error.message
          : 'Account created! Check your email if confirmation is enabled.'
      );
    } catch {
      setMsg('Signup failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header>
        <div className="wrap nav">
          <div className="logo">
            HANCY<span>ARENA</span>
          </div>

          <div className="links">
            <a href="#home">Home</a>
            <a href="#games">Games</a>
            <a href="#tournaments">Tournaments</a>
            <a href="#leaderboard">Leaderboard</a>
            <a href="#login">Login</a>
          </div>
        </div>
      </header>

      <main id="home">
        <div className="wrap">
          <section className="hero">
            <div>
              <span className="badge">⚡ MULTI-GAME TOURNAMENT PLATFORM</span>
              <h1>
                Play. Compete.
                <br />
                <span>Win.</span>
              </h1>
              <p>
                Hancy Arena mein apni squad banao, tournaments join karo
                aur competition mein apna naam banao.
              </p>
              <a className="btn" href="#games">Explore Games</a>{' '}
              <a className="btn alt" href="#login">Create Account</a>
            </div>

            <div className="panel hero-panel">
              <div className="trophy">🏆</div>
              <h2>HANCY ARENA</h2>
              <p className="muted">Choose your game. Join the battle.</p>
              <div className="hero-icons">
                <span>⚔️</span>
                <span>🎯</span>
                <span>🔥</span>
                <span>🎲</span>
              </div>
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

          <section className="section" id="games">
            <h2>🎮 Choose Your Game</h2>
            <p className="muted">
              Game logo par tap karo aur uske tournaments dekho.
            </p>

            <div className="game-grid">
              <button
                type="button"
                className={`game-card all-card ${selectedGame === 'All Games' ? 'selected' : ''}`}
                onClick={() => setSelectedGame('All Games')}
              >
                <span className="game-icon all-icon">🎮</span>
                <strong>All Games</strong>
                <small>Select Game</small>
              </button>

              {games.map((game) => (
                <button
                  type="button"
                  key={game.name}
                  className={`game-card ${selectedGame === game.name ? 'selected' : ''}`}
                  style={{ '--game-color': game.color } as React.CSSProperties}
                  onClick={() => setSelectedGame(game.name)}
                >
                  <span className="game-icon">
                    <img
                      src={game.logo}
                      alt={`${game.name} logo`}
                      className="game-logo"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget
                          .nextElementSibling as HTMLElement | null;
                        if (fallback) fallback.style.display = 'grid';
                      }}
                    />
                    <span className="logo-fallback">{game.icon}</span>
                  </span>
                  <strong>{game.name}</strong>
                  <small>Select Game</small>
                </button>
              ))}
            </div>
          </section>

          <section className="section" id="tournaments">
            <h2>🔥 Featured Tournaments</h2>
            <p className="muted">
              {selectedGame === 'All Games'
                ? 'All games ke tournaments yahan dekho.'
                : `${selectedGame} ke tournaments`}
            </p>

            <div className="grid">
              {filteredEvents.map((event) => {
                const game = games.find((g) => g.name === event.game);

                return (
                  <div className="panel card" key={event.name}>
                    <span className="status">OPEN</span>
                    <div className="event-game">
                      {game && (
                        <span className="event-logo-box">
                          <img
                            src={game.logo}
                            alt={`${game.name} logo`}
                            className="event-logo"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget
                                .nextElementSibling as HTMLElement | null;
                              if (fallback) fallback.style.display = 'grid';
                            }}
                          />
                          <span className="event-logo-fallback">{game.icon}</span>
                        </span>
                      )}
                      <small>{event.game}</small>
                    </div>
                    <h3>{event.name}</h3>
                    <p className="muted">{event.mode}</p>
                    <b>Entry: {event.entry}</b>
                    <p className="muted">Prize Pool: {event.prize}</p>
                    <a className="btn" href="#login">Register</a>
                  </div>
                );
              })}

              {filteredEvents.length === 0 && (
                <div className="panel card">
                  <h3>Abhi tournament available nahi hai.</h3>
                  <p className="muted">Baad mein dobara check karo.</p>
                </div>
              )}
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
                  <tr><td>1</td><td>Hancy Warriors</td><td>8</td><td>240</td></tr>
                  <tr><td>2</td><td>Shadow Five</td><td>7</td><td>210</td></tr>
                  <tr><td>3</td><td>Nova Squad</td><td>6</td><td>185</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="section" id="login">
            <h2>🔐 Create Account</h2>
            <p className="muted">
              Apna account banao aur tournament registration shuru karo.
            </p>

            <div className="panel">
              <form className="form" onSubmit={signup}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Password (minimum 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
                <button className="btn" disabled={busy}>
                  {busy ? 'Creating...' : 'Create Account'}
                </button>

                {msg && (
                  <div
                    className={
                      msg.toLowerCase().includes('error') ||
                      msg.toLowerCase().includes('missing') ||
                      msg.toLowerCase().includes('failed')
                        ? 'msg err'
                        : 'msg'
                    }
                  >
                    {msg}
                  </div>
                )}
              </form>
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
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 18px;
          background: linear-gradient(145deg, #191d35, #0c0f1c);
          color: inherit;
          text-align: center;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          transition: transform 0.25s ease, border-color 0.25s ease,
            box-shadow 0.25s ease;
        }

        .game-card:hover {
          transform: translateY(-4px);
          border-color: var(--game-color);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
        }

        .game-card.selected {
          border: 2px solid var(--game-color);
          box-shadow: 0 0 22px color-mix(in srgb, var(--game-color) 40%, transparent);
          background: linear-gradient(145deg, #242748, #111426);
        }

        .game-icon {
          position: relative;
          width: 112px;
          height: 112px;
          flex-shrink: 0;
          border-radius: 20px;
          display: grid;
          place-items: center;
          overflow: hidden;
          background: #ffffff;
          border: 2px solid var(--game-color);
          box-shadow: 0 0 14px color-mix(in srgb, var(--game-color) 25%, transparent);
        }

        .game-logo {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 2px;
        }

        .logo-fallback {
          display: none;
          position: absolute;
          inset: 0;
          place-items: center;
          font-size: 42px;
          background: #171b2d;
        }

        .all-card {
          --game-color: #ffffff;
        }

        .all-icon {
          background: #171b2d;
          font-size: 42px;
        }

        .game-card strong {
          font-size: 15px;
          font-weight: 700;
        }

        .game-card small {
          font-size: 12px;
          opacity: 0.75;
        }

        .event-game {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 12px;
          font-size: 13px;
        }

        .event-logo-box {
          position: relative;
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          overflow: hidden;
          background: #ffffff;
          border-radius: 10px;
          flex-shrink: 0;
        }

        .event-logo {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 2px;
        }

        .event-logo-fallback {
          display: none;
          position: absolute;
          inset: 0;
          place-items: center;
          background: #171b2d;
          font-size: 22px;
        }

        .hero-panel {
          text-align: center;
          padding: 28px;
        }

        .hero-icons {
          display: flex;
          justify-content: center;
          gap: 14px;
          margin-top: 20px;
          font-size: 27px;
        }

        @media (max-width: 480px) {
          .game-grid {
            gap: 12px;
          }

          .game-card {
            min-height: 165px;
            padding: 16px 8px;
          }

          .game-icon {
            width: 96px;
            height: 96px;
            border-radius: 16px;
          }

          .game-card strong {
            font-size: 13px;
          }
        }
      `}</style>
    </>
  );
}
