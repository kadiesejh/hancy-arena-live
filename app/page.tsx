
'use client';

import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { supabaseBrowser } from '../lib/supabase';

const games = [
  {
    name: 'Mobile Legends',
    icon: '⚔️',
    color: '#8b6cff',
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

type Tournament = {
  id: string;
  name: string;
  game_name?: string | null;
  format?: string | null;
  entry_fee_npr?: number | null;
  prize_pool_npr?: number | null;
  entry_fee?: number | null;
  prize_pool?: number | null;
  start_at?: string | null;
  status?: string | null;
};

type Registration = {
  id: string;
  user_id: string;
  tournament_id: string;
  team_name: string;
  captain_name?: string | null;
  phone?: string | null;
  tournament?: Tournament;
};

type Player = {
  id: string;
  player_name?: string | null;
  email?: string | null;
  game_name?: string | null;
  game_id?: string | null;
};

export default function Home() {
  const [selectedGame, setSelectedGame] = useState('All Games');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);

  const [user, setUser] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [playerName, setPlayerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const [selectedTournament, setSelectedTournament] =
    useState<Tournament | null>(null);
  const [captainName, setCaptainName] = useState('');
  const [gameId, setGameId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [phone, setPhone] = useState('');
  const [registrationMsg, setRegistrationMsg] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registrationBusy, setRegistrationBusy] = useState(false);

  const [myRegistrations, setMyRegistrations] = useState<Registration[]>([]);
  const [loadingMyRegistrations, setLoadingMyRegistrations] = useState(false);
  const [myRegistrationsError, setMyRegistrationsError] = useState('');
  const [registrationRefresh, setRegistrationRefresh] = useState(0);
  const [profile, setProfile] = useState<Player | null>(null);

  const getGameName = useCallback((t: Tournament) => {
    if (typeof t.game_name === 'string' && t.game_name.trim()) {
      const found = games.find(
        (game) => game.name.toLowerCase() === t.game_name!.trim().toLowerCase()
      );
      return found?.name || t.game_name.trim();
    }

    const name = (t.name || '').toLowerCase();

    if (name.includes('pubg')) return 'PUBG Mobile';
    if (name.includes('free fire') || name.includes('freefire')) return 'Free Fire';
    if (name.includes('ludo')) return 'Ludo King';

    return 'Mobile Legends';
  }, []);

  const getFee = (t: Tournament) =>
    Number(t.entry_fee_npr ?? t.entry_fee ?? 0);

  const getPrize = (t: Tournament) =>
    Number(t.prize_pool_npr ?? t.prize_pool ?? 0);

  const formatMoney = (amount: number) =>
    `NPR ${amount.toLocaleString('en-IN')}`;

  const formatDate = (value?: string | null) => {
    if (!value) return 'Date to be announced';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return 'Date to be announced';

    return date.toLocaleString();
  };

  const normalizeStatus = (status?: string | null) =>
    String(status || 'open').trim().toLowerCase().replace(/[\s-]+/g, '_');

  const isRegistrationOpen = (t: Tournament) => {
    const status = normalizeStatus(t.status);

    return ['open', 'registration_open'].includes(status);
  };

  const getStatusLabel = (status?: string | null) => {
    const normalized = normalizeStatus(status);

    const labels: Record<string, string> = {
      open: 'Registration Open',
      registration_open: 'Registration Open',
      pending_verification: 'Pending Review',
      pending: 'Pending',
      approved: 'Approved',
      live: 'Live Now',
      full: 'Slots Full',
      closed: 'Closed',
      completed: 'Completed',
      rejected: 'Rejected',
      cancelled: 'Cancelled',
    };

    return labels[normalized] || String(status || 'Open').replace(/_/g, ' ');
  };

  const refreshRegistrations = () =>
    setRegistrationRefresh((value) => value + 1);

  useEffect(() => {
    const sb = supabaseBrowser();

    if (!sb) {
      setMsg('Supabase configuration missing. Check environment variables.');
      setLoadingTournaments(false);
      setAuthReady(true);
      return;
    }

    let mounted = true;

    async function initialize() {
      try {
        const client = sb!;

        const [sessionResult, tournamentResult] = await Promise.all([
          client.auth.getSession(),
          client.from('tournaments').select('*').order('start_at', {
            ascending: true,
          }),
        ]);

        if (!mounted) return;

        if (sessionResult.error) {
          setMsg(`Session error: ${sessionResult.error.message}`);
        }

        setUser(sessionResult.data.session?.user ?? null);

        if (tournamentResult.error) {
          setMsg(`Tournament loading error: ${tournamentResult.error.message}`);
        } else {
          setTournaments((tournamentResult.data || []) as Tournament[]);
        }
      } catch {
        if (mounted) {
          setMsg('Website data load nahi ho paya. Refresh karke try karo.');
        }
      } finally {
        if (mounted) {
          setLoadingTournaments(false);
          setAuthReady(true);
        }
      }
    }

    void initialize();

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setUser(session?.user ?? null);

      if (session?.user) {
        const savedName = String(session.user.user_metadata?.player_name || '');
        if (savedName) setCaptainName(savedName);
      } else {
        setProfile(null);
        setMyRegistrations([]);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady || !user?.id) {
      setProfile(null);
      return;
    }

    const sb = supabaseBrowser();
    if (!sb) return;

    let mounted = true;

    async function loadProfile() {
      const client = sb!;

      const { data, error } = await client
        .from('players')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        setProfile(null);
        return;
      }

      setProfile((data || null) as Player | null);
    }

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, [authReady, user?.id]);

  useEffect(() => {
    let mounted = true;

    async function loadMyRegistrations() {
      if (!authReady || !user?.id) {
        setMyRegistrations([]);
        setLoadingMyRegistrations(false);
        setMyRegistrationsError('');
        return;
      }

      const sb = supabaseBrowser();

      if (!sb) {
        setMyRegistrationsError('Supabase connection missing hai.');
        setLoadingMyRegistrations(false);
        return;
      }

      setLoadingMyRegistrations(true);
      setMyRegistrationsError('');

      try {
        const client = sb!;

        const { data, error } = await client
          .from('registrations')
          .select('id, user_id, tournament_id, team_name, captain_name, phone')
          .eq('user_id', user.id);

        if (!mounted) return;

        if (error) {
          setMyRegistrations([]);
          setMyRegistrationsError(error.message);
          return;
        }

        const rows = (data || []) as Registration[];
        const tournamentIds = [...new Set(rows.map((row) => row.tournament_id))];

        let tournamentMap = new Map<string, Tournament>();

        if (tournamentIds.length) {
          const { data: tournamentData, error: tournamentError } = await client
            .from('tournaments')
            .select('*')
            .in('id', tournamentIds);

          if (!mounted) return;

          if (tournamentError) {
            setMyRegistrationsError(tournamentError.message);
            setMyRegistrations([]);
            return;
          }

          tournamentMap = new Map(
            ((tournamentData || []) as Tournament[]).map((item) => [
              item.id,
              item,
            ])
          );
        }

        if (!mounted) return;

        setMyRegistrations(
          rows.map((row) => ({
            ...row,
            tournament: tournamentMap.get(row.tournament_id),
          }))
        );
      } catch {
        if (mounted) {
          setMyRegistrationsError(
            'Registrations load nahi hui. Dobara try karo.'
          );
        }
      } finally {
        if (mounted) setLoadingMyRegistrations(false);
      }
    }

    void loadMyRegistrations();

    return () => {
      mounted = false;
    };
  }, [authReady, user?.id, registrationRefresh]);

  const filteredTournaments = tournaments.filter((tournament) => {
    if (selectedGame === 'All Games') return true;
    return getGameName(tournament) === selectedGame;
  });

  async function handleAuth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg('');
    setBusy(true);

    try {
      const sb = supabaseBrowser();

      if (!sb) {
        setMsg('Supabase configuration missing hai.');
        return;
      }

      const cleanEmail = email.trim().toLowerCase();

      if (authMode === 'signup') {
        const cleanName = playerName.trim();

        if (cleanName.length < 2) {
          setMsg('Player name kam se kam 2 characters ka hona chahiye.');
          return;
        }

        const { data, error } = await sb.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { player_name: cleanName } },
        });

        if (error) {
          setMsg(`Signup error: ${error.message}`);
          return;
        }

        if (data.session && data.user) {
          setUser(data.user);
          setCaptainName(cleanName);
          setMsg('Account created successfully!');
          setPlayerName('');
          setEmail('');
          setPassword('');
        } else {
          setMsg(
            'Account request successful. Email confirmation enabled hai toh email verify karke Sign In karo.'
          );
          setAuthMode('signin');
          setPassword('');
        }
      } else {
        const { data, error } = await sb.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          setMsg(`Sign in error: ${error.message}`);
          return;
        }

        setUser(data.user);
        setCaptainName(String(data.user.user_metadata?.player_name || ''));
        setMsg('Login successful!');
        setEmail('');
        setPassword('');
        refreshRegistrations();
      }
    } catch {
      setMsg('Authentication failed. Dobara try karo.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRegistration(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setRegistrationMsg('');
    setRegistrationSuccess(false);

    if (!selectedTournament) {
      setRegistrationMsg('Pehle tournament select karo.');
      return;
    }

    if (!user?.id) {
      setRegistrationMsg('Pehle Sign In karo.');
      document.getElementById('login')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    const cleanCaptain = captainName.trim();
    const cleanTeam = teamName.trim();
    const cleanPhone = phone.trim();
    const cleanGameId = gameId.trim();

    if (
      cleanCaptain.length < 2 ||
      cleanTeam.length < 2 ||
      !cleanPhone ||
      !cleanGameId
    ) {
      setRegistrationMsg('Saari details sahi tarah bharo.');
      return;
    }

    if (!isRegistrationOpen(selectedTournament)) {
      setRegistrationMsg(
        'Yeh tournament abhi registration ke liye open nahi hai.'
      );
      return;
    }

    setRegistrationBusy(true);

    try {
      const sb = supabaseBrowser();

      if (!sb) {
        setRegistrationMsg('Supabase connection missing hai.');
        return;
      }

      const { data: existing, error: checkError } = await sb
        .from('registrations')
        .select('id')
        .eq('user_id', user.id)
        .eq('tournament_id', selectedTournament.id)
        .maybeSingle();

      if (checkError) {
        setRegistrationMsg(`Registration check error: ${checkError.message}`);
        return;
      }

      if (existing) {
        setRegistrationMsg('Tum is tournament mein pehle hi register ho.');
        refreshRegistrations();
        return;
      }

      const profilePayload: Record<string, unknown> = {
        id: user.id,
        game_name: getGameName(selectedTournament),
        game_id: cleanGameId,
      };

      const metadataName = String(user.user_metadata?.player_name || '').trim();

      if (metadataName || cleanCaptain) {
        profilePayload.player_name = metadataName || cleanCaptain;
      }

      if (user.email) profilePayload.email = user.email;

      const { error: profileError } = await sb
        .from('players')
        .upsert(profilePayload, { onConflict: 'id' });

      if (profileError) {
        setRegistrationMsg(
          `Player profile save nahi hua: ${profileError.message}`
        );
        return;
      }

      const { error: registrationError } = await sb
        .from('registrations')
        .insert({
          user_id: user.id,
          tournament_id: selectedTournament.id,
          team_name: cleanTeam,
          captain_name: cleanCaptain,
          phone: cleanPhone,
        });

      if (registrationError) {
        if (
          registrationError.code === '23505' ||
          registrationError.message.toLowerCase().includes('duplicate')
        ) {
          setRegistrationMsg(
            'Tum is tournament mein pehle hi register ho chuke ho.'
          );
          refreshRegistrations();
        } else {
          setRegistrationMsg(`Registration error: ${registrationError.message}`);
        }
        return;
      }

      setRegistrationSuccess(true);
      setRegistrationMsg(
        `Registration successful! ${selectedTournament.name} mein tumhara registration save ho gaya.`
      );
      setTeamName('');
      setPhone('');
      setGameId('');
      refreshRegistrations();
    } catch {
      setRegistrationMsg(
        'Registration complete nahi hui. Internet check karke dobara try karo.'
      );
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
      return;
    }

    setUser(null);
    setProfile(null);
    setMyRegistrations([]);
    setSelectedTournament(null);
    setRegistrationMsg('');
    setMsg('You have been signed out.');
  }

  return (
    <>
      <header className="site-header">
        <div className="wrap nav">
          <a className="logo" href="#home" aria-label="Hancy Arena home">
            HANCY<span>ARENA</span>
            <small>ESPORTS PLATFORM</small>
          </a>

          <nav className="links" aria-label="Main navigation">
            <a href="#home">Home</a>
            <a href="#games">Games</a>
            <a href="#tournaments">Tournaments</a>
            <a href="#my-registrations">My Matches</a>
            <a href="#leaderboard">Leaderboard</a>
            <a href="/results">Results</a>
            <a href="/wallet">Wallet</a>
            <a className="nav-account" href="#login">
              {user ? 'My Account' : 'Sign In'}
            </a>
          </nav>
        </div>
      </header>

      <main id="home">
        <div className="wrap">
          <section className="hero">
            <div className="hero-copy">
              <span className="badge">
                <span className="live-dot" />
                NEPAL GAMING COMMUNITY
              </span>

              <h1>
                YOUR GAME.
                <br />
                YOUR <span>ARENA.</span>
              </h1>

              <p>
                Compete with your squad, join tournaments and make your mark
                in Hancy Arena. Your next victory starts here.
              </p>

              <div className="hero-actions">
                <a className="btn" href="#tournaments">
                  Explore Tournaments <span>↗</span>
                </a>
                <a className="btn alt" href="#games">
                  Choose Your Game
                </a>
              </div>

              <div className="hero-trust">
                <span>⚡ Competitive Gaming</span>
                <span>🏆 Tournament Events</span>
                <span>🇳🇵 NPR Support</span>
              </div>
            </div>

            <div className="hero-art">
              <div className="hero-orbit orbit-one" />
              <div className="hero-orbit orbit-two" />
              <div className="hero-emblem">
                <span className="emblem-crown">♛</span>
                <span className="emblem-title">HANCY</span>
                <span className="emblem-subtitle">ARENA</span>
                <span className="emblem-line" />
                <span className="emblem-caption">PLAY • COMPETE • WIN</span>
              </div>
              <div className="floating-tag tag-top">⚔️ BATTLE READY</div>
              <div className="floating-tag tag-bottom">🏆 YOUR NEXT WIN</div>
            </div>
          </section>

          <section className="stats-section" aria-label="Arena statistics">
            <div className="stat">
              <span className="stat-icon">🎮</span>
              <div>
                <strong>{games.length}</strong>
                <span>Official Games</span>
              </div>
            </div>

            <div className="stat">
              <span className="stat-icon">🏆</span>
              <div>
                <strong>{tournaments.length}</strong>
                <span>Tournaments Listed</span>
              </div>
            </div>

            <div className="stat">
              <span className="stat-icon">🇳🇵</span>
              <div>
                <strong>NPR</strong>
                <span>Local Currency</span>
              </div>
            </div>

            <div className="stat">
              <span className="stat-icon">👤</span>
              <div>
                <strong>{user ? 'ONLINE' : 'JOIN US'}</strong>
                <span>Player Account</span>
              </div>
            </div>
          </section>

          <section className="section" id="games">
            <div className="section-heading">
              <div>
                <span className="eyebrow">FIND YOUR BATTLE</span>
                <h2>Choose Your Game</h2>
                <p className="muted">
                  Select a game to explore its available tournaments.
                </p>
              </div>
              <span className="heading-mark">01 / GAMES</span>
            </div>

            <div className="game-grid">
              <button
                type="button"
                className={`game-card all-card ${
                  selectedGame === 'All Games' ? 'selected' : ''
                }`}
                onClick={() => setSelectedGame('All Games')}
                aria-pressed={selectedGame === 'All Games'}
              >
                <span className="game-image all-image">🎮</span>
                <span className="game-name">All Games</span>
                <span className="game-description">Explore every game</span>
                <span className="game-arrow">↗</span>
              </button>

              {games.map((game) => (
                <button
                  type="button"
                  key={game.name}
                  className={`game-card ${
                    selectedGame === game.name ? 'selected' : ''
                  }`}
                  style={{ '--game-color': game.color } as React.CSSProperties}
                  onClick={() => setSelectedGame(game.name)}
                  aria-pressed={selectedGame === game.name}
                >
                  <span className="game-image">
                    <img
                      src={game.logo}
                      alt={`${game.name} logo`}
                      className="game-logo"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback =
                          e.currentTarget.nextElementSibling as HTMLElement | null;
                        if (fallback) fallback.style.display = 'grid';
                      }}
                    />
                    <span className="logo-fallback">{game.icon}</span>
                  </span>
                  <span className="game-name">{game.name}</span>
                  <span className="game-description">{game.description}</span>
                  <span className="game-arrow">↗</span>
                </button>
              ))}
            </div>
          </section>

          <section className="section" id="tournaments">
            <div className="section-heading">
              <div>
                <span className="eyebrow">ENTER THE COMPETITION</span>
                <h2>Featured Tournaments</h2>
                <p className="muted">
                  {selectedGame === 'All Games'
                    ? 'Explore tournaments available in the arena.'
                    : `Showing tournaments for ${selectedGame}.`}
                </p>
              </div>
              <span className="heading-mark">02 / EVENTS</span>
            </div>

            <div className="filter-row">
              {['All Games', ...games.map((game) => game.name)].map((name) => (
                <button
                  type="button"
                  key={name}
                  className={`filter-chip ${selectedGame === name ? 'active' : ''}`}
                  onClick={() => setSelectedGame(name)}
                >
                  {name}
                </button>
              ))}
            </div>

            {loadingTournaments && (
              <div className="empty-state">
                <span className="loading-symbol">◌</span>
                <h3>Loading tournaments...</h3>
                <p>Please wait while we load arena events.</p>
              </div>
            )}

            {!loadingTournaments && filteredTournaments.length > 0 && (
              <div className="tournament-grid">
                {filteredTournaments.map((tournament) => {
                  const gameName = getGameName(tournament);
                  const game = games.find((item) => item.name === gameName);
                  const open = isRegistrationOpen(tournament);

                  return (
                    <article className="tournament-card" key={tournament.id}>
                      <div className="tournament-card-top">
                        <span
                          className={`event-status ${open ? 'status-open' : 'status-other'}`}
                        >
                          <span className="status-dot" />
                          {getStatusLabel(tournament.status)}
                        </span>
                        <span className="event-format">
                          {tournament.format || 'Tournament'}
                        </span>
                      </div>

                      <div className="event-game">
                        <span
                          className="event-game-icon"
                          style={{ '--game-color': game?.color || '#00e5ff' } as React.CSSProperties}
                        >
                          {game?.icon || '🎮'}
                        </span>
                        <span>{gameName}</span>
                      </div>

                      <h3>{tournament.name}</h3>

                      <div className="event-details">
                        <div className="event-detail">
                          <span>ENTRY FEE</span>
                          <strong>{formatMoney(getFee(tournament))}</strong>
                        </div>
                        <div className="event-detail prize-detail">
                          <span>PRIZE POOL</span>
                          <strong>{formatMoney(getPrize(tournament))}</strong>
                        </div>
                      </div>

                      <div className="event-date">
                        <span>◷</span>
                        <span>{formatDate(tournament.start_at)}</span>
                      </div>

                      <button
                        type="button"
                        className="btn event-button"
                        disabled={!open}
                        onClick={() => {
                          setSelectedTournament(tournament);
                          setRegistrationMsg('');
                          setRegistrationSuccess(false);
                          document
                            .getElementById('register-form')
                            ?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        {open ? 'Join Tournament →' : getStatusLabel(tournament.status)}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}

            {!loadingTournaments && filteredTournaments.length === 0 && (
              <div className="empty-state">
                <span className="empty-icon">🏆</span>
                <h3>No tournaments available yet</h3>
                <p>
                  There are no tournaments listed for this selection right now.
                  Please check back later.
                </p>
                {selectedGame !== 'All Games' && (
                  <button
                    type="button"
                    className="btn alt"
                    onClick={() => setSelectedGame('All Games')}
                  >
                    View All Games
                  </button>
                )}
              </div>
            )}
          </section>

          <section className="section" id="my-registrations">
            <div className="section-heading">
              <div>
                <span className="eyebrow">YOUR COMPETITION HISTORY</span>
                <h2>My Registrations</h2>
                <p className="muted">
                  Keep track of tournaments you have joined.
                </p>
              </div>
              <span className="heading-mark">03 / MY EVENTS</span>
            </div>

            {!user && (
              <div className="empty-state">
                <span className="empty-icon">👤</span>
                <h3>Sign in to view your registrations</h3>
                <p>Your registered tournaments will appear here.</p>
                <a className="btn" href="#login">Sign In →</a>
              </div>
            )}

            {user && loadingMyRegistrations && (
              <div className="empty-state">
                <span className="loading-symbol">◌</span>
                <h3>Loading your registrations...</h3>
              </div>
            )}

            {user && myRegistrationsError && (
              <div className="empty-state">
                <h3>Could not load registrations</h3>
                <p>{myRegistrationsError}</p>
                <button
                  type="button"
                  className="btn"
                  onClick={refreshRegistrations}
                >
                  Try Again
                </button>
              </div>
            )}

            {user && !loadingMyRegistrations && !myRegistrationsError && (
              <>
                <div className="registration-count">
                  <span className="count-number">{myRegistrations.length}</span>
                  <span>tournament registration(s)</span>
                </div>

                {myRegistrations.length > 0 ? (
                  <div className="tournament-grid">
                    {myRegistrations.map((registration) => {
                      const tournament = registration.tournament;

                      return (
                        <article className="tournament-card" key={registration.id}>
                          <div className="tournament-card-top">
                            <span className="event-status status-open">
                              <span className="status-dot" />
                              REGISTERED
                            </span>
                          </div>

                          <h3>
                            {tournament?.name || 'Tournament details unavailable'}
                          </h3>

                          <p className="muted">
                            {tournament
                              ? getGameName(tournament)
                              : 'Game details unavailable'}
                          </p>

                          <div className="registration-info">
                            <p><span>Team</span><strong>{registration.team_name}</strong></p>
                            <p><span>Captain</span><strong>{registration.captain_name || 'Not provided'}</strong></p>
                            {tournament && (
                              <>
                                <p><span>Entry Fee</span><strong>{formatMoney(getFee(tournament))}</strong></p>
                                <p><span>Prize Pool</span><strong>{formatMoney(getPrize(tournament))}</strong></p>
                                <p><span>Event Status</span><strong>{getStatusLabel(tournament.status)}</strong></p>
                              </>
                            )}
                          </div>

                          {tournament?.start_at && (
                            <div className="event-date">
                              <span>◷</span>
                              <span>{formatDate(tournament.start_at)}</span>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <span className="empty-icon">🎮</span>
                    <h3>You haven't joined a tournament yet</h3>
                    <p>Find your game and register for an open event.</p>
                    <a className="btn" href="#tournaments">Explore Tournaments →</a>
                  </div>
                )}
              </>
            )}
          </section>

          {selectedTournament && (
            <section className="section" id="register-form">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">LOCK IN YOUR SPOT</span>
                  <h2>Tournament Registration</h2>
                  <p className="muted">
                    Complete your player details to submit your registration.
                  </p>
                </div>
              </div>

              <div className="registration-layout">
                <div className="registration-summary">
                  <span className="summary-icon">🏆</span>
                  <span className="eyebrow">SELECTED EVENT</span>
                  <h3>{selectedTournament.name}</h3>
                  <p className="muted">{getGameName(selectedTournament)}</p>
                  <div className="summary-price">
                    <span>Entry Fee</span>
                    <strong>{formatMoney(getFee(selectedTournament))}</strong>
                  </div>
                  <div className="summary-price">
                    <span>Prize Pool</span>
                    <strong>{formatMoney(getPrize(selectedTournament))}</strong>
                  </div>
                  <p className="summary-note">
                    Registration is submitted to the website database. Entry-fee
                    charging is not performed by this form.
                  </p>
                </div>

                <div className="registration-form-panel">
                  {!user && (
                    <div className="msg err">
                      Please sign in before submitting your registration.
                      <a className="inline-link" href="#login"> Sign In</a>
                    </div>
                  )}

                  <form className="form" onSubmit={handleRegistration}>
                    <label>
                      Captain / Player Name
                      <input
                        type="text"
                        placeholder="Enter your player name"
                        value={captainName}
                        onChange={(e) => setCaptainName(e.target.value)}
                        minLength={2}
                        maxLength={60}
                        required
                      />
                    </label>

                    <label>
                      In-game ID / UID
                      <input
                        type="text"
                        placeholder="Enter your game UID"
                        value={gameId}
                        onChange={(e) => setGameId(e.target.value)}
                        maxLength={100}
                        required
                      />
                    </label>

                    <label>
                      Team Name
                      <input
                        type="text"
                        placeholder="Enter your team name"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        minLength={2}
                        maxLength={80}
                        required
                      />
                    </label>

                    <label>
                      Phone Number
                      <input
                        type="tel"
                        placeholder="Enter your phone number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        maxLength={25}
                        required
                      />
                    </label>

                    <button
                      className="btn submit-button"
                      disabled={registrationBusy || !user}
                    >
                      {registrationBusy ? 'Submitting...' : 'Submit Registration →'}
                    </button>

                    <button
                      type="button"
                      className="btn alt"
                      onClick={() => {
                        setSelectedTournament(null);
                        setRegistrationMsg('');
                        setRegistrationSuccess(false);
                      }}
                    >
                      Cancel
                    </button>

                    {registrationMsg && (
                      <div
                        className={`msg ${!registrationSuccess ? 'err' : ''}`}
                        role="status"
                      >
                        {registrationMsg}
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </section>
          )}

          <section className="section" id="leaderboard">
            <div className="section-heading">
              <div>
                <span className="eyebrow">THE TOP COMPETITORS</span>
                <h2>Arena Leaderboard</h2>
                <p className="muted">
                  Player rankings and match results will appear here when the
                  results data is connected.
                </p>
              </div>
              <span className="heading-mark">04 / RANKINGS</span>
            </div>

            <div className="empty-state leaderboard-state">
              <span className="empty-icon">🏆</span>
              <h3>The leaderboard is getting ready</h3>
              <p>
                Rankings have not been connected to verified game result
                columns yet. No demo rankings are shown as real player results.
              </p>
              <a className="btn alt" href="/results">View Results Page →</a>
            </div>
          </section>

          <section className="section" id="login">
            <div className="section-heading">
              <div>
                <span className="eyebrow">PLAYER ACCESS</span>
                <h2>{user ? 'Your Player Account' : 'Join the Arena'}</h2>
                <p className="muted">
                  {user
                    ? 'Manage your account and access your player features.'
                    : 'Create your account or sign in to join tournaments.'}
                </p>
              </div>
              <span className="heading-mark">05 / ACCOUNT</span>
            </div>

            <div className="account-layout">
              <div className="account-promo">
                <span className="account-symbol">♛</span>
                <span className="eyebrow">WELCOME TO HANCY ARENA</span>
                <h3>Ready to compete?</h3>
                <p>
                  Sign in to manage your registrations and access your arena
                  account.
                </p>
                <div className="account-perk">✓ Tournament registration</div>
                <div className="account-perk">✓ Personal registration history</div>
                <div className="account-perk">✓ Wallet page access</div>
              </div>

              <div className="account-panel">
                {user ? (
                  <div className="form">
                    <span className="account-avatar">👤</span>
                    <span className="eyebrow">SIGNED IN</span>
                    <h3>
                      {profile?.player_name ||
                        user.user_metadata?.player_name ||
                        'Player'}
                    </h3>
                    <p className="muted">{user.email || 'Email unavailable'}</p>
                    <div className="account-detail">
                      <span>Profile</span>
                      <strong>{profile ? 'Loaded' : 'Not available'}</strong>
                    </div>
                    <a className="btn" href="/wallet">💳 Open My Wallet</a>
                    <button type="button" className="btn alt" onClick={logout}>
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="auth-tabs">
                      <button
                        type="button"
                        className={authMode === 'signin' ? 'auth-tab active' : 'auth-tab'}
                        onClick={() => {
                          setAuthMode('signin');
                          setMsg('');
                        }}
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        className={authMode === 'signup' ? 'auth-tab active' : 'auth-tab'}
                        onClick={() => {
                          setAuthMode('signup');
                          setMsg('');
                        }}
                      >
                        Create Account
                      </button>
                    </div>

                    <h3>{authMode === 'signup' ? 'Create your account' : 'Welcome back'}</h3>
                    <p className="muted">
                      {authMode === 'signup'
                        ? 'Enter your details to join the arena.'
                        : 'Sign in with your registered email.'}
                    </p>

                    <form className="form" onSubmit={handleAuth}>
                      {authMode === 'signup' && (
                        <label>
                          Player Name
                          <input
                            type="text"
                            placeholder="Enter your player name"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            minLength={2}
                            maxLength={40}
                            required
                          />
                        </label>
                      )}

                      <label>
                        Email Address
                        <input
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </label>

                      <label>
                        Password
                        <input
                          type="password"
                          placeholder="Minimum 6 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          minLength={6}
                          required
                        />
                      </label>

                      <button className="btn submit-button" disabled={busy}>
                        {busy
                          ? 'Please wait...'
                          : authMode === 'signup'
                            ? 'Create Account →'
                            : 'Sign In →'}
                      </button>
                    </form>
                  </>
                )}

                {msg && (
                  <div
                    className={`msg ${
                      /error|missing|failed/i.test(msg) ? 'err' : ''
                    }`}
                    role="status"
                  >
                    {msg}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="site-footer">
        <div className="wrap footer-inner">
          <a className="logo" href="#home">
            HANCY<span>ARENA</span>
          </a>
          <p>Play fair. Compete hard. Make your mark.</p>
          <div className="footer-links">
            <a href="#games">Games</a>
            <a href="#tournaments">Tournaments</a>
            <a href="/results">Results</a>
            <a href="/wallet">Wallet</a>
          </div>
          <small>© 2026 Hancy Arena. All rights reserved.</small>
        </div>
      </footer>

      <style jsx>{`
        .site-header {
          position: relative;
          z-index: 10;
          border-bottom: 1px solid #202b3e;
          background: rgba(7, 10, 18, 0.93);
        }

        .nav {
          min-height: 82px;
        }

        .logo {
          display: flex;
          flex-direction: column;
          gap: 3px;
          font-size: 23px;
          letter-spacing: 0.4px;
        }

        .logo span {
          color: #00e5ff;
        }

        .logo small {
          color: #7d8ca8;
          font-size: 9px;
          letter-spacing: 2.5px;
        }

        .links {
          justify-content: flex-end;
        }

        .nav-account {
          padding: 10px 14px;
          border: 1px solid #285467;
          border-radius: 9px;
          color: #00e5ff;
          background: #071a22;
        }

        .hero {
          position: relative;
          grid-template-columns: minmax(0, 1.15fr) minmax(280px, 0.85fr);
          min-height: 465px;
          padding: 66px 0 48px;
          gap: 25px;
        }

        .hero-copy {
          position: relative;
          z-index: 2;
        }

        .live-dot,
        .status-dot {
          display: inline-block;
          width: 7px;
          height: 7px;
          flex-shrink: 0;
          border-radius: 50%;
          background: #00e5ff;
          box-shadow: 0 0 10px #00e5ff;
        }

        .hero h1 {
          margin: 22px 0 18px;
          font-size: clamp(44px, 5.6vw, 72px);
          line-height: 0.99;
          letter-spacing: -2.8px;
        }

        .hero h1 span {
          color: #00e5ff;
          text-shadow: 0 0 35px #00e5ff28;
        }

        .hero-copy > p {
          max-width: 560px;
          margin-bottom: 25px;
          font-size: 16px;
        }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .hero-actions .btn.alt {
          margin-left: 0;
        }

        .hero-trust {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          margin-top: 27px;
          color: #8d9ab3;
          font-size: 11px;
        }

        .hero-art {
          position: relative;
          display: grid;
          place-items: center;
          min-height: 330px;
          overflow: hidden;
          border: 1px solid #25324a;
          border-radius: 26px;
          background:
            radial-gradient(circle at 50% 45%, #163a50 0%, #10192d 35%, #0b101b 75%);
        }

        .hero-art::before {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(#ffffff06 1px, transparent 1px),
            linear-gradient(90deg, #ffffff06 1px, transparent 1px);
          background-size: 28px 28px;
          content: '';
          mask-image: linear-gradient(transparent, black, transparent);
        }

        .hero-orbit {
          position: absolute;
          width: 250px;
          height: 250px;
          border: 1px solid #00e5ff28;
          border-radius: 50%;
        }

        .orbit-two {
          width: 310px;
          height: 310px;
          border-color: #657cff24;
        }

        .hero-emblem {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          flex-direction: column;
          justify-content: center;
          width: 210px;
          height: 235px;
          border: 1px solid #00e5ff8a;
          border-radius: 48% 48% 28% 28%;
          background: linear-gradient(145deg, #172a40, #080d17 75%);
          box-shadow: 0 0 50px #00e5ff12, inset 0 0 35px #00e5ff0b;
          clip-path: polygon(50% 0%, 90% 12%, 100% 48%, 85% 83%, 50% 100%, 15% 83%, 0% 48%, 10% 12%);
        }

        .emblem-crown {
          color: #00e5ff;
          font-size: 44px;
          line-height: 1;
        }

        .emblem-title {
          margin-top: 9px;
          font-size: 27px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .emblem-subtitle {
          color: #00e5ff;
          font-size: 15px;
          font-weight: 900;
          letter-spacing: 6px;
        }

        .emblem-line {
          width: 95px;
          height: 1px;
          margin: 12px 0 8px;
          background: #00e5ff;
        }

        .emblem-caption {
          color: #9eacc5;
          font-size: 8px;
          letter-spacing: 1px;
        }

        .floating-tag {
          position: absolute;
          z-index: 2;
          padding: 10px 12px;
          border: 1px solid #33445e;
          border-radius: 10px;
          background: #101a2aeb;
          color: #e6f4ff;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.6px;
        }

        .tag-top {
          top: 14%;
          right: 5%;
        }

        .tag-bottom {
          bottom: 13%;
          left: 5%;
        }

        .stats-section {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          padding: 0 0 26px;
        }

        .stat {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
          padding: 17px;
          border: 1px solid #253047;
          border-radius: 14px;
          background: linear-gradient(145deg, #111a29, #0c111c);
        }

        .stat-icon {
          display: grid;
          place-items: center;
          width: 43px;
          height: 43px;
          flex-shrink: 0;
          border: 1px solid #2b425a;
          border-radius: 12px;
          background: #102235;
          font-size: 20px;
        }

        .stat strong {
          display: block;
          margin-bottom: 5px;
          color: #f5f9ff;
          font-size: 21px;
          overflow-wrap: anywhere;
        }

        .stat span:last-child {
          color: #8593ad;
          font-size: 11px;
        }

        .section {
          padding: 36px 0 43px;
          scroll-margin-top: 22px;
        }

        .section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 23px;
        }

        .section-heading h2 {
          margin: 8px 0;
          font-size: clamp(25px, 3vw, 34px);
          letter-spacing: -0.8px;
        }

        .section-heading p {
          margin: 0;
          font-size: 13px;
        }

        .eyebrow {
          color: #00cfe8;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .heading-mark {
          flex-shrink: 0;
          padding-bottom: 5px;
          color: #5d6a83;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .game-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 13px;
        }

        .game-card {
          --game-color: #00e5ff;
          position: relative;
          display: flex;
          min-width: 0;
          min-height: 185px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 17px 10px;
          overflow: hidden;
          border: 1px solid #273249;
          border-radius: 15px;
          background: linear-gradient(145deg, #141d2c, #0b101a);
          color: #fff;
          text-align: center;
          transition: transform 0.2s ease, border-color 0.2s ease,
            background 0.2s ease;
        }

        .game-card::after {
          position: absolute;
          right: 0;
          bottom: 0;
          left: 0;
          height: 2px;
          background: var(--game-color);
          opacity: 0;
          content: '';
        }

        .game-card:hover,
        .game-card.selected {
          transform: translateY(-3px);
          border-color: var(--game-color);
          background: linear-gradient(145deg, #1a2639, #0d1422);
        }

        .game-card.selected::after {
          opacity: 1;
        }

        .game-image {
          position: relative;
          display: grid;
          place-items: center;
          width: 76px;
          height: 76px;
          flex-shrink: 0;
          overflow: hidden;
          border: 1px solid var(--game-color);
          border-radius: 18px;
          background: #f8f9fc;
          box-shadow: 0 0 20px #0003;
        }

        .game-logo {
          display: block;
          width: 100%;
          height: 100%;
          padding: 3px;
          object-fit: contain;
        }

        .logo-fallback {
          position: absolute;
          inset: 0;
          display: none;
          place-items: center;
          background: #121b2b;
          font-size: 34px;
        }

        .all-card {
          --game-color: #00e5ff;
        }

        .all-image {
          background: #12273a;
          font-size: 34px;
        }

        .game-name {
          font-size: 13px;
          font-weight: 800;
        }

        .game-description {
          color: #8c9ab2;
          font-size: 11px;
        }

        .game-arrow {
          position: absolute;
          top: 10px;
          right: 12px;
          color: var(--game-color);
          opacity: 0;
        }

        .game-card.selected .game-arrow,
        .game-card:hover .game-arrow {
          opacity: 1;
        }

        .filter-row {
          display: flex;
          gap: 8px;
          margin: 0 0 20px;
          padding-bottom: 4px;
          overflow-x: auto;
          scrollbar-width: thin;
        }

        .filter-chip {
          flex-shrink: 0;
          padding: 9px 13px;
          border: 1px solid #29364b;
          border-radius: 999px;
          background: #0e1522;
          color: #aab7cc;
          font-size: 11px;
          font-weight: 700;
        }

        .filter-chip.active {
          border-color: #00bcd4;
          background: #0a2631;
          color: #00e5ff;
        }

        .tournament-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 15px;
        }

        .tournament-card {
          display: flex;
          min-width: 0;
          flex-direction: column;
          padding: 19px;
          border: 1px solid #28354a;
          border-radius: 16px;
          background: linear-gradient(145deg, #121b2a, #0b101a);
          transition: border-color 0.2s ease, transform 0.2s ease;
        }

        .tournament-card:hover {
          transform: translateY(-2px);
          border-color: #3a5d79;
        }

        .tournament-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
        }

        .event-status {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 7px 9px;
          border-radius: 7px;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.5px;
        }

        .status-open {
          background: #113126;
          color: #70e8a4;
        }

        .status-open .status-dot {
          background: #61e294;
          box-shadow: 0 0 8px #61e294;
        }

        .status-other {
          background: #292438;
          color: #d0b6ff;
        }

        .status-other .status-dot {
          background: #bb9bff;
          box-shadow: none;
        }

        .event-format {
          color: #8492aa;
          font-size: 10px;
        }

        .event-game {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 20px;
          color: #9eabc1;
          font-size: 12px;
        }

        .event-game-icon {
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          border: 1px solid var(--game-color);
          border-radius: 10px;
          background: #101a29;
          font-size: 20px;
        }

        .tournament-card h3 {
          margin: 14px 0 17px;
          font-size: 19px;
          line-height: 1.4;
        }

        .event-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: auto;
          padding: 14px 0;
          border-top: 1px solid #253047;
          border-bottom: 1px solid #253047;
        }

        .event-detail span,
        .summary-price span {
          display: block;
          margin-bottom: 7px;
          color: #8290a8;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .event-detail strong {
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .prize-detail strong {
          color: #00e5ff;
        }

        .event-date {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin: 14px 0;
          color: #94a1b8;
          font-size: 11px;
          line-height: 1.6;
        }

        .event-date > span:first-child {
          color: #00e5ff;
          font-size: 15px;
        }

        .event-button {
          width: 100%;
          margin-top: 4px;
        }

        .event-button:disabled {
          border-color: #293145;
          background: #1a2030;
          color: #8993a7;
          transform: none;
          filter: none;
        }

        .empty-state {
          display: flex;
          align-items: center;
          flex-direction: column;
          padding: 40px 20px;
          border: 1px dashed #344157;
          border-radius: 17px;
          background: #0c121e;
          text-align: center;
        }

        .empty-state h3 {
          margin: 12px 0 8px;
          font-size: 19px;
        }

        .empty-state p {
          max-width: 470px;
          margin: 0 0 18px;
          color: #8c9ab2;
          font-size: 13px;
          line-height: 1.7;
        }

        .empty-icon {
          font-size: 38px;
        }

        .loading-symbol {
          color: #00e5ff;
          font-size: 38px;
        }

        .registration-count {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 17px;
          color: #8d9bb2;
          font-size: 12px;
        }

        .count-number {
          display: grid;
          place-items: center;
          width: 30px;
          height: 30px;
          border: 1px solid #285467;
          border-radius: 9px;
          background: #0a202a;
          color: #00e5ff;
          font-weight: 900;
        }

        .registration-info {
          display: grid;
          gap: 0;
          margin-top: 12px;
        }

        .registration-info p,
        .account-detail {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          margin: 0;
          padding: 10px 0;
          border-bottom: 1px solid #253047;
          font-size: 12px;
        }

        .registration-info p span,
        .account-detail span {
          flex-shrink: 0;
          color: #8b9ab2;
        }

        .registration-info p strong,
        .account-detail strong {
          text-align: right;
          overflow-wrap: anywhere;
        }

        .registration-layout {
          display: grid;
          grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
          gap: 17px;
          align-items: start;
        }

        .registration-summary,
        .registration-form-panel,
        .account-promo,
        .account-panel {
          min-width: 0;
          padding: 24px;
          border: 1px solid #29374d;
          border-radius: 17px;
          background: linear-gradient(145deg, #121c2c, #0b101a);
        }

        .summary-icon {
          display: block;
          margin-bottom: 20px;
          font-size: 39px;
        }

        .registration-summary h3 {
          margin: 12px 0 8px;
          font-size: 24px;
          overflow-wrap: anywhere;
        }

        .summary-price {
          padding: 14px 0;
          border-top: 1px solid #29354a;
        }

        .summary-price strong {
          color: #00e5ff;
          font-size: 18px;
        }

        .summary-note {
          margin: 12px 0 0;
          color: #8795ac;
          font-size: 11px;
          line-height: 1.7;
        }

        .registration-form-panel .form,
        .account-panel .form {
          max-width: none;
        }

        .form label {
          display: grid;
          gap: 8px;
          color: #c5cfe0;
          font-size: 12px;
          font-weight: 700;
        }

        .form input {
          width: 100%;
          min-width: 0;
          padding: 13px 14px;
          border: 1px solid #303c53;
          border-radius: 9px;
          background: #080e19;
          color: white;
          font: inherit;
          font-weight: 400;
        }

        .form input:focus {
          outline: none;
          border-color: #00cfe8;
          box-shadow: 0 0 0 3px #00e5ff15;
        }

        .form button {
          width: 100%;
        }

        .form button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .msg {
          margin-top: 12px;
          padding: 12px;
          border: 1px solid #28533d;
          border-radius: 10px;
          background: #10291e;
          color: #87e9ab;
          font-size: 12px;
          line-height: 1.7;
          overflow-wrap: anywhere;
        }

        .err {
          border-color: #62303a;
          background: #2d151d;
          color: #ffadb6;
        }

        .inline-link {
          color: #00e5ff;
          font-weight: 800;
        }

        .account-layout {
          display: grid;
          grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
          gap: 17px;
          align-items: stretch;
        }

        .account-promo {
          background:
            radial-gradient(circle at 15% 0%, #16344b, transparent 45%),
            linear-gradient(145deg, #111c2d, #0a101b);
        }

        .account-symbol {
          display: block;
          margin-bottom: 24px;
          color: #00e5ff;
          font-size: 52px;
        }

        .account-promo h3,
        .account-panel h3 {
          margin: 12px 0;
          font-size: 23px;
        }

        .account-promo p,
        .account-panel > p {
          color: #91a0b8;
          font-size: 13px;
          line-height: 1.7;
        }

        .account-perk {
          margin-top: 14px;
          color: #bdcadd;
          font-size: 12px;
        }

        .auth-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px;
          margin-bottom: 22px;
          padding: 5px;
          border: 1px solid #29364b;
          border-radius: 11px;
          background: #090f1a;
        }

        .auth-tab {
          padding: 11px 8px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: #8e9cb3;
          font-size: 12px;
          font-weight: 800;
        }

        .auth-tab.active {
          background: #122b3b;
          color: #00e5ff;
        }

        .account-avatar {
          display: grid;
          place-items: center;
          width: 55px;
          height: 55px;
          border: 1px solid #285467;
          border-radius: 15px;
          background: #102435;
          font-size: 25px;
        }

        .account-detail {
          margin: 6px 0 15px;
        }

        .site-footer {
          margin-top: 25px;
          border-top: 1px solid #202b3e;
          background: #080c14;
        }

        .footer-inner {
          display: flex;
          align-items: center;
          flex-direction: column;
          gap: 15px;
          padding-top: 32px;
          padding-bottom: 30px;
          text-align: center;
        }

        .footer-inner p {
          margin: 0;
          color: #8997ae;
          font-size: 12px;
        }

        .footer-links {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 20px;
          color: #9ba8bd;
          font-size: 12px;
        }

        .footer-links a:hover {
          color: #00e5ff;
        }

        .footer-inner > small {
          color: #65738b;
          font-size: 10px;
        }

        @media (max-width: 1000px) {
          .nav {
            align-items: flex-start;
            flex-direction: column;
            justify-content: center;
            gap: 13px;
            padding-top: 15px;
            padding-bottom: 13px;
          }

          .links {
            width: 100%;
            justify-content: flex-start;
            flex-wrap: nowrap;
            gap: 17px;
            overflow-x: auto;
            padding-bottom: 5px;
            white-space: nowrap;
            scrollbar-width: thin;
          }

          .hero {
            grid-template-columns: minmax(0, 1fr) minmax(250px, 0.8fr);
            padding-top: 48px;
          }

          .hero h1 {
            font-size: clamp(43px, 5.5vw, 60px);
          }

          .game-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .tournament-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 650px) {
          .nav {
            min-height: auto;
          }

          .hero {
            grid-template-columns: 1fr;
            gap: 28px;
            padding: 37px 0 25px;
          }

          .hero h1 {
            font-size: clamp(43px, 12vw, 58px);
            letter-spacing: -1.8px;
          }

          .hero-copy > p {
            font-size: 14px;
          }

          .hero-trust {
            gap: 10px 14px;
            font-size: 10px;
          }

          .hero-art {
            min-height: 285px;
          }

          .hero-emblem {
            transform: scale(0.86);
          }

          .tag-top {
            top: 8%;
            right: 3%;
          }

          .tag-bottom {
            bottom: 8%;
            left: 3%;
          }

          .stats-section {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 9px;
          }

          .stat {
            gap: 9px;
            padding: 12px;
          }

          .stat-icon {
            width: 35px;
            height: 35px;
            border-radius: 9px;
            font-size: 17px;
          }

          .stat strong {
            font-size: 17px;
          }

          .stat span:last-child {
            font-size: 10px;
          }

          .section {
            padding: 27px 0 32px;
          }

          .section-heading {
            align-items: flex-start;
            flex-direction: column;
            gap: 9px;
            margin-bottom: 18px;
          }

          .section-heading h2 {
            font-size: 27px;
          }

          .heading-mark {
            font-size: 9px;
          }

          .game-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .game-card {
            min-height: 155px;
            padding: 14px 8px;
          }

          .game-image {
            width: 66px;
            height: 66px;
            border-radius: 14px;
          }

          .game-name {
            font-size: 12px;
          }

          .game-description {
            font-size: 10px;
          }

          .tournament-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .tournament-card {
            padding: 17px;
          }

          .registration-layout,
          .account-layout {
            grid-template-columns: 1fr;
          }

          .registration-summary,
          .registration-form-panel,
          .account-promo,
          .account-panel {
            padding: 18px;
          }

          .hero-actions {
            align-items: stretch;
            flex-direction: column;
          }

          .hero-actions .btn {
            width: 100%;
          }

          .empty-state {
            padding: 30px 16px;
          }

          .footer-links {
            gap: 14px;
          }
        }
      `}</style>
    </>
  );
}
