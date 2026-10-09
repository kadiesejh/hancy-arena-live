
"use client";

import { useEffect, useState, type FormEvent } from "react";

type Tournament = {
  id: string;
  name: string;
  date: string;
  prize: string;
  status: "Upcoming" | "Live" | "Completed";
};

const STORAGE_KEY = "hancy-arena-tournaments";

function formatDate(value: string): string {
  if (!value || !value.includes("T")) return "Date not set";

  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-");
  const [hourText, minute] = timePart.split(":");

  const hour = Number(hourText);
  const displayHour = hour % 12 || 12;
  const ampm = hour >= 12 ? "PM" : "AM";

  return `${day}/${month}/${year} at ${displayHour}:${minute} ${ampm}`;
}

export default function AdminPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [prize, setPrize] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Load saved tournaments from this browser
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
      setError("Saved tournaments load nahi ho sake.");
    } finally {
      setLoaded(true);
    }
  }, []);

  // Save tournament list in this browser
  useEffect(() => {
    if (!loaded) return;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(tournaments)
      );
    } catch {
      setError("Browser storage mein save nahi ho saka.");
    }
  }, [tournaments, loaded]);

  function createTournament(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const cleanName = name.trim();
    const cleanPrize = prize.trim();

    if (!cleanName || !date || !cleanPrize) {
      setError("Tournament name, date/time aur prize bharo.");
      return;
    }

    // Validate the datetime-local value without timezone conversion
    const datePattern =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

    if (!datePattern.test(date)) {
      setError("Date aur time dobara calendar se select karo.");
      return;
    }

    const [datePart, timePart] = date.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute] = timePart.split(":").map(Number);
    const checkDate = new Date(year, month - 1, day, hour, minute);

    if (
      checkDate.getFullYear() !== year ||
      checkDate.getMonth() !== month - 1 ||
      checkDate.getDate() !== day ||
      checkDate.getHours() !== hour ||
      checkDate.getMinutes() !== minute
    ) {
      setError("Valid date aur time select karo.");
      return;
    }

    const newTournament: Tournament = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: cleanName,
      date,
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
    setMessage("Tournament date aur time ke saath add ho gaya!");
  }

  function deleteTournament(id: string) {
    setTournaments((previous) =>
      previous.filter((tournament) => tournament.id !== id)
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
          <p className="eyebrow">MOBILE LEGENDS TOURNAMENTS</p>
          <h1>Hancy Arena</h1>
          <p className="muted">Admin Dashboard</p>
        </div>

        <div className="count">
          {tournaments.length} Tournaments
        </div>
      </header>

      <section className="panel">
        <h2>Create Tournament</h2>

        <form className="form" onSubmit={createTournament}>
          <label>
            Tournament Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Hancy Arena Cup"
              required
            />
          </label>

          <label>
            Tournament Date
            <input
              type="date"
              value={date.split("T")[0] || ""}
              onChange={(event) => {
                const selectedDate = event.target.value;
                const currentTime = date.split("T")[1] || "18:00";
                setDate(
                  selectedDate ? `${selectedDate}T${currentTime}` : ""
                );
              }}
              required
            />
          </label>

          <label>
            Tournament Time
            <input
              type="time"
              value={date.split("T")[1] || ""}
              onChange={(event) => {
                const selectedTime = event.target.value;
                const currentDate = date.split("T")[0] || "";

                setDate(
                  currentDate && selectedTime
                    ? `${currentDate}T${selectedTime}`
                    : currentDate
                      ? `${currentDate}T${selectedTime}`
                      : ""
                );
              }}
              step={60}
              required
            />
          </label>

          <label>
            Prize Pool
            <input
              type="text"
              value={prize}
              onChange={(event) => setPrize(event.target.value)}
              placeholder="NPR 5,000"
              required
            />
          </label>

          <button type="submit">Create Tournament</button>
        </form>

        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
      </section>

      <section className="panel">
        <h2>All Tournaments</h2>

        {tournaments.length === 0 ? (
          <p className="muted">Abhi koi tournament nahi hai.</p>
        ) : (
          <div className="list">
            {tournaments.map((tournament) => (
              <article className="tournament" key={tournament.id}>
                <div className="details">
                  <h3>{tournament.name}</h3>
                  <p>
                    <strong>Date &amp; Time:</strong>{" "}
                    {formatDate(tournament.date)}
                  </p>
                  <p>
                    <strong>Prize:</strong> {tournament.prize}
                  </p>
                  <span className="status">{tournament.status}</span>
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
          box-sizing: border-box;
          padding: 32px 16px;
          background: #0b1020;
          color: #f8fafc;
          font-family: Arial, sans-serif;
        }

        .header,
        .panel {
          max-width: 850px;
          width: 100%;
          margin: 0 auto 24px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
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

        h2 {
          margin-top: 0;
        }

        .muted {
          color: #94a3b8;
        }

        .count,
        .status {
          display: inline-block;
          padding: 8px 12px;
          border-radius: 999px;
          background: #172554;
          color: #bfdbfe;
          font-size: 13px;
        }

        .panel {
          box-sizing: border-box;
          padding: 24px;
          border: 1px solid #293449;
          border-radius: 16px;
          background: #111827;
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

        .success {
          color: #86efac;
        }

        .error {
          color: #fca5a5;
        }

        .list {
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

        .details {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .details h3 {
          margin-top: 0;
        }

        .details p {
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
