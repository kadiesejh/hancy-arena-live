
"use client";

import { useEffect, useState } from "react";

type Tournament = {
  id: string;
  name: string;
  date: string;
  prize: string;
  status: "Upcoming" | "Live" | "Completed";
};

const STORAGE_KEY = "hancy-arena-tournaments";

export default function AdminPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [prize, setPrize] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");

  // Load saved tournaments when the page opens
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setTournaments(parsed as Tournament[]);
        }
      }
    } catch {
      console.error("Could not load saved tournaments.");
    } finally {
      setLoaded(true);
    }
  }, []);

  // Save tournaments whenever the list changes
  useEffect(() => {
    if (!loaded) return;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(tournaments)
      );
    } catch {
      setMessage("Save nahi hua. Browser storage check karo.");
    }
  }, [tournaments, loaded]);

  function createTournament(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const cleanName = name.trim();
    const cleanPrize = prize.trim();

    if (!cleanName || !date || !cleanPrize) {
      setMessage("Bhai, saari details bharo.");
      return;
    }

    const newTournament: Tournament = {
      id: crypto.randomUUID(),
      name: cleanName,
      date: date,
      prize: cleanPrize,
      status: "Upcoming",
    };

    setTournaments((previous) => [
      newTournament,
      ...previous,
    ]);

    setName("");
    setDate("");
    setPrize("");
    setMessage("Tournament date aur time ke saath save ho gaya!");
  }

  function deleteTournament(id: string) {
    setTournaments((previous) =>
      previous.filter((tournament) => tournament.id !== id)
    );
    setMessage("Tournament delete ho gaya.");
  }

  function formatDate(value: string) {
    // datetime-local value ko local time ke roop mein display karo
    const [datePart, timePart] = value.split("T");
    if (!datePart || !timePart) return value;

    const [year, month, day] = datePart.split("-");
    const [hours, minutes] = timePart.split(":");
    const hour = Number(hours);
    const displayHour = hour % 12 || 12;
    const ampm = hour >= 12 ? "PM" : "AM";

    return `${day}/${month}/${year}, ${displayHour}:${minutes} ${ampm}`;
  }

  if (!loaded) {
    return (
      <main className="page">
        <p>Loading tournaments...</p>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="header">
        <div>
          <p className="eyebrow">MLBB TOURNAMENT MANAGEMENT</p>
          <h1>Hancy Arena</h1>
          <p className="subtitle">Admin Dashboard</p>
        </div>
        <span className="count">
          {tournaments.length} Tournaments
        </span>
      </header>

      <section className="panel">
        <h2>Create Tournament</h2>

        <form onSubmit={createTournament} className="form">
          <label>
            Tournament Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Hancy Arena Cup"
              required
            />
          </label>

          <label>
            Tournament Date &amp; Time
            <input
              type="datetime-local"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </label>

          <label>
            Prize Pool
            <input
              type="text"
              value={prize}
              onChange={(event) => setPrize(event.target.value)}
              placeholder="e.g. NPR 5,000"
              required
            />
          </label>

          <button type="submit">Create Tournament</button>
        </form>

        {message && (
          <p className="message" role="status">
            {message}
          </p>
        )}
      </section>

      <section className="panel">
        <h2>All Tournaments</h2>

        {tournaments.length === 0 ? (
          <p className="empty">Abhi koi tournament nahi hai.</p>
        ) : (
          <div className="tournament-list">
            {tournaments.map((tournament) => (
              <article className="tournament" key={tournament.id}>
                <div>
                  <h3>{tournament.name}</h3>
                  <p>
                    <strong>Date:</strong>{" "}
                    {formatDate(tournament.date)}
                  </p>
                  <p>
                    <strong>Prize:</strong> {tournament.prize}
                  </p>
                  <span className="status">
                    {tournament.status}
                  </span>
                </div>

                <button
                  type="button"
                  className="delete"
                  onClick={() => deleteTournament(tournament.id)}
                >
                  Delete
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 32px 16px;
          background: #0b1020;
          color: #f8fafc;
          font-family: Arial, sans-serif;
        }

        .header,
        .panel {
          width: 100%;
          max-width: 850px;
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
          font-size: clamp(28px, 5vw, 40px);
        }

        .subtitle,
        .empty {
          color: #94a3b8;
        }

        .count,
        .status {
          display: inline-block;
          padding: 7px 11px;
          border-radius: 999px;
          background: #172554;
          color: #93c5fd;
          font-size: 13px;
        }

        .panel {
          box-sizing: border-box;
          padding: 24px;
          border: 1px solid #293449;
          border-radius: 16px;
          background: #111827;
        }

        h2 {
          margin-top: 0;
          margin-bottom: 20px;
        }

        .form {
          display: grid;
          gap: 16px;
        }

        label {
          display: grid;
          gap: 8px;
          color: #cbd5e1;
          font-size: 14px;
        }

        input {
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
          padding: 13px;
          border: 1px solid #374151;
          border-radius: 9px;
          background: #0b1020;
          color: white;
          font: inherit;
          color-scheme: dark;
        }

        button {
          padding: 13px 18px;
          border: 0;
          border-radius: 9px;
          background: #38bdf8;
          color: #082f49;
          font-weight: bold;
          cursor: pointer;
        }

        .message {
          margin-bottom: 0;
          color: #7dd3fc;
        }

        .tournament-list {
          display: grid;
          gap: 12px;
        }

        .tournament {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 16px;
          border: 1px solid #293449;
          border-radius: 12px;
        }

        .tournament h3 {
          margin-top: 0;
        }

        .tournament p {
          overflow-wrap: anywhere;
          color: #cbd5e1;
        }

        .delete {
          flex-shrink: 0;
          background: #7f1d1d;
          color: #fecaca;
        }

        @media (max-width: 520px) {
          .panel {
            padding: 16px;
          }

          .tournament {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}
