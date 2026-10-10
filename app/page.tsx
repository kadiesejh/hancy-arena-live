'use client';

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from 'react';
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
  const [leaderboardMessage] = useState(
    'Leaderboard results ko actual game_results database columns verify karne ke baad connect kiya jayega.'
  );

  const getGameName = useCallback((t: Tournament) => {
    if (typeof t.game_name === 'string' && t.game_name.trim()) {
      return t.game_name;
    }

    const name = (t.name || '').toLowerCase();

    if (name.includes('pubg')) return 'PUBG Mobile';
    if (name.includes('free fire') || name.includes('freefire')) {
      return 'Free Fire';
    }
    if (name.includes('ludo')) return 'Ludo King';

    return 'Mobile Legends';
  }, []);

  const getFee = (t: Tournament) =>
    Number(t.entry_fee_npr ?? t.entry_fee ?? 0);

  const getPrize = (t: Tournament) =>
    Number(t.prize_pool_npr ?? t.prize_pool ?? 0);

  const formatMoney = (amount: number) =>
    `NPR ${amount.toLocaleString('en-IN')}`;

  const refreshRegistrations = () =>
    setRegistrationRefresh((value) => value + 1);

  // Initialize Supabase session and listen for authentication changes.
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
        const [sessionResult, tournamentResult] = await Promise.all([
          sb.auth.getSession(),
          sb.from('tournaments').select('*').order('start_at', {
            ascending: true,
          }),
        ]);

        if (!mounted) return;

        if (sessionResult.error) {
          setMsg(`Session error: ${sessionResult.error.message}`);
        }

        setUser(sessionResult.data.session?.user ?? null);

        if (tournamentResult.error) {
          setMsg(
            `Tournament loading error: ${tournamentResult.error.message}`
          );
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
        const savedName = String(
          session.user.user_metadata?.player_name || ''
        );

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

  // Load the signed-in player's profile.
  useEffect(() => {
    if (!authReady || !user?.id) {
      setProfile(null);
      return;
    }

    const sb = supabaseBrowser();
    if (!sb) return;

    let mounted = true;

    async function loadProfile() {
      const { data, error } = await sb!
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

  // Load only this user's registrations.
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
        const { data, error } = await sb
          .from('registrations')
          .select(
            'id, user_id, tournament_id, team_name, captain_name, phone'
          )
          .eq('user_id', user.id);

        if (!mounted) return;

        if (error) {
          setMyRegistrations([]);
          setMyRegistrationsError(error.message);
          return;
        }

        const rows = (data || []) as Registration[];
        const tournamentIds = [
          ...new Set(rows.map((row) => row.tournament_id)),
        ];

        let tournamentMap = new Map<string, Tournament>();

        if (tournamentIds.length) {
          const {
            data: tournamentData,
            error: tournamentError,
          } = await sb
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

        const { data, error } = await sb.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { player_name: cleanName },
          },
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
        setCaptainName(
          String(data.user.user_metadata?.player_name || '')
        );
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
      document.getElementById('login')?.scrollIntoView({
        behavior: 'smooth',
      });
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

    const status = String(selectedTournament.status || 'open').toLowerCase();

    if (status !== 'open') {
      setRegistrationMsg('Yeh tournament abhi registration ke liye open nahi hai.');
      return;
    }

    setRegistrationBusy(true);

    try {
      const sb = supabaseBrowser();

      if (!sb) {
        setRegistrationMsg('Supabase connection missing hai.');
        return;
      }

      // Check for an existing registration before inserting.
      // The database unique index is the final duplicate protection.
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

      // Profile creation/update:
      // The existing code assumes players.id matches auth.users.id.
      // If this table has other required columns, the database schema
      // must be used to adjust this upsert.
      const profilePayload: Record<string, unknown> = {
        id: user.id,
        game_name: getGameName(selectedTournament),
        game_id: cleanGameId,
      };

      const metadataName = String(
        user.user_metadata?.player_name || ''
      ).trim();

      if (metadataName || cleanCaptain) {
        profilePayload.player_name = metadataName || cleanCaptain;
      }

      if (user.email) {
        profilePayload.email = user.email;
      }

      const { error: profileError } = await sb
        .from('players')
        .upsert(profilePayload, { onConflict: 'id' });

      if (profileError) {
        setRegistrationMsg(
          `Player profile save nahi hua: ${profileError.message}`
        );
        return;
      }

      // Insert registration.
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
          setRegistrationMsg(
            `Registration error: ${registrationError.message}`
          );
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
      <header>
        <div className="wrap nav">
          <a className="logo" href="#home">
            HANCY<span>ARENA</span>
          </a>

          <nav className="links">
            <a href="#home">Home</a>
            <a href="#games">Games</a>
            <a href="#tournaments">Tournaments</a>
            <a href="#my-registrations">My Registrations</a>
            <a href="#leaderboard">Leaderboard</a>
            <a href="#login">{user ? 'My Account' : 'Sign In'}</a>
          </nav>
        </div>
      </header>

      <main id="home">
        <div className="wrap">
          <section className="hero">
            <div>
              <span className="badge">
                ⚡ MULTI-GAME TOURNAMENT PLATFORM
              </span>

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
              <a className="btn alt" href="#tournaments">
                View Tournaments
              </a>
            </div>

            <div className="panel hero-panel">
              <div className="trophy">🏆</div>
              <h2>HANCY ARENA</h2>
              <p className="muted">
                Choose your game. Join the battle.
              </p>
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
                <strong>{tournaments.length}</strong>
                <span className="muted">Tournaments</span>
              </div>

              <div className="panel stat">
                <strong>
                  {new Set(tournaments.map(getGameName)).size}
                </strong>
                <span className="muted">Games</span>
              </div>

              <div className="panel stat">
                <strong>NPR</strong>
                <span className="muted">Prize pools</span>
              </div>

              <div className="panel stat">
                <strong>{user ? 'ONLINE' : 'JOIN US'}</strong>
                <span className="muted">Player status</span>
              </div>
            </div>
          </section>

          <section className="section" id="games">
            <h2>🎮 Choose Your Game</h2>
            <p className="muted">
              Game select karo aur uske tournaments dekho.
            </p>

            <div className="game-grid">
              <button
                type="button"
                className={`game-card all-card ${
                  selectedGame === 'All Games' ? 'selected' : ''
                }`}
                onClick={() => setSelectedGame('All Games')}
              >
                <span className="game-icon all-icon">🎮</span>
                <strong>All Games</strong>
                <small>All tournaments</small>
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
                >
                  <span className="game-icon">
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

                  <strong>{game.name}</strong>
                  <small>{game.description}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="section" id="tournaments">
            <h2>🔥 Featured Tournaments</h2>

            <p className="muted">
              {selectedGame === 'All Games'
                ? 'Database se available tournaments.'
                : `${selectedGame} ke tournaments`}
            </p>

            {loadingTournaments && (
              <div className="panel card">
                Tournaments load ho rahe hain...
              </div>
            )}

            {!loadingTournaments && (
              <div className="grid">
                {filteredTournaments.map((tournament) => {
                  const gameName = getGameName(tournament);
                  const game = games.find((item) => item.name === gameName);
                  const status = String(
                    tournament.status || 'open'
                  ).toLowerCase();
                  const isOpen = status === 'open';

                  return (
                    <div className="panel card" key={tournament.id}>
                      <span className="status">
                        {tournament.status || 'OPEN'}
                      </span>

                      <div className="event-game">
                        <span className="event-logo-box">
                          {game?.icon || '🎮'}
                        </span>
                        <small>{gameName}</small>
                      </div>

                      <h3>{tournament.name}</h3>
                      <p className="muted">
                        {tournament.format || 'Tournament'}
                      </p>

                      <b>Entry: {formatMoney(getFee(tournament))}</b>
                      <p className="muted">
                        Prize Pool: {formatMoney(getPrize(tournament))}
                      </p>

                      {tournament.start_at && (
                        <p className="muted">
                          Starts:{' '}
                          {new Date(tournament.start_at).toLocaleString()}
                        </p>
                      )}

                      <button
                        type="button"
                        className="btn"
                        disabled={!isOpen}
                        onClick={() => {
                          setSelectedTournament(tournament);
                          setRegistrationMsg('');
                          setRegistrationSuccess(false);

                          document
                            .getElementById('register-form')
                            ?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        {isOpen ? 'Register' : 'Registration Closed'}
                      </button>
                    </div>
                  );
                })}

                {filteredTournaments.length === 0 && (
                  <div className="panel card">
                    <h3>Abhi tournament available nahi hai.</h3>
                    <p className="muted">
                      Admin se tournament create karne ko kaho.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="section" id="my-registrations">
            <h2>📋 My Registrations</h2>
            <p className="muted">
              Apne registered tournaments yahan dekho.
            </p>

            {!user && (
              <div className="panel card">
                <p>Apni registrations dekhne ke liye Sign In karo.</p>
                <a className="btn" href="#login">Sign In</a>
              </div>
            )}

            {user && loadingMyRegistrations && (
              <div className="panel card">
                Registrations load ho rahi hain...
              </div>
            )}

            {user && myRegistrationsError && (
              <div className="panel card">
                <p className="msg err">
                  Registrations load nahi hui: {myRegistrationsError}
                </p>

                <button
                  type="button"
                  className="btn"
                  onClick={refreshRegistrations}
                >
                  Retry
                </button>
              </div>
            )}

            {user &&
              !loadingMyRegistrations &&
              !myRegistrationsError && (
                <>
                  <p className="muted">
                    Total registrations: {myRegistrations.length}
                  </p>

                  <div className="grid">
                    {myRegistrations.map((registration) => {
                      const tournament = registration.tournament;

                      return (
                        <div className="panel card" key={registration.id}>
                          <span className="status">REGISTERED</span>

                          <h3>
                            {tournament?.name ||
                              'Tournament details unavailable'}
                          </h3>

                          <p className="muted">
                            {tournament
                              ? getGameName(tournament)
                              : 'Game details unavailable'}
                          </p>

                          <p>
                            <b>Team:</b> {registration.team_name}
                          </p>

                          <p>
                            <b>Captain:</b>{' '}
                            {registration.captain_name || 'Not provided'}
                          </p>

                          {tournament && (
                            <>
                              <p>
                                <b>Entry Fee:</b>{' '}
                                {formatMoney(getFee(tournament))}
                              </p>

                              <p>
                                <b>Prize Pool:</b>{' '}
                                {formatMoney(getPrize(tournament))}
                              </p>

                              <p className="muted">
                                {tournament.start_at
                                  ? `Starts: ${new Date(
                                      tournament.start_at
                                    ).toLocaleString()}`
                                  : 'Tournament date not available'}
                              </p>

                              <p className="muted">
                                Status: {tournament.status || 'Not specified'}
                              </p>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {myRegistrations.length === 0 && (
                      <div className="panel card">
                        <h3>Abhi koi registration nahi hai.</h3>
                        <p className="muted">
                          Tournament section mein jaakar register karo.
                        </p>
                        <a className="btn" href="#tournaments">
                          Browse Tournaments
                        </a>
                      </div>
                    )}
                  </div>
                </>
              )}
          </section>

          {selectedTournament && (
            <section className="section" id="register-form">
              <h2>📝 Tournament Registration</h2>

              <div className="panel registration-panel">
                <h3>{selectedTournament.name}</h3>

                <p className="muted">
                  {getGameName(selectedTournament)} · Entry{' '}
                  {formatMoney(getFee(selectedTournament))}
                </p>

                {!user && (
                  <p className="muted">
                    Registration submit karne ke liye pehle Sign In karo.
                  </p>
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
                    minLength={2}
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

                  <button
                    className="btn"
                    disabled={registrationBusy || !user}
                  >
                    {registrationBusy
                      ? 'Registering...'
                      : 'Submit Registration'}
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
                      className={`msg ${
                        !registrationSuccess ? 'err' : ''
                      }`}
                      role="status"
                    >
                      {registrationMsg}
                    </div>
                  )}
                </form>
              </div>
            </section>
          )}

          <section className="section" id="leaderboard">
            <h2>🏆 Leaderboard</h2>

            <div className="panel card">
              <p className="muted">{leaderboardMessage}</p>
            </div>
          </section>

          <section className="section" id="login">
            <h2>
              🔐{' '}
              {user
                ? 'Your Account'
                : authMode === 'signup'
                  ? 'Create Account'
                  : 'Sign In'}
            </h2>

            <p className="muted">
              {user
                ? `Logged in as ${user.email || 'Player'}`
                : 'Account banao ya apne existing account mein login karo.'}
            </p>

            <div className="panel">
              {user ? (
                <div className="form">
                  <p>
                    <b>Player:</b>{' '}
                    {profile?.player_name ||
                      user.user_metadata?.player_name ||
                      'Player'}
                  </p>

                  <p>
                    <b>Email:</b> {user.email}
                  </p>

                  <p className="muted">
                    Profile: {profile ? 'Loaded' : 'Not available'}
                  </p>

                  <button
                    type="button"
                    className="btn alt"
                    onClick={logout}
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <form className="form" onSubmit={handleAuth}>
                  {authMode === 'signup' && (
                    <input
                      type="text"
                      placeholder="Player Name"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      minLength={2}
                      maxLength={40}
                      required
                    />
                  )}

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
                    {busy
                      ? 'Please wait...'
                      : authMode === 'signup'
                        ? 'Create Account'
                        : 'Sign In'}
                  </button>

                  <button
                    type="button"
                    className="btn alt"
                    onClick={() => {
                      setAuthMode(
                        authMode === 'signup' ? 'signin' : 'signup'
                      );
                      setMsg('');
                    }}
                  >
                    {authMode === 'signup'
                      ? 'Already have an account? Sign In'
                      : 'New player? Create Account'}
                  </button>
                </form>
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
          </section>
        </div>
      </main>

      <footer>
        © 2026 Hancy Arena • Multi-Game Tournament Platform
      </footer>

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
          transition:
            transform 0.25s ease,
            border-color 0.25s ease,
            box-shadow 0.25s ease;
        }

        .game-card:hover {
          transform: translateY(-4px);
          border-color: var(--game-color);
        }

        .game-card.selected {
          border: 2px solid var(--game-color);
          background: linear-gradient(145deg, #242748, #111426);
        }

        .game-icon {
          position: relative;
          width: 100px;
          height: 100px;
          flex-shrink: 0;
          border-radius: 20px;
          display: grid;
          place-items: center;
          overflow: hidden;
          background: #fff;
          border: 2px solid var(--game-color);
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
          --game-color: #fff;
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
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          overflow: hidden;
          background: #171b2d;
          border-radius: 10px;
          flex-shrink: 0;
          font-size: 25px;
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

        .registration-panel {
          padding: 24px;
        }

        .form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .form input {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          padding: 13px 14px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 10px;
          background: #101426;
          color: white;
          font: inherit;
        }

        .form input:focus {
          outline: 2px solid #7257ff;
        }

        .form button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .msg {
          margin-top: 12px;
          padding: 12px;
          border-radius: 10px;
          background: rgba(32, 201, 151, 0.12);
          overflow-wrap: anywhere;
        }

        .err {
          background: rgba(255, 87, 56, 0.14);
        }

        @media (max-width: 480px) {
          .game-grid {
            gap: 12px;
          }

          .game-card {
            min-height: 155px;
            padding: 16px 8px;
          }

          .game-icon {
            width: 88px;
            height: 88px;
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
