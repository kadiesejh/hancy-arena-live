
"use client";

import { useEffect, useState, type FormEvent } from "react";

type TeamFormat = "Solo" | "Duo" | "Squad";

type Tournament = {
  id: string;
  name: string;
  date: string;
  time: string;
  game: string;
  mode: string;
  teamFormat: TeamFormat;
  maxTeams: number;
  entryFee: number;
  prizePool: number;
  details: string;
};

type Registration = {
  id: string;
  tournamentId: string;
  teamName: string;
  captain: string;
  gameId: string;
};

const TOURNAMENTS_KEY = "hancy-arena-tournaments";
const REGISTRATIONS_KEY = "hancy-arena-registrations";

export default function AdminPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loaded, setLoaded] = useState(false);

  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [game, setGame] = useState("Mobile Legends: Bang Bang");
  const [mode, setMode] = useState("Classic");
  const [teamFormat, setTeamFormat] = useState<TeamFormat>("Squad");
  const [maxTeams, setMaxTeams] = useState("16");
  const [entryFee, setEntryFee] = useState("100");
  const [prizePool, setPrizePool] = useState("1000");
  const [details, setDetails] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const savedTournaments = localStorage.getItem(TOURNAMENTS_KEY);
      const savedRegistrations = localStorage.getItem(REGISTRATIONS_KEY);

      if (savedTournaments) {
        const parsed: unknown = JSON.parse(savedTournaments);
        if (Array.isArray(parsed)) {
          setTournaments(parsed as Tournament[]);
        }
      }

      if (savedRegistrations) {
        const parsed: unknown = JSON.parse(savedRegistrations);
        if (Array.isArray(parsed)) {
          setRegistrations(parsed as Registration[]);
        }
      }
    } catch {
      setError("Saved data load nahi hua.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(
        TOURNAMENTS_KEY,
        JSON.stringify(tournaments)
      );
    } catch {
      setError("Tournament save nahi hua. Browser storage check karo.");
    }
  }, [tournaments, loaded]);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(
        REGISTRATIONS_KEY,
        JSON.stringify(registrations)
      );
    } catch {
      setError("Registration save nahi hua. Browser storage check karo.");
    }
  }, [registrations, loaded]);

  function createTournament(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!name.trim() || !date || !time) {
      setError("Tournament name, date aur time zaroor bharo.");
      return;
    }

    const parsedDate = new Date(`${date}T${time}`);

    if (Number.isNaN(parsedDate.getTime())) {
      setError("Valid date aur time select karo.");
      return;
    }

    const max = Number(maxTeams);
    const fee = Number(entryFee);
    const prize = Number(prizePool);

    if (!Number.isInteger(max) || max < 1) {
      setError("Maximum teams kam se kam 1 honi chahiye.");
      return;
    }

    if (
      !Number.isFinite(fee) ||
      fee < 0 ||
      !Number.isFinite(prize) ||
      prize < 0
    ) {
      setError("Entry fee aur prize pool valid rakho.");
      return;
    }

    const tournament: Tournament = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      date,
      time,
      game,
      mode,
      teamFormat,
      maxTeams: max,
      entryFee: fee,
      prizePool: prize,
      details: details.trim(),
    };

    setTournaments((previous) => [tournament, ...previous]);

    setName("");
    setDate("");
    setTime("");
    setDetails("");
    setMessage("Tournament successfully create ho gaya!");
  }

  function joinTournament(
    event: FormEvent<HTMLFormElement>,
    tournament: Tournament
  ) {
    event.preventDefault();
    setMessage("");
    setError("");

    const form = new FormData(event.currentTarget);
    const teamName = String(form.get("teamName") || "").trim();
    const captain = String(form.get("captain") || "").trim();
    const gameId = String(form.get("gameId") || "").trim();

    if (!teamName || !captain || !gameId) {
      setError("Team name, captain aur game ID bharo.");
      return;
    }

    const currentCount = registrations.filter(
      (registration) => registration.tournamentId === tournament.id
    ).length;

    if (currentCount >= tournament.maxTeams) {
      setError("Is tournament ki saari slots fill ho chuki hain.");
      return;
    }

    const alreadyJoined = registrations.some(
      (registration) =>
        registration.tournamentId === tournament.id &&
        registration.gameId.toLowerCase() === gameId.toLowerCase()
    );

    if (alreadyJoined) {
      setError("Ye game ID pehle hi register ho chuki hai.");
      return;
    }

    const registration: Registration = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tournamentId: tournament.id,
      teamName,
      captain,
      gameId,
    };

    setRegistrations((previous) => [...previous, registration]);
    setMessage(`Join request save ho gayi: ${tournament.name}`);
    event.currentTarget.reset();
  }

  function deleteTournament(id: string) {
    if (!window.confirm("Kya tum ye tournament delete karna chahte ho?")) {
      return;
    }

    setTournaments((previous) =>
      previous.filter((tournament) => tournament.id !== id)
    );

    setRegistrations((previous) =>
      previous.filter((registration) => registration.tournamentId !== id)
    );

    setMessage("Tournament delete ho gaya.");
    setError("");
  }

  if (!loaded) {
    return (
      <main className="page">
        <p>Hancy Arena load ho raha hai...</p>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="header">
        <div>
          <p className="eyebrow">MLBB ESPORTS PLATFORM</p>
          <h1>Hancy Arena</h1>
          <p className="muted">Tournament Admin Dashboard</p>
        </div>

        <div className="stats">
          <div className="stat">
            <strong>{tournaments.length}</strong>
            <span>Tournaments</span>
          </div>
          <div className="stat">
            <strong>{registrations.length}</strong>
            <span>Registrations</span>
          </div>
        </div>
      </header>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <section className="panel">
        <h2>🏆 Create Tournament</h2>

        <form className="form" onSubmit={createTournament}>
          <label>
            Tournament Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Hancy Arena Cup"
              required
            />
          </label>

          <div className="two">
            <label>
              Tournament Date
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </label>

            <label>
              Tournament Time
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                step={60}
                required
              />
            </label>
          </div>

          <label>
            Game
            <select value={game} onChange={(event) => setGame(event.target.value)}>
              <option>Mobile Legends: Bang Bang</option>
            </select>
          </label>

          <div className="two">
            <label>
              Game Mode
              <select value={mode} onChange={(event) => setMode(event.target.value)}>
                <option>Classic</option>
                <option>Ranked</option>
                <option>Custom Lobby</option>
                <option>Draft Pick</option>
              </select>
            </label>

            <label>
              Team Format
              <select
                value={teamFormat}
                onChange={(event) =>
                  setTeamFormat(event.target.value as TeamFormat)
                }
              >
                <option value="Solo">Solo - 1 Player</option>
                <option value="Duo">Duo - 2 Players</option>
                <option value="Squad">Squad - 5 Players</option>
              </select>
            </label>
          </div>

          <div className="three">
            <label>
              Maximum Teams
              <input
                type="number"
                min="1"
                max="256"
                value={maxTeams}
                onChange={(event) => setMaxTeams(event.target.value)}
                required
              />
            </label>

            <label>
              Entry Fee (NPR)
              <input
                type="number"
                min="0"
                step="1"
                value={entryFee}
                onChange={(event) => setEntryFee(event.target.value)}
                required
              />
            </label>

            <label>
              Prize Pool (NPR)
              <input
                type="number"
                min="0"
                step="1"
                value={prizePool}
                onChange={(event) => setPrizePool(event.target.value)}
                required
              />
            </label>
          </div>

          <label>
            Tournament Details / Rules
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Rules, room ID details, match format..."
              rows={3}
            />
          </label>

          <button type="submit">+ Create Tournament</button>
        </form>
      </section>

      <section className="panel">
        <h2>🎮 Available Tournaments</h2>

        {tournaments.length === 0 ? (
          <p className="muted">Abhi koi tournament nahi hai. Pehle ek create karo.</p>
        ) : (
          <div className="tournamentList">
            {tournaments.map((tournament) => {
              const joined = registrations.filter(
                (registration) =>
                  registration.tournamentId === tournament.id
              );

              const full = joined.length >= tournament.maxTeams;

              return (
                <article className="tournament" key={tournament.id}>
                  <div className="tournamentHeader">
                    <div>
                      <span className="tag">{tournament.teamFormat}</span>
                      <h3>{tournament.name}</h3>
                    </div>
                    <button
                      type="button"
                      className="delete"
                      onClick={() => deleteTournament(tournament.id)}
                    >
                      Delete
                    </button>
                  </div>

                  <div className="infoGrid">
                    <p>
                      <span>Date</span>
                      <strong>{tournament.date}</strong>
                    </p>
                    <p>
                      <span>Time</span>
                      <strong>{tournament.time}</strong>
                    </p>
                    <p>
                      <span>Game Mode</span>
                      <strong>{tournament.mode}</strong>
                    </p>
                    <p>
                      <span>Entry Fee</span>
                      <strong>NPR {tournament.entryFee}</strong>
                    </p>
                    <p>
                      <span>Prize Pool</span>
                      <strong>NPR {tournament.prizePool}</strong>
                    </p>
                    <p>
                      <span>Team Slots</span>
                      <strong>{joined.length} / {tournament.maxTeams}</strong>
                    </p>
                  </div>

                  {tournament.details && (
                    <p className="details">{tournament.details}</p>
                  )}

                  <div className="slotTrack">
                    <div
                      className="slotFill"
                      style={{
                        width: `${Math.min(
                          100,
                          (joined.length / tournament.maxTeams) * 100
                        )}%`,
                      }}
                    />
                  </div>

                  <h4>📝 Join This Tournament</h4>

                  {full ? (
                    <p className="error">Tournament full ho gaya hai.</p>
                  ) : (
                    <form
                      className="form"
                      onSubmit={(event) => joinTournament(event, tournament)}
                    >
                      <label>
                        Team Name
                        <input
                          name="teamName"
                          placeholder="Enter team name"
                          required
                        />
                      </label>

                      <label>
                        Captain / Player Name
                        <input
                          name="captain"
                          placeholder="Enter captain name"
                          required
                        />
                      </label>

                      <label>
                        MLBB Game ID
                        <input
                          name="gameId"
                          placeholder="Enter game ID"
                          required
                        />
                      </label>

                      <button type="submit">Join Tournament</button>
                    </form>
                  )}

                  {joined.length > 0 && (
                    <details className="registrations">
                      <summary>View Registrations ({joined.length})</summary>
                      {joined.map((registration) => (
                        <div className="registration" key={registration.id}>
                          <strong>{registration.teamName}</strong>
                          <span>Captain: {registration.captain}</span>
                          <span>MLBB ID: {registration.gameId}</span>
                        </div>
                      ))}
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <footer>
        Hancy Arena • Tournament Management
      </footer>

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 28px 16px;
          background: #080d19;
          color: #f8fafc;
          font-family: Arial, sans-serif;
          box-sizing: border-box;
        }

        .header, .panel {
          max-width: 950px;
          width: 100%;
          margin: 0 auto 24px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .eyebrow {
          color: #38bdf8;
          font-size: 12px;
          letter-spacing: 2px;
        }

        h1 {
          margin: 8px 0;
          font-size: clamp(30px, 5vw, 42px);
        }

        h2 {
          margin: 0 0 20px;
        }

        h3 {
          margin: 12px 0;
          overflow-wrap: anywhere;
        }

        h4 {
          margin-bottom: 12px;
        }

        .muted, footer {
          color: #94a3b8;
        }

        .stats {
          display: flex;
          gap: 10px;
        }

        .stat {
          display: grid;
          gap: 5px;
          padding: 14px;
          background: #111b2d;
          border: 1px solid #26354d;
          border-radius: 12px;
        }

        .stat strong {
          color: #7dd3fc;
          font-size: 22px;
        }

        .stat span {
          color: #94a3b8;
          font-size: 12px;
        }

        .panel {
          box-sizing: border-box;
          padding: 24px;
          border: 1px solid #26354d;
          border-radius: 16px;
          background: #101827;
        }

        .form {
          display: grid;
          gap: 14px;
        }

        .two, .three {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .three {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        label {
          display: grid;
          gap: 8px;
          color: #cbd5e1;
          font-size: 14px;
        }

        input, select, textarea {
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
          padding: 12px;
          border: 1px solid #334155;
          border-radius: 9px;
          background: #080d19;
          color: white;
          font: inherit;
          color-scheme: dark;
        }

        textarea {
          resize: vertical;
        }

        button {
          padding: 13px 16px;
          border: 0;
          border-radius: 9px;
          background: #38bdf8;
          color: #082f49;
          font-weight: 700;
          cursor: pointer;
        }

        button:hover {
          filter: brightness(1.08);
        }

        .success {
          max-width: 950px;
          margin: 0 auto 16px;
          color: #86efac;
        }

        .error {
          color: #fca5a5;
        }

        .tournamentList {
          display: grid;
          gap: 18px;
        }

        .tournament {
          padding: 18px;
          border: 1px solid #29394f;
          border-radius: 14px;
          background: #0b1220;
        }

        .tournamentHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .tag {
          padding: 6px 9px;
          border-radius: 20px;
          background: #172554;
          color: #93c5fd;
          font-size: 12px;
        }

        .delete {
          background: #7f1d1d;
          color: #fecaca;
          flex-shrink: 0;
        }

        .infoGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin: 18px 0;
        }

        .infoGrid p {
          display: grid;
          gap: 7px;
          margin: 0;
          overflow-wrap: anywhere;
        }

        .infoGrid span, .registration span {
          color: #94a3b8;
          font-size: 12px;
        }

        .details {
          color: #cbd5e1;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .slotTrack {
          height: 7px;
          overflow: hidden;
          border-radius: 10px;
          background: #263449;
        }

        .slotFill {
          height: 100%;
          background: #38bdf8;
          transition: width 0.2s ease;
        }

        .registrations {
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid #29394f;
        }

        .registrations summary {
          cursor: pointer;
          color: #7dd3fc;
        }

        .registration {
          display: grid;
          gap: 5px;
          margin-top: 12px;
          padding: 12px;
          border-radius: 9px;
          background: #111b2d;
          overflow-wrap: anywhere;
        }

        footer {
          max-width: 950px;
          margin: 28px auto 0;
          text-align: center;
          font-size: 12px;
        }

        @media (max-width: 620px) {
          .panel {
            padding: 16px;
          }

          .two, .three, .infoGrid {
            grid-template-columns: 1fr;
          }

          .tournamentHeader {
            align-items: flex-start;
          }

          .stats {
            width: 100%;
          }

          .stat {
            flex: 1;
          }
        }
      `}</style>
    </main>
  );
}
