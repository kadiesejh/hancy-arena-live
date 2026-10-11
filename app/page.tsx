
'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from './lib/supabase';

type Tournament = {
  id: string;
  name: string;
  game_name?: string | null;
  format?: string | null;
  entry_fee_npr?: number | string | null;
  prize_pool_npr?: number | string | null;
  entry_fee?: number | string | null;
  prize_pool?: number | string | null;
  start_at?: string | null;
  status?: string | null;
};

type Registration = {
  id: string;
  user_id: string;
  tournament_id: string;
  team_name?: string | null;
  captain_name?: string | null;
  phone?: string | null;
  tournament?: Tournament | null;
};

type Player = {
  id?: string;
  player_name?: string | null;
  email?: string | null;
  game_name?: string | null;
  game_id?: string | null;
};

const games = [
  {
    name: 'Mobile Legends',
    short: 'MLBB',
    icon: '⚔️',
    color: '#8b5cf6',
    description: '5v5 MOBA',
  },
  {
    name: 'PUBG Mobile',
    short: 'PUBG',
    icon: '🎯',
    color: '#f5a623',
    description: 'Battle Royale',
  },
  {
    name: 'Free Fire',
    short: 'FREE FIRE',
    icon: '🔥',
    color: '#ff5738',
    description: 'Survival Battle',
  },
  {
    name: 'Ludo King',
    short: 'LUDO',
    icon: '🎲',
    color: '#20c997',
    description: 'Classic Board Game',
  },
];

const supabase = supabaseBrowser();

function money(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return `NPR ${Number.isFinite(amount) ? amount.toLocaleString('en-IN') : '0'}`;
}

function gameName(tournament: Tournament) {
  if (tournament.game_name) return tournament.game_name;

  const name = tournament.name.toLowerCase();

  if (name.includes('mobile legends') || name.includes('mlbb')) {
    return 'Mobile Legends';
  }
  if (name.includes('pubg')) return 'PUBG Mobile';
  if (name.includes('free fire')) return 'Free Fire';
  if (name.includes('ludo')) return 'Ludo King';

  return 'Other';
}

function fee(tournament: Tournament) {
  return tournament.entry_fee_npr ?? tournament.entry_fee ?? 0;
}

function prize(tournament: Tournament) {
  return tournament.prize_pool_npr ?? tournament.prize_pool ?? 0;
}

function normalizedStatus(status?: string | null) {
  return (status || 'open').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function canRegister(status?: string | null) {
  const value = normalizedStatus(status);

  return [
    'open',
    'approved',
    'registration_open',
    'registration',
    'upcoming_open',
  ].includes(value);
}

function statusLabel(status?: string | null) {
  const value = normalizedStatus(status);

  const labels: Record<string, string> = {
    open: 'REGISTRATION OPEN',
    approved: 'REGISTRATION OPEN',
    registration_open: 'REGISTRATION OPEN',
    registration: 'REGISTRATION OPEN',
    upcoming: 'UPCOMING',
    live: 'LIVE NOW',
    completed: 'COMPLETED',
    finished: 'COMPLETED',
    pending: 'PENDING REVIEW',
    pending_verification: 'PENDING REVIEW',
    rejected: 'REJECTED',
    full: 'SLOTS FULL',
    cancelled: 'CANCELLED',
  };

  return labels[value] || value.replace(/_/g, ' ').toUpperCase();
}

function dateLabel(value?: string | null) {
  if (!value) return 'Date to be announced';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date to be announced';

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HomePage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [selectedGame, setSelectedGame] = useState('All Games');
  const [search, setSearch] = useState('');

  const [user, setUser] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState('');

  const [player, setPlayer] = useState<Player>({});
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);

  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [teamName, setTeamName] = useState('');
  const [captainName, setCaptainName] = useState('');
  const [phone, setPhone] = useState('');
  const [gameId, setGameId] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerMessage, setRegisterMessage] = useState('');
  const [registerError, setRegisterError] = useState('');

  const loadTournaments = useCallback(async () => {
    setLoadingTournaments(true);

    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('start_at', { ascending: true });

    if (error) {
      console.error('Tournament loading error:', error.message);
      setTournaments([]);
    } else {
      setTournaments((data || []) as Tournament[]);
    }

    setLoadingTournaments(false);
  }, []);

  const refreshRegistrations = useCallback(async (userId: string) => {
    setLoadingRegistrations(true);

    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Registration loading error:', error.message);
      setRegistrations([]);
      setLoadingRegistrations(false);
      return;
    }

    const rows = (data || []) as Registration[];
    const tournamentIds = Array.from(
      new Set(rows.map((row) => row.tournament_id).filter(Boolean))
    );

    let tournamentMap: Record<string, Tournament> = {};

    if (tournamentIds.length > 0) {
      const { data: tournamentData } = await supabase
        .from('tournaments')
        .select('*')
        .in('id', tournamentIds);

      for (const tournament of (tournamentData || []) as Tournament[]) {
        tournamentMap[tournament.id] = tournament;
      }
    }

    setRegistrations(
      rows.map((row) => ({
        ...row,
        tournament: tournamentMap[row.tournament_id] || null,
      }))
    );

    setLoadingRegistrations(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setUser(session?.user ?? null);
      setAuthReady(true);
      await loadTournaments();

      if (session?.user) {
        await refreshRegistrations(session.user.id);
      }
    }

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);

      if (session?.user) {
        void refreshRegistrations(session.user.id);
      } else {
        setRegistrations([]);
        setPlayer({});
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadTournaments, refreshRegistrations]);

  useEffect(() => {
    let cancelled = false;

    async function loadPlayer() {
      if (!user) {
        setPlayer({});
        return;
      }

      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('Player profile loading error:', error.message);
      }

      setPlayer((data || {}) as Player);
      setCaptainName((data as Player | null)?.player_name || '');
    }

    loadPlayer();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const filteredTournaments = useMemo(() => {
    return tournaments.filter((tournament) => {
      const matchesGame =
        selectedGame === 'All Games' ||
        gameName(tournament).toLowerCase() === selectedGame.toLowerCase();

      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        tournament.name.toLowerCase().includes(query) ||
        gameName(tournament).toLowerCase().includes(query);

      return matchesGame && matchesSearch;
    });
  }, [tournaments, selectedGame, search]);

  const openTournaments = tournaments.filter((t) =>
    canRegister(t.status)
  ).length;

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    setAuthMessage('');

    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    const name = String(form.get('player_name') || '').trim();

    try {
      if (authMode === 'signup') {
        if (!name) {
          setAuthError('Please enter your player name.');
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              player_name: name,
            },
          },
        });

        if (error) throw error;

        if (data.user && data.session) {
          const { error: profileError } = await supabase
            .from('players')
            .upsert(
              {
                id: data.user.id,
                player_name: name,
                email,
              },
              { onConflict: 'id' }
            );

          if (profileError) {
            console.error('Profile save error:', profileError.message);
          }

          setAuthMessage('Account created successfully!');
        } else {
          setAuthMessage(
            'Account created. Please check your email if confirmation is required, then sign in.'
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setAuthMessage('Login successful!');
      }
    } catch (error: any) {
      setAuthError(error?.message || 'Authentication failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setAuthError(error.message);
      return;
    }

    setUser(null);
    setPlayer({});
    setRegistrations([]);
    setAuthMessage('You have been logged out.');
    setAuthError('');
  };

  const startRegistration = (tournament: Tournament) => {
    setRegisterMessage('');
    setRegisterError('');

    if (!user) {
      setAuthMessage('');
      setAuthError('Please sign in or create an account before registering.');
      document.getElementById('account')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (!canRegister(tournament.status)) {
      setRegisterError('Registration is not open for this tournament.');
      return;
    }

    const alreadyRegistered = registrations.some(
      (registration) => registration.tournament_id === tournament.id
    );

    if (alreadyRegistered) {
      setRegisterError('You are already registered for this tournament.');
      return;
    }

    setActiveTournament(tournament);
    setRegisterError('');
    setRegisterMessage('');
    setGameId(player.game_id || '');

    document
      .getElementById('registration-form')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleRegistration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRegisterLoading(true);
    setRegisterError('');
    setRegisterMessage('');

    try {
      if (!user) {
        throw new Error('Please sign in before registering.');
      }

      if (!activeTournament) {
        throw new Error('Please select a tournament first.');
      }

      if (!teamName.trim() || !captainName.trim() || !phone.trim() || !gameId.trim()) {
        throw new Error('Please fill in all required fields.');
      }

      if (!canRegister(activeTournament.status)) {
        throw new Error('Registration is closed for this tournament.');
      }

      const { data: existing, error: duplicateCheckError } = await supabase
        .from('registrations')
        .select('id')
        .eq('user_id', user.id)
        .eq('tournament_id', activeTournament.id)
        .maybeSingle();

      if (duplicateCheckError) throw duplicateCheckError;

      if (existing) {
        throw new Error('You are already registered for this tournament.');
      }

      const { error: playerError } = await supabase
        .from('players')
        .upsert(
          {
            id: user.id,
            player_name: captainName.trim(),
            email: user.email || '',
            game_name: gameName(activeTournament),
            game_id: gameId.trim(),
          },
          { onConflict: 'id' }
        );

      if (playerError) throw playerError;

      const { error: registrationError } = await supabase
        .from('registrations')
        .insert({
          user_id: user.id,
          tournament_id: activeTournament.id,
          team_name: teamName.trim(),
          captain_name: captainName.trim(),
          phone: phone.trim(),
        });

      if (registrationError) {
        if (registrationError.code === '23505') {
          throw new Error('You are already registered for this tournament.');
        }

        throw registrationError;
      }

      setPlayer({
        ...player,
        id: user.id,
        player_name: captainName.trim(),
        email: user.email || '',
        game_name: gameName(activeTournament),
        game_id: gameId.trim(),
      });

      setRegisterMessage('Registration submitted successfully!');
      setTeamName('');
      setPhone('');
      setActiveTournament(null);

      await refreshRegistrations(user.id);
    } catch (error: any) {
      setRegisterError(
        error?.message || 'Could not complete registration. Please try again.'
      );
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <main className="arena">
      <header className="topbar">
        <div className="container nav-inner">
          <a href="#" className="brand" aria-label="Hancy Arena Home">
            <span className="brand-mark">H</span>
            <span>
              HANCY <b>ARENA</b>
              <small>ESPORTS TOURNAMENTS</small>
            </span>
          </a>

          <nav className="nav-links">
            <a href="#games">Games</a>
            <a href="#tournaments">Tournaments</a>
            <a href="#my-registrations">My Registrations</a>
            <a href="/results">Results</a>
            <a href="/wallet">Wallet</a>
          </nav>

          <div className="nav-actions">
            {user ? (
              <>
                <span className="user-pill">
                  <span className="online-dot" />
                  {player.player_name || user.email}
                </span>
                <button className="button button-small button-outline" onClick={logout}>
                  Logout
                </button>
              </>
            ) : (
              <a className="button button-small" href="#account">
                Sign In <span>↗</span>
              </a>
            )}
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="container hero-layout">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="pulse-dot" />
              NEPAL'S GAMING ARENA
            </div>

            <h1>
              PLAY TO
              <br />
              <span>COMPETE.</span>
              <br />
              RISE TO
              <br />
              <span className="outline-text">LEGEND.</span>
            </h1>

            <p className="hero-description">
              Join tournaments, challenge the best players, and make your mark
              in the Hancy Arena esports community.
            </p>

            <div className="hero-buttons">
              <a href="#tournaments" className="button">
                Explore Tournaments <span>→</span>
              </a>
              <a href="#games" className="button button-outline">
                Explore Games
              </a>
            </div>

            <div className="hero-note">
              <span className="note-icon">✦</span>
              YOUR GAME. YOUR SKILL. YOUR ARENA.
            </div>
          </div>

          <div className="hero-visual">
            <div className="visual-grid" />
            <div className="visual-ring ring-one" />
            <div className="visual-ring ring-two" />
            <div className="hero-emblem">
              <div className="emblem-top">HA</div>
              <div className="emblem-sword">⚔</div>
              <div className="emblem-bottom">HANCY ARENA</div>
            </div>
            <div className="floating-card card-top">
              <span className="floating-icon">🏆</span>
              <span>
                <small>THE NEXT CHAMPION</small>
                <b>COULD BE YOU</b>
              </span>
            </div>
            <div className="floating-card card-bottom">
              <span className="live-indicator" />
              <span>
                <small>TOURNAMENTS</small>
                <b>{loadingTournaments ? 'Loading...' : `${openTournaments} Open`}</b>
              </span>
            </div>
            <div className="visual-label">EST. FOR CHAMPIONS</div>
          </div>
        </div>
      </section>

      <section className="stats-section">
        <div className="container stats-grid">
          <div className="stat-item">
            <span className="stat-icon">🎮</span>
            <div>
              <strong>04</strong>
              <small>FEATURED GAMES</small>
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🏆</span>
            <div>
              <strong>{loadingTournaments ? '—' : tournaments.length}</strong>
              <small>TOURNAMENTS</small>
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-icon">⚡</span>
            <div>
              <strong>{loadingTournaments ? '—' : openTournaments}</strong>
              <small>OPEN TO JOIN</small>
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🇳🇵</span>
            <div>
              <strong>NPR</strong>
              <small>LOCAL CURRENCY</small>
            </div>
          </div>
        </div>
      </section>

      <section className="section container" id="games">
        <div className="section-heading">
          <div>
            <span className="section-kicker">CHOOSE YOUR BATTLE</span>
            <h2>Featured <span>Games</span></h2>
            <p>Select your game and find a tournament that matches your skills.</p>
          </div>
          <button
            className="text-button"
            onClick={() => {
              setSelectedGame('All Games');
              setSearch('');
              document.getElementById('tournaments')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            All tournaments <span>→</span>
          </button>
        </div>

        <div className="games-grid">
          {games.map((game) => (
            <button
              type="button"
              key={game.name}
              className={`game-card ${selectedGame === game.name ? 'game-selected' : ''}`}
              style={{ '--game-color': game.color } as React.CSSProperties}
              onClick={() => {
                setSelectedGame(selectedGame === game.name ? 'All Games' : game.name);
                document.getElementById('tournaments')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <div className="game-card-top">
                <span className="game-icon">{game.icon}</span>
                <span className="game-arrow">↗</span>
              </div>
              <div className="game-name">{game.name}</div>
              <div className="game-description">{game.description}</div>
              <div className="game-card-footer">
                <span>{game.short}</span>
                <span className="game-line" />
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="section tournaments-section" id="tournaments">
        <div className="container">
          <div className="section-heading">
            <div>
              <span className="section-kicker">ENTER THE ARENA</span>
              <h2>Available <span>Tournaments</span></h2>
              <p>Find your next match and compete for the top spot.</p>
            </div>
            <a href="/results" className="button button-outline">
              View Results <span>↗</span>
            </a>
          </div>

          <div className="tournament-tools">
            <div className="filter-list">
              {['All Games', ...games.map((game) => game.name)].map((name) => (
                <button
                  type="button"
                  key={name}
                  className={`filter-chip ${selectedGame === name ? 'filter-active' : ''}`}
                  onClick={() => setSelectedGame(name)}
                >
                  {name === 'All Games' ? '✦ ' : ''}
                  {name}
                </button>
              ))}
            </div>
            <input
              className="search-input"
              type="search"
              placeholder="Search tournaments..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search tournaments"
            />
          </div>

          {loadingTournaments ? (
            <div className="empty-state">
              <div className="loading-spinner" />
              <h3>Loading tournaments...</h3>
              <p>Getting the latest tournaments from Hancy Arena.</p>
            </div>
          ) : filteredTournaments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎮</div>
              <h3>No tournaments found</h3>
              <p>
                {search || selectedGame !== 'All Games'
                  ? 'Try changing your search or game filter.'
                  : 'New tournaments will appear here when they are added.'}
              </p>
              <button
                className="button button-outline"
                onClick={() => {
                  setSelectedGame('All Games');
                  setSearch('');
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="tournament-grid">
              {filteredTournaments.map((tournament) => {
                const registered = registrations.some(
                  (registration) => registration.tournament_id === tournament.id
                );
                const isOpen = canRegister(tournament.status);

                return (
                  <article className="tournament-card" key={tournament.id}>
                    <div className="tournament-banner">
                      <div className="banner-pattern" />
                      <span className="tournament-game-icon">
                        {games.find((game) => game.name === gameName(tournament))?.icon || '🎮'}
                      </span>
                      <span className={`tournament-status ${isOpen ? 'status-open' : ''}`}>
                        <span className="status-dot" />
                        {statusLabel(tournament.status)}
                      </span>
                      <span className="banner-game-name">{gameName(tournament)}</span>
                    </div>

                    <div className="tournament-content">
                      <div className="tournament-format">
                        {tournament.format || 'TOURNAMENT'}
                      </div>
                      <h3>{tournament.name}</h3>

                      <div className="tournament-date">
                        <span>◷</span> {dateLabel(tournament.start_at)}
                      </div>

                      <div className="tournament-prizes">
                        <div>
                          <small>ENTRY FEE</small>
                          <strong>{money(fee(tournament))}</strong>
                        </div>
                        <div>
                          <small>PRIZE POOL</small>
                          <strong className="prize-value">{money(prize(tournament))}</strong>
                        </div>
                      </div>

                      {registered ? (
                        <button className="button button-full button-disabled" disabled>
                          ✓ Already Registered
                        </button>
                      ) : (
                        <button
                          className={`button button-full ${!isOpen ? 'button-disabled' : ''}`}
                          disabled={!isOpen}
                          onClick={() => startRegistration(tournament)}
                        >
                          {isOpen ? 'Register Now' : statusLabel(tournament.status)}
                          {isOpen && <span>→</span>}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {registerError && (
        <div className="container">
          <div className="message message-error">{registerError}</div>
        </div>
      )}

      {registerMessage && (
        <div className="container">
          <div className="message message-success">{registerMessage}</div>
        </div>
      )}

      {activeTournament && user && (
        <section className="section container" id="registration-form">
          <div className="registration-layout">
            <div className="registration-intro">
              <span className="section-kicker">YOUR NEXT CHALLENGE</span>
              <h2>Join the <span>Arena.</span></h2>
              <p>
                Complete your player details to register for the selected
                tournament. Please check your game ID before submitting.
              </p>
              <div className="selected-tournament">
                <span className="selected-icon">
                  {games.find((game) => game.name === gameName(activeTournament))?.icon || '🎮'}
                </span>
                <div>
                  <small>SELECTED TOURNAMENT</small>
                  <strong>{activeTournament.name}</strong>
                  <span>{gameName(activeTournament)} · {money(fee(activeTournament))} entry</span>
                </div>
              </div>
            </div>

            <form className="form-panel" onSubmit={handleRegistration}>
              <div className="form-panel-heading">
                <h3>Player Registration</h3>
                <span>REQUIRED FIELDS *</span>
              </div>

              <label>
                Team Name *
                <input
                  required
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  placeholder="Enter your team name"
                  maxLength={80}
                />
              </label>

              <label>
                Captain / Player Name *
                <input
                  required
                  value={captainName}
                  onChange={(event) => setCaptainName(event.target.value)}
                  placeholder="Enter your player name"
                  maxLength={80}
                />
              </label>

              <label>
                Phone Number *
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Enter your contact number"
                  maxLength={30}
                />
              </label>

              <label>
                In-game ID / UID *
                <input
                  required
                  value={gameId}
                  onChange={(event) => setGameId(event.target.value)}
                  placeholder="Enter your game ID"
                  maxLength={100}
                />
              </label>

              {registerError && <div className="message message-error">{registerError}</div>}

              <button
                className="button button-full"
                type="submit"
                disabled={registerLoading}
              >
                {registerLoading ? 'Submitting...' : 'Confirm Registration →'}
              </button>

              <button
                className="cancel-button"
                type="button"
                onClick={() => {
                  setActiveTournament(null);
                  setRegisterError('');
                }}
              >
                Cancel
              </button>

              <p className="form-footnote">
                Registration is subject to tournament rules and admin review.
              </p>
            </form>
          </div>
        </section>
      )}

      <section className="section container" id="my-registrations">
        <div className="section-heading">
          <div>
            <span className="section-kicker">YOUR PLAYER DASHBOARD</span>
            <h2>My <span>Registrations</span></h2>
            <p>Keep track of the tournaments you have joined.</p>
          </div>
          {user && (
            <span className="registration-count">
              {registrations.length} {registrations.length === 1 ? 'ENTRY' : 'ENTRIES'}
            </span>
          )}
        </div>

        {!user ? (
          <div className="empty-state compact-empty">
            <div className="empty-icon">👤</div>
            <h3>Sign in to see your registrations</h3>
            <p>Your registered tournaments will be listed here.</p>
            <a href="#account" className="button">Sign In / Sign Up</a>
          </div>
        ) : loadingRegistrations ? (
          <div className="empty-state compact-empty">
            <div className="loading-spinner" />
            <h3>Loading your registrations...</h3>
          </div>
        ) : registrations.length === 0 ? (
          <div className="empty-state compact-empty">
            <div className="empty-icon">🏆</div>
            <h3>No registrations yet</h3>
            <p>Choose a tournament above and register to start competing.</p>
            <a href="#tournaments" className="button">Find a Tournament →</a>
          </div>
        ) : (
          <div className="my-registration-list">
            {registrations.map((registration) => (
              <div className="my-registration-row" key={registration.id}>
                <div className="my-registration-icon">
                  {games.find(
                    (game) => game.name === gameName(
                      registration.tournament || { id: '', name: '' }
                    )
                  )?.icon || '🎮'}
                </div>
                <div className="my-registration-info">
                  <strong>{registration.tournament?.name || 'Tournament'}</strong>
                  <span>
                    {registration.team_name || 'Team not specified'} ·{' '}
                    {registration.captain_name || player.player_name || 'Player'}
                  </span>
                </div>
                <div className="my-registration-meta">
                  <small>STATUS</small>
                  <span className="registration-badge">REGISTERED</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="account-section" id="account">
        <div className="container account-layout">
          <div className="account-copy">
            <span className="section-kicker">READY TO PLAY?</span>
            <h2>Your next victory <span>starts here.</span></h2>
            <p>
              Create your Hancy Arena account to join tournaments and track
              your registrations in one place.
            </p>

            <div className="account-benefit">
              <span>✓</span> One account for your tournament registrations
            </div>
            <div className="account-benefit">
              <span>✓</span> Track the tournaments you have joined
            </div>
            <div className="account-benefit">
              <span>✓</span> Access wallet and results pages
            </div>
          </div>

          <div className="auth-panel">
            {user ? (
              <div className="signed-in-panel">
                <div className="signed-in-icon">✓</div>
                <span className="section-kicker">ACCOUNT CONNECTED</span>
                <h3>Welcome to the Arena!</h3>
                <p>You are signed in as</p>
                <strong>{user.email}</strong>
                {authMessage && <div className="message message-success">{authMessage}</div>}
                <button className="button button-full" onClick={logout}>
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <div className="auth-tabs">
                  <button
                    type="button"
                    className={authMode === 'signin' ? 'auth-tab auth-tab-active' : 'auth-tab'}
                    onClick={() => {
                      setAuthMode('signin');
                      setAuthMessage('');
                      setAuthError('');
                    }}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    className={authMode === 'signup' ? 'auth-tab auth-tab-active' : 'auth-tab'}
                    onClick={() => {
                      setAuthMode('signup');
                      setAuthMessage('');
                      setAuthError('');
                    }}
                  >
                    Create Account
                  </button>
                </div>

                <div className="auth-heading">
                  <h3>{authMode === 'signin' ? 'Welcome Back' : 'Join Hancy Arena'}</h3>
                  <p>
                    {authMode === 'signin'
                      ? 'Sign in to continue your journey.'
                      : 'Create an account and enter the competition.'}
                  </p>
                </div>

                <form className="auth-form" onSubmit={handleAuth}>
                  {authMode === 'signup' && (
                    <label>
                      Player Name
                      <input
                        name="player_name"
                        required
                        placeholder="Your gaming name"
                        maxLength={80}
                      />
                    </label>
                  )}

                  <label>
                    Email Address
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </label>

                  <label>
                    Password
                    <input
                      name="password"
                      type="password"
                      required
                      minLength={6}
                      placeholder="At least 6 characters"
                      autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                    />
                  </label>

                  {authError && <div className="message message-error">{authError}</div>}
                  {authMessage && <div className="message message-success">{authMessage}</div>}

                  <button className="button button-full" type="submit" disabled={authLoading || !authReady}>
                    {authLoading
                      ? 'Please wait...'
                      : authMode === 'signin'
                        ? 'Sign In →'
                        : 'Create Account →'}
                  </button>
                </form>

                <p className="auth-terms">
                  By continuing, you agree to follow Hancy Arena tournament rules.
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="cta-strip">
        <div className="container cta-content">
          <div>
            <span className="section-kicker">THE ARENA IS WAITING</span>
            <h2>Make your next match count.</h2>
          </div>
          <a href="#tournaments" className="button">
            Find Your Tournament <span>→</span>
          </a>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-main">
          <a href="#" className="brand">
            <span className="brand-mark">H</span>
            <span>
              HANCY <b>ARENA</b>
              <small>ESPORTS TOURNAMENTS</small>
            </span>
          </a>

          <p>Built for players. Driven by competition.</p>

          <div className="footer-links">
            <a href="#games">Games</a>
            <a href="#tournaments">Tournaments</a>
            <a href="/results">Results</a>
            <a href="/wallet">Wallet</a>
            <a href="/admin">Admin</a>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} Hancy Arena. All rights reserved.</span>
          <span>PLAY FAIR · PLAY TO WIN</span>
        </div>
      </footer>

      <style jsx>{`
        :global(html) {
          scroll-behavior: smooth;
          scroll-padding-top: 85px;
        }

        :global(body) {
          margin: 0;
          background: #070910;
          color: #f7f8ff;
          font-family: Arial, Helvetica, sans-serif;
        }

        :global(*) {
          box-sizing: border-box;
        }

        :global(a) {
          color: inherit;
          text-decoration: none;
        }

        :global(button),
        :global(input) {
          font: inherit;
        }

        .arena {
          --bg: #070910;
          --panel: #10131f;
          --border: #272b3d;
          --muted: #969bb1;
          --cyan: #00e5ff;
          --purple: #8b5cf6;
          overflow: hidden;
          background:
            radial-gradient(ellipse at 15% 0%, #171331 0%, transparent 35%),
            var(--bg);
          color: #f7f8ff;
          min-height: 100vh;
        }

        .container {
          width: min(1160px, calc(100% - 40px));
          margin: 0 auto;
        }

        .topbar {
          height: 76px;
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(7, 9, 16, 0.94);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid #25283a;
        }

        .nav-inner {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 22px;
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
          font-size: 17px;
          font-weight: 900;
          letter-spacing: 1.1px;
          line-height: 1.1;
        }

        .brand b {
          color: var(--cyan);
        }

        .brand small {
          display: block;
          margin-top: 5px;
          font-size: 8px;
          letter-spacing: 2px;
          color: #8c92a9;
          font-weight: 700;
        }

        .brand-mark {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border: 1px solid var(--cyan);
          border-radius: 11px;
          background: linear-gradient(135deg, #142d3b, #17132d);
          color: var(--cyan);
          font-size: 26px;
          box-shadow: 0 0 24px #00e5ff1a;
        }

        .nav-links,
        .nav-actions {
          display: flex;
          align-items: center;
          gap: 19px;
        }

        .nav-links {
          color: #b4b8ca;
          font-size: 12px;
          font-weight: 700;
        }

        .nav-links a,
        .footer-links a {
          transition: color 0.2s ease;
        }

        .nav-links a:hover,
        .footer-links a:hover {
          color: var(--cyan);
        }

        .nav-actions {
          gap: 10px;
        }

        .user-pill {
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #c6c9d8;
          font-size: 11px;
        }

        .online-dot,
        .pulse-dot,
        .live-indicator {
          display: inline-block;
          width: 7px;
          height: 7px;
          margin-right: 5px;
          border-radius: 50%;
          background: #45f6a2;
          box-shadow: 0 0 10px #45f6a2;
        }

        .button {
          min-height: 46px;
          display: inline-flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          padding: 0 19px;
          border: 1px solid var(--cyan);
          border-radius: 9px;
          background: var(--cyan);
          color: #041016;
          font-weight: 900;
          font-size: 12px;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px #00e5ff25;
        }

        .button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .button-small {
          min-height: 37px;
          padding: 0 13px;
          font-size: 11px;
        }

        .button-outline {
          border-color: #3a4055;
          background: #111421;
          color: #fff;
        }

        .button-outline:hover:not(:disabled) {
          border-color: var(--cyan);
          color: var(--cyan);
        }

        .button-full {
          width: 100%;
        }

        .button-disabled {
          border-color: #33374a;
          background: #202333;
          color: #9297aa;
        }

        .hero {
          position: relative;
          padding: 64px 0 72px;
          border-bottom: 1px solid #202337;
          background:
            radial-gradient(ellipse at 76% 46%, #39206c50, transparent 35%),
            linear-gradient(120deg, #090b14, #0b0d19 55%, #100d20);
        }

        .hero-layout {
          display: grid;
          grid-template-columns: 1fr 0.9fr;
          gap: 50px;
          align-items: center;
        }

        .hero-copy {
          position: relative;
          z-index: 2;
        }

        .eyebrow,
        .section-kicker {
          color: var(--cyan);
          font-size: 10px;
          letter-spacing: 2.5px;
          font-weight: 900;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          padding: 10px 13px;
          border: 1px solid #23414f;
          border-radius: 99px;
          background: #0c1c26;
        }

        .hero h1 {
          margin: 24px 0 18px;
          font-size: clamp(50px, 6.4vw, 79px);
          font-weight: 1000;
          letter-spacing: -4px;
          line-height: 0.96;
        }

        .hero h1 span {
          color: var(--cyan);
          text-shadow: 0 0 30px #00e5ff25;
        }

        .hero h1 .outline-text {
          color: transparent;
          -webkit-text-stroke: 1.5px #8b5cf6;
          text-shadow: none;
        }

        .hero-description {
          max-width: 450px;
          margin: 23px 0 26px;
          color: #a1a6bb;
          font-size: 14px;
          line-height: 1.9;
        }

        .hero-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 11px;
        }

        .hero-note {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 30px;
          color: #6f748b;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .note-icon {
          color: #a98aff;
          font-size: 17px;
        }

        .hero-visual {
          min-height: 420px;
          position: relative;
          display: grid;
          place-items: center;
          isolation: isolate;
        }

        .visual-grid {
          position: absolute;
          inset: 0;
          opacity: 0.25;
          background-image:
            linear-gradient(#5d4e9a30 1px, transparent 1px),
            linear-gradient(90deg, #5d4e9a30 1px, transparent 1px);
          background-size: 28px 28px;
          mask-image: radial-gradient(ellipse, black 10%, transparent 75%);
        }

        .visual-ring {
          position: absolute;
          width: 320px;
          height: 320px;
          border: 1px solid #8b5cf633;
          border-radius: 50%;
          transform: rotate(-25deg) scaleX(0.78);
        }

        .ring-two {
          width: 390px;
          height: 390px;
          border-color: #00e5ff1c;
          transform: rotate(30deg) scaleX(0.8);
        }

        .hero-emblem {
          width: 225px;
          height: 270px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          clip-path: polygon(50% 0, 92% 15%, 88% 66%, 50% 100%, 12% 66%, 8% 15%);
          background: linear-gradient(145deg, #00e5ff, #31245f 40%, #171127 70%, #8b5cf6);
          filter: drop-shadow(0 0 30px #8b5cf633);
        }

        .emblem-top {
          font-size: 63px;
          line-height: 1;
          font-weight: 1000;
          letter-spacing: -6px;
          text-shadow: 3px 4px #15112a;
        }

        .emblem-sword {
          margin-top: 4px;
          color: var(--cyan);
          font-size: 54px;
          text-shadow: 0 0 25px #00e5ff;
        }

        .emblem-bottom {
          margin-top: 10px;
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: 2px;
        }

        .floating-card {
          position: absolute;
          z-index: 3;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 14px;
          border: 1px solid #34344c;
          border-radius: 12px;
          background: #101321eF;
          box-shadow: 0 16px 40px #0005;
        }

        .card-top {
          top: 50px;
          right: -5px;
        }

        .card-bottom {
          bottom: 45px;
          left: 0;
        }

        .floating-icon {
          font-size: 25px;
        }

        .floating-card small,
        .floating-card b {
          display: block;
        }

        .floating-card small {
          margin-bottom: 6px;
          color: #858aa2;
          font-size: 8px;
          letter-spacing: 1.2px;
        }

        .floating-card b {
          font-size: 11px;
        }

        .visual-label {
          position: absolute;
          right: 0;
          bottom: 0;
          color: #6d6b8e;
          font-size: 8px;
          letter-spacing: 3px;
        }

        .stats-section {
          border-bottom: 1px solid #24273a;
          background: #0c0e18;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 24px 18px;
          border-right: 1px solid #24273a;
        }

        .stat-item:first-child {
          border-left: 1px solid #24273a;
        }

        .stat-icon {
          font-size: 25px;
        }

        .stat-item strong,
        .stat-item small {
          display: block;
        }

        .stat-item strong {
          font-size: 23px;
          color: #f4f5ff;
        }

        .stat-item small {
          margin-top: 5px;
          color: #858aa1;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .section {
          padding-top: 75px;
          padding-bottom: 75px;
        }

        .section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 22px;
          margin-bottom: 30px;
        }

        .section-heading h2,
        .registration-intro h2,
        .account-copy h2 {
          margin: 12px 0;
          font-size: clamp(29px, 4vw, 39px);
          letter-spacing: -1.5px;
          line-height: 1.12;
        }

        .section-heading h2 span,
        .registration-intro h2 span,
        .account-copy h2 span {
          color: var(--cyan);
        }

        .section-heading p,
        .registration-intro > p,
        .account-copy > p {
          margin: 0;
          color: var(--muted);
          font-size: 12px;
          line-height: 1.8;
        }

        .text-button {
          padding: 10px 0;
          border: 0;
          background: transparent;
          color: var(--cyan);
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
          white-space: nowrap;
        }

        .text-button span {
          margin-left: 6px;
        }

        .games-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }

        .game-card {
          min-width: 0;
          position: relative;
          overflow: hidden;
          padding: 20px;
          border: 1px solid #292d41;
          border-radius: 14px;
          background: linear-gradient(150deg, #151827, #0d101a);
          color: #f6f7ff;
          text-align: left;
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }

        .game-card::after {
          content: '';
          position: absolute;
          right: -35px;
          bottom: -45px;
          width: 130px;
          height: 130px;
          border-radius: 50%;
          background: var(--game-color);
          opacity: 0.07;
          filter: blur(25px);
        }

        .game-card:hover,
        .game-selected {
          transform: translateY(-4px);
          border-color: var(--game-color);
          background: linear-gradient(150deg, #1b2032, #0d101a);
        }

        .game-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .game-icon {
          display: grid;
          place-items: center;
          width: 53px;
          height: 53px;
          border: 1px solid color-mix(in srgb, var(--game-color), transparent 60%);
          border-radius: 13px;
          background: color-mix(in srgb, var(--game-color), transparent 88%);
          font-size: 27px;
        }

        .game-arrow {
          color: #7f849a;
          font-size: 18px;
        }

        .game-name {
          position: relative;
          z-index: 1;
          font-size: 16px;
          font-weight: 900;
        }

        .game-description {
          margin-top: 7px;
          color: #9095aa;
          font-size: 11px;
        }

        .game-card-footer {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 25px;
          color: var(--game-color);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.6px;
        }

        .game-line {
          height: 1px;
          flex: 1;
          background: var(--game-color);
          opacity: 0.5;
        }

        .tournaments-section {
          background:
            radial-gradient(ellipse at 100% 0%, #1a1233 0%, transparent 35%),
            #0b0d16;
          border-top: 1px solid #202337;
          border-bottom: 1px solid #202337;
        }

        .tournament-tools {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .filter-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .filter-chip {
          padding: 10px 12px;
          border: 1px solid #303448;
          border-radius: 8px;
          background: #101320;
          color: #a8adc0;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .filter-active {
          border-color: var(--cyan);
          background: #0c2630;
          color: var(--cyan);
        }

        .search-input {
          width: 220px;
          min-width: 150px;
          padding: 12px 13px;
          border: 1px solid #303448;
          border-radius: 8px;
          outline: none;
          background: #101320;
          color: #fff;
          font-size: 11px;
        }

        .search-input:focus,
        .arena input:focus {
          border-color: var(--cyan);
          box-shadow: 0 0 0 3px #00e5ff12;
        }

        .tournament-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }

        .tournament-card {
          min-width: 0;
          overflow: hidden;
          border: 1px solid #2a2e42;
          border-radius: 13px;
          background: #111420;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .tournament-card:hover {
          transform: translateY(-3px);
          border-color: #505371;
        }

        .tournament-banner {
          position: relative;
          min-height: 145px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% 0%, #5b37a966, transparent 65%),
            linear-gradient(135deg, #191b32, #111321);
        }

        .banner-pattern {
          position: absolute;
          inset: 0;
          opacity: 0.23;
          background-image: linear-gradient(135deg, transparent 45%, #8b5cf6 45%, transparent 46%);
          background-size: 22px 22px;
        }

        .tournament-game-icon {
          position: relative;
          z-index: 1;
          font-size: 54px;
          filter: drop-shadow(0 5px 20px #0008);
        }

        .tournament-status {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          max-width: 70%;
          padding: 7px 9px;
          border: 1px solid #424359;
          border-radius: 6px;
          background: #151725eF;
          color: #b0b3c4;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.5px;
        }

        .status-open {
          border-color: #1c614b;
          background: #0c2c23eF;
          color: #6df0b5;
        }

        .status-dot {
          width: 5px;
          height: 5px;
          flex-shrink: 0;
          border-radius: 50%;
          background: currentColor;
        }

        .banner-game-name {
          position: absolute;
          bottom: 12px;
          left: 14px;
          color: #d3d0e9;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .tournament-content {
          padding: 19px;
        }

        .tournament-format {
          color: #a58aff;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .tournament-content h3 {
          margin: 10px 0 12px;
          font-size: 17px;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }

        .tournament-date {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #9a9fb3;
          font-size: 10px;
          line-height: 1.6;
        }

        .tournament-date span {
          color: var(--cyan);
          font-size: 16px;
        }

        .tournament-prizes {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin: 18px 0;
          padding: 14px 0;
          border-top: 1px solid #292d40;
          border-bottom: 1px solid #292d40;
        }

        .tournament-prizes small,
        .tournament-prizes strong {
          display: block;
        }

        .tournament-prizes small {
          margin-bottom: 7px;
          color: #858ba2;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1.2px;
        }

        .tournament-prizes strong {
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .prize-value {
          color: #70efb0;
        }

        .empty-state {
          min-height: 250px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 35px 20px;
          border: 1px dashed #33374c;
          border-radius: 14px;
          background: #10121d;
          text-align: center;
        }

        .compact-empty {
          min-height: 210px;
        }

        .empty-icon {
          margin-bottom: 12px;
          font-size: 36px;
        }

        .empty-state h3 {
          margin: 8px 0;
          font-size: 17px;
        }

        .empty-state p {
          margin: 0 0 19px;
          color: #959bb0;
          font-size: 12px;
          line-height: 1.8;
        }

        .loading-spinner {
          width: 30px;
          height: 30px;
          margin-bottom: 15px;
          border: 3px solid #33364a;
          border-top-color: var(--cyan);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .message {
          margin: 15px 0;
          padding: 12px 14px;
          border: 1px solid transparent;
          border-radius: 8px;
          font-size: 12px;
          line-height: 1.7;
          overflow-wrap: anywhere;
        }

        .message-error {
          border-color: #67333d;
          background: #2a151d;
          color: #ff9da9;
        }

        .message-success {
          border-color: #1b5b45;
          background: #10291f;
          color: #78e7ad;
        }

        .registration-layout {
          display: grid;
          grid-template-columns: 0.8fr 1fr;
          gap: 55px;
          align-items: start;
        }

        .registration-intro {
          padding-top: 25px;
        }

        .selected-tournament {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-top: 28px;
          padding: 16px;
          border: 1px solid #2c3045;
          border-radius: 11px;
          background: #10131f;
        }

        .selected-icon {
          display: grid;
          place-items: center;
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          border-radius: 10px;
          background: #211a3c;
          font-size: 25px;
        }

        .selected-tournament small,
        .selected-tournament strong,
        .selected-tournament div span {
          display: block;
        }

        .selected-tournament small {
          margin-bottom: 6px;
          color: var(--cyan);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1.3px;
        }

        .selected-tournament strong {
          margin-bottom: 6px;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .selected-tournament div span {
          color: #9ca2b7;
          font-size: 10px;
        }

        .form-panel,
        .auth-panel {
          padding: 25px;
          border: 1px solid #2b3044;
          border-radius: 14px;
          background: linear-gradient(145deg, #141725, #0d101a);
          box-shadow: 0 18px 50px #0002;
        }

        .form-panel-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .form-panel-heading h3 {
          margin: 0;
          font-size: 19px;
        }

        .form-panel-heading span {
          color: #81879e;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .form-panel label,
        .auth-form label {
          display: block;
          margin-bottom: 15px;
          color: #c6cad8;
          font-size: 11px;
          font-weight: 800;
        }

        .arena input {
          display: block;
          width: 100%;
          min-height: 45px;
          margin-top: 8px;
          padding: 12px;
          border: 1px solid #33384e;
          border-radius: 8px;
          outline: none;
          background: #090c15;
          color: #fff;
          font-size: 12px;
        }

        .arena input::placeholder {
          color: #656b82;
        }

        .cancel-button {
          display: block;
          width: 100%;
          margin-top: 11px;
          padding: 10px;
          border: 0;
          background: transparent;
          color: #a5aabd;
          font-size: 11px;
          cursor: pointer;
        }

        .form-footnote {
          margin: 15px 0 0;
          color: #737990;
          font-size: 10px;
          line-height: 1.7;
          text-align: center;
        }

        .registration-count {
          padding: 9px 12px;
          border: 1px solid #33384e;
          border-radius: 8px;
          color: var(--cyan);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1px;
          white-space: nowrap;
        }

        .my-registration-list {
          display: grid;
          gap: 10px;
        }

        .my-registration-row {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 16px;
          border: 1px solid #2b3043;
          border-radius: 11px;
          background: #10131e;
        }

        .my-registration-icon {
          display: grid;
          place-items: center;
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          border-radius: 10px;
          background: #201a3a;
          font-size: 23px;
        }

        .my-registration-info {
          min-width: 0;
          flex: 1;
        }

        .my-registration-info strong,
        .my-registration-info span {
          display: block;
          overflow-wrap: anywhere;
        }

        .my-registration-info strong {
          font-size: 13px;
        }

        .my-registration-info span {
          margin-top: 6px;
          color: #969bb0;
          font-size: 10px;
        }

        .my-registration-meta {
          text-align: right;
        }

        .my-registration-meta small {
          display: block;
          margin-bottom: 7px;
          color: #747b93;
          font-size: 8px;
          letter-spacing: 1px;
        }

        .registration-badge {
          display: inline-block;
          padding: 6px 8px;
          border-radius: 5px;
          background: #123126;
          color: #70eeb0;
          font-size: 8px;
          font-weight: 900;
        }

        .account-section {
          padding: 75px 0;
          border-top: 1px solid #272a3d;
          border-bottom: 1px solid #272a3d;
          background:
            radial-gradient(ellipse at 10% 40%, #25134380, transparent 45%),
            #0c0e18;
        }

        .account-layout {
          display: grid;
          grid-template-columns: 1fr 0.85fr;
          gap: 70px;
          align-items: center;
        }

        .account-copy h2 {
          max-width: 480px;
          font-size: clamp(34px, 4.5vw, 48px);
        }

        .account-copy > p {
          max-width: 430px;
          margin-bottom: 25px;
        }

        .account-benefit {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 13px;
          color: #c0c4d4;
          font-size: 11px;
        }

        .account-benefit span {
          display: grid;
          place-items: center;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #10372b;
          color: #6af0b0;
          font-weight: 900;
        }

        .auth-panel {
          min-width: 0;
        }

        .auth-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px;
          padding: 5px;
          border-radius: 9px;
          background: #090c15;
        }

        .auth-tab {
          padding: 12px 7px;
          border: 1px solid transparent;
          border-radius: 7px;
          background: transparent;
          color: #979db2;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .auth-tab-active {
          border-color: #353b52;
          background: #191d2c;
          color: var(--cyan);
        }

        .auth-heading {
          margin: 23px 0 20px;
        }

        .auth-heading h3,
        .signed-in-panel h3 {
          margin: 0 0 8px;
          font-size: 23px;
        }

        .auth-heading p,
        .signed-in-panel p {
          margin: 0;
          color: #969bb0;
          font-size: 11px;
          line-height: 1.7;
        }

        .auth-terms {
          margin: 16px 0 0;
          color: #747990;
          font-size: 9px;
          line-height: 1.7;
          text-align: center;
        }

        .signed-in-panel {
          text-align: center;
        }

        .signed-in-icon {
          display: grid;
          place-items: center;
          width: 56px;
          height: 56px;
          margin: 0 auto 16px;
          border: 1px solid #287456;
          border-radius: 50%;
          background: #103326;
          color: #70f0b3;
          font-size: 25px;
        }

        .signed-in-panel h3 {
          margin-top: 13px;
        }

        .signed-in-panel > strong {
          display: block;
          margin-top: 8px;
          margin-bottom: 22px;
          color: var(--cyan);
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .cta-strip {
          padding: 35px 0;
          border-bottom: 1px solid #25283a;
          background: linear-gradient(100deg, #101b28, #17102b);
        }

        .cta-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 22px;
        }

        .cta-content h2 {
          margin: 10px 0 0;
          font-size: clamp(20px, 3vw, 30px);
          letter-spacing: -0.8px;
        }

        .footer {
          padding: 34px 0 18px;
          background: #070910;
        }

        .footer-main {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 20px;
          padding-bottom: 25px;
        }

        .footer-main > p {
          color: #777d94;
          font-size: 11px;
        }

        .footer-links {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          color: #a4a9bc;
          font-size: 10px;
        }

        .footer-bottom {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding-top: 18px;
          border-top: 1px solid #202337;
          color: #6f758b;
          font-size: 9px;
          letter-spacing: 0.6px;
        }

        @media (max-width: 1000px) {
          .nav-links {
            gap: 11px;
            font-size: 10px;
          }

          .hero-layout {
            gap: 20px;
          }

          .hero h1 {
            font-size: 62px;
          }

          .games-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .tournament-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .account-layout {
            gap: 30px;
          }
        }

        @media (max-width: 760px) {
          .container {
            width: min(100% - 30px, 600px);
          }

          .topbar {
            height: auto;
            min-height: 67px;
          }

          .nav-inner {
            min-height: 67px;
            flex-wrap: wrap;
            gap: 10px;
            padding-top: 10px;
            padding-bottom: 10px;
          }

          .brand {
            font-size: 14px;
          }

          .brand-mark {
            width: 37px;
            height: 37px;
            font-size: 22px;
          }

          .brand small {
            font-size: 7px;
            letter-spacing: 1.5px;
          }

          .nav-links {
            order: 3;
            display: flex;
            width: 100%;
            overflow-x: auto;
            padding: 7px 0 2px;
            gap: 19px;
            white-space: nowrap;
            scrollbar-width: none;
          }

          .nav-links::-webkit-scrollbar {
            display: none;
          }

          .nav-actions {
            margin-left: auto;
          }

          .user-pill {
            max-width: 100px;
          }

          .hero {
            padding: 48px 0 35px;
          }

          .hero-layout {
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .hero h1 {
            margin-top: 22px;
            font-size: clamp(51px, 13vw, 72px);
            letter-spacing: -3px;
          }

          .hero-description {
            font-size: 13px;
          }

          .hero-visual {
            min-height: 310px;
          }

          .hero-emblem {
            width: 175px;
            height: 210px;
          }

          .emblem-top {
            font-size: 48px;
          }

          .emblem-sword {
            font-size: 40px;
          }

          .emblem-bottom {
            font-size: 8px;
          }

          .visual-ring {
            width: 250px;
            height: 250px;
          }

          .ring-two {
            width: 300px;
            height: 300px;
          }

          .card-top {
            top: 20px;
            right: 0;
          }

          .card-bottom {
            bottom: 24px;
            left: 0;
          }

          .floating-card {
            padding: 10px;
            gap: 8px;
          }

          .floating-card small {
            font-size: 7px;
          }

          .floating-card b {
            font-size: 9px;
          }

          .floating-icon {
            font-size: 20px;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .stat-item {
            padding: 17px 12px;
            border-bottom: 1px solid #24273a;
          }

          .stat-item:first-child {
            border-left: 0;
          }

          .stat-item:nth-child(odd) {
            border-left: 1px solid #24273a;
          }

          .stat-item strong {
            font-size: 21px;
          }

          .stat-item small {
            font-size: 7px;
            letter-spacing: 1px;
          }

          .section {
            padding-top: 52px;
            padding-bottom: 52px;
          }

          .section-heading {
            align-items: flex-start;
            flex-direction: column;
            gap: 15px;
            margin-bottom: 23px;
          }

          .section-heading h2,
          .registration-intro h2 {
            font-size: 31px;
          }

          .games-grid {
            gap: 11px;
          }

          .game-card {
            padding: 15px;
          }

          .game-card-top {
            margin-bottom: 18px;
          }

          .game-icon {
            width: 45px;
            height: 45px;
            font-size: 23px;
          }

          .game-name {
            font-size: 14px;
          }

          .game-card-footer {
            margin-top: 20px;
          }

          .tournament-tools {
            align-items: stretch;
            flex-direction: column;
          }

          .filter-list {
            gap: 6px;
          }

          .filter-chip {
            padding: 9px;
            font-size: 9px;
          }

          .search-input {
            width: 100%;
          }

          .tournament-grid {
            grid-template-columns: 1fr;
          }

          .tournament-banner {
            min-height: 135px;
          }

          .registration-layout,
          .account-layout {
            grid-template-columns: 1fr;
            gap: 25px;
          }

          .registration-intro {
            padding-top: 0;
          }

          .form-panel,
          .auth-panel {
            padding: 19px;
          }

          .my-registration-row {
            align-items: flex-start;
            gap: 10px;
            padding: 12px;
          }

          .my-registration-icon {
            width: 39px;
            height: 39px;
            font-size: 20px;
          }

          .my-registration-info strong {
            font-size: 11px;
          }

          .my-registration-info span {
            font-size: 9px;
            line-height: 1.6;
          }

          .my-registration-meta small {
            font-size: 7px;
          }

          .registration-badge {
            font-size: 7px;
            padding: 5px;
          }

          .account-copy h2 {
            font-size: 36px;
          }

          .cta-content {
            align-items: flex-start;
            flex-direction: column;
          }

          .footer-main {
            align-items: flex-start;
            flex-direction: column;
          }

          .footer-bottom {
            flex-direction: column;
            line-height: 1.6;
          }
        }

        @media (max-width: 380px) {
          .container {
            width: calc(100% - 22px);
          }

          .hero h1 {
            font-size: 47px;
          }

          .button {
            padding: 0 12px;
            font-size: 10px;
          }

          .games-grid {
            grid-template-columns: 1fr 1fr;
          }

          .game-card {
            padding: 12px;
          }

          .game-name {
            font-size: 12px;
          }

          .tournament-content {
            padding: 15px;
          }

          .form-panel-heading {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}
