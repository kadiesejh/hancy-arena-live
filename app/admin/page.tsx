
"use client";

import { useState } from "react";

type Tournament = {
  id: number;
  name: string;
  mode: string;
  entryFee: string;
  prize: string;
  date: string;
  status: string;
};

export default function AdminPage() {
  const [active, setActive] = useState("Dashboard");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [name, setName] = useState("");
  const [mode, setMode] = useState("5v5");
  const [entryFee, setEntryFee] = useState("50");
  const [prize, setPrize] = useState("500");
  const [date, setDate] = useState("");
  const [notice, setNotice] = useState("");

  function createTournament(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!name.trim() || !date) {
      setNotice("Tournament name aur date bharo.");
      return;
    }

    setTournaments((old) => [
      ...old,
      {
        id: Date.now(),
        name: name.trim(),
        mode,
        entryFee,
        prize,
        date,
        status: "Upcoming",
      },
    ]);

    setName("");
    setDate("");
    setNotice("Tournament successfully add ho gaya!");
    setActive("Tournaments");
  }

  function updateStatus(id: number, status: string) {
    setTournaments((old) =>
      old.map((t) => (t.id === id ? { ...t, status } : t))
    );
  }

  function deleteTournament(id: number) {
    setTournaments((old) => old.filter((t) => t.id !== id));
    setNotice("Tournament delete ho gaya.");
  }

  const menu = [
    "Dashboard",
    "Tournaments",
    "Create Tournament",
    "Players",
  ];

  return (
    <main className="admin-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo">H</span>
          <div>
            <strong>HANCY ARENA</strong>
            <small>ADMIN CONTROL</small>
          </div>
        </div>

        <p className="label">MANAGEMENT</p>

        {menu.map((item) => (
          <button
            key={item}
            className={`nav-button ${active === item ? "selected" : ""}`}
            onClick={() => {
              setActive(item);
              setNotice("");
            }}
          >
            {item === "Dashboard"
              ? "◫"
              : item === "Tournaments"
              ? "🏆"
              : item === "Players"
              ? "♙"
              : "+"}
            <span>{item}</span>
          </button>
        ))}

        <a className="back-link" href="/">
          ← Back to website
        </a>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <small>HANCY ARENA / ADMIN</small>
            <h1>{active}</h1>
          </div>
          <span className="avatar">HA</span>
        </header>

        {notice && <div className="notice">{notice}</div>}

        {active === "Dashboard" && (
          <>
            <section className="welcome">
              <div>
                <span className="eyebrow">TOURNAMENT COMMAND CENTER</span>
                <h2>Welcome to Hancy Arena</h2>
                <p>Manage your Mobile Legends tournaments in one place.</p>
              </div>
              <button
                className="primary"
                onClick={() => setActive("Create Tournament")}
              >
                + Create Tournament
              </button>
            </section>

            <div className="stats">
              <article className="stat">
                <span>Total Tournaments</span>
                <strong>{tournaments.length}</strong>
              </article>
              <article className="stat">
                <span>Upcoming</span>
                <strong>
                  {tournaments.filter((t) => t.status === "Upcoming").length}
                </strong>
              </article>
              <article className="stat">
                <span>Live Tournaments</span>
                <strong>
                  {tournaments.filter((t) => t.status === "Live").length}
                </strong>
              </article>
              <article className="stat">
                <span>Player Registrations</span>
                <strong>0</strong>
              </article>
            </div>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Recent Tournaments</h3>
                  <p>Your tournament activity</p>
                </div>
                <button
                  className="secondary"
                  onClick={() => setActive("Tournaments")}
                >
                  View all →
                </button>
              </div>

              {tournaments.length === 0 ? (
                <div className="empty">
                  <span>🏆</span>
                  <h3>No tournaments yet</h3>
                  <p>Create your first tournament to see it here.</p>
                  <button
                    className="primary"
                    onClick={() => setActive("Create Tournament")}
                  >
                    Create first tournament
                  </button>
                </div>
              ) : (
                <TournamentTable
                  tournaments={tournaments}
                  updateStatus={updateStatus}
                  deleteTournament={deleteTournament}
                />
              )}
            </section>
          </>
        )}

        {active === "Create Tournament" && (
          <section className="panel form-panel">
            <h3>Create a Tournament</h3>
            <p>Enter the details for your next MLBB event.</p>

            <form className="form" onSubmit={createTournament}>
              <label>
                Tournament name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Hancy Arena Cup"
                  required
                />
              </label>

              <label>
                Game mode
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                >
                  <option>5v5</option>
                  <option>1v1</option>
                  <option>2v2</option>
                  <option>3v3</option>
                </select>
              </label>

              <div className="form-grid">
                <label>
                  Entry fee (NPR)
                  <input
                    type="number"
                    min="0"
                    value={entryFee}
                    onChange={(e) => setEntryFee(e.target.value)}
                    required
                  />
                </label>

                <label>
                  Prize pool (NPR)
                  <input
                    type="number"
                    min="0"
                    value={prize}
                    onChange={(e) => setPrize(e.target.value)}
                    required
                  />
                </label>
              </div>

              <label>
                Tournament date
                <input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </label>

              <button type="submit" className="primary">
                Create Tournament
              </button>
            </form>
          </section>
        )}

        {active === "Tournaments" && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h3>All Tournaments</h3>
                <p>Update status or delete a tournament.</p>
              </div>
              <button
                className="primary"
                onClick={() => setActive("Create Tournament")}
              >
                + Create
              </button>
            </div>

            {tournaments.length === 0 ? (
              <div className="empty">
                <span>🏆</span>
                <h3>No tournaments created</h3>
                <p>Click Create to add your first event.</p>
              </div>
            ) : (
              <TournamentTable
                tournaments={tournaments}
                updateStatus={updateStatus}
                deleteTournament={deleteTournament}
              />
            )}
          </section>
        )}

        {active === "Players" && (
          <section className="panel empty">
            <span>♙</span>
            <h3>Player Registrations</h3>
            <p>
              Players will appear here after we connect a database and create
              the registration system.
            </p>
            <span className="pending">DATABASE CONNECTION PENDING</span>
          </section>
        )}

        <footer className="footer">
          Hancy Arena · Mobile Legends Tournament Platform
        </footer>
      </section>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          background: #090d18;
          color: #eef2ff;
          font-family: Arial, Helvetica, sans-serif;
        }

        button,
        input,
        select {
          font: inherit;
        }

        .admin-shell {
          min-height: 100vh;
          display: flex;
          background: #090d18;
          color: #eef2ff;
        }

        .sidebar {
          width: 245px;
          padding: 25px 16px;
          background: #0d1322;
          border-right: 1px solid #202b40;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 0 8px 30px;
        }

        .logo {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: linear-gradient(135deg, #20d6c1, #6476ff);
          color: #07111b;
          font-size: 25px;
          font-weight: 900;
        }

        .brand strong,
        .brand small {
          display: block;
        }

        .brand strong {
          font-size: 13px;
          letter-spacing: 1px;
        }

        .brand small {
          margin-top: 5px;
          color: #8291ad;
          font-size: 9px;
          letter-spacing: 2px;
        }

        .label {
          color: #75839f;
          font-size: 10px;
          letter-spacing: 1.8px;
          padding: 0 10px;
        }

        .nav-button {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          text-align: left;
          border: 0;
          border-radius: 9px;
          padding: 13px 12px;
          margin-bottom: 5px;
          color: #aab6cd;
          background: transparent;
          cursor: pointer;
          font-size: 13px;
        }

        .nav-button.selected {
          background: #18333b;
          color: #53e5d0;
        }

        .back-link {
          margin-top: auto;
          padding: 25px 8px 0;
          color: #aebbd3;
          text-decoration: none;
          font-size: 12px;
        }

        .content {
          flex: 1;
          min-width: 0;
          padding: 0 30px;
        }

        .topbar {
          min-height: 91px;
          border-bottom: 1px solid #202b40;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .topbar small {
          color: #8592ad;
          font-size: 10px;
          letter-spacing: 1.5px;
        }

        .topbar h1 {
          font-size: 23px;
          margin: 7px 0 0;
        }

        .avatar {
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          background: #202e46;
          border: 1px solid #354663;
          border-radius: 50%;
          font-size: 12px;
          font-weight: bold;
        }

        .welcome {
          margin: 28px 0;
          padding: 27px;
          border-radius: 14px;
          border: 1px solid #28434e;
          background: linear-gradient(115deg, #132c38, #11182b 75%);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .eyebrow {
          color: #50e0cf;
          font-size: 10px;
          letter-spacing: 2px;
        }

        .welcome h2 {
          font-size: 25px;
          margin: 10px 0;
        }

        .welcome p,
        .panel-heading p,
        .form-panel > p {
          color: #8d9bb5;
          font-size: 13px;
          line-height: 1.6;
        }

        .primary,
        .secondary {
          border: 0;
          border-radius: 8px;
          padding: 12px 16px;
          font-weight: bold;
          cursor: pointer;
          font-size: 12px;
        }

        .primary {
          background: #43dfca;
          color: #07151b;
        }

        .secondary {
          background: #1b263a;
          color: #d9e3f8;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 15px;
          margin-bottom: 25px;
        }

        .stat {
          background: #101827;
          border: 1px solid #202b40;
          padding: 20px;
          border-radius: 12px;
        }

        .stat span {
          color: #9ba9c2;
          font-size: 12px;
        }

        .stat strong {
          display: block;
          font-size: 29px;
          margin-top: 14px;
        }

        .panel {
          background: #101827;
          border: 1px solid #202b40;
          border-radius: 13px;
          padding: 23px;
          margin-bottom: 25px;
        }

        .panel h3 {
          margin: 0 0 7px;
          font-size: 17px;
        }

        .panel-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 20px;
        }

        .empty {
          min-height: 200px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 10px;
          color: #93a2bd;
        }

        .empty > span:first-child {
          font-size: 30px;
        }

        .empty h3 {
          color: #e7edfa;
        }

        .empty p {
          max-width: 440px;
          font-size: 12px;
          line-height: 1.7;
        }

        .form-panel {
          max-width: 760px;
          margin: 28px auto;
        }

        .form {
          display: grid;
          gap: 18px;
          margin-top: 25px;
        }

        .form label {
          display: grid;
          gap: 8px;
          color: #bdc9de;
          font-size: 12px;
        }

        .form input,
        .form select {
          width: 100%;
          padding: 13px;
          border-radius: 7px;
          border: 1px solid #2b3850;
          background: #0a1120;
          color: #eef2ff;
          outline-color: #43dfca;
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .admin-table-wrap {
          overflow-x: auto;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 12px;
        }

        .admin-table th {
          color: #8190ab;
          font-weight: normal;
          font-size: 10px;
        }

        .admin-table th,
        .admin-table td {
          padding: 14px 10px;
          border-bottom: 1px solid #202b40;
          white-space: nowrap;
        }

        .admin-table td {
          color: #d6dfef;
        }

        .admin-table select {
          background: #111d2e;
          color: #eaf0ff;
          border: 1px solid #34435b;
          border-radius: 6px;
          padding: 7px;
        }

        .delete-button {
          border: 1px solid #713a4a;
          color: #ff9caf;
          background: #301c2a;
          padding: 7px 9px;
          border-radius: 6px;
          cursor: pointer;
        }

        .notice {
          margin-top: 20px;
          padding: 13px;
          background: #17352f;
          border: 1px solid #285b50;
          color: #7ff0d8;
          border-radius: 8px;
          font-size: 12px;
        }

        .pending {
          font-size: 10px;
          letter-spacing: 1px;
          padding: 8px 10px;
          border: 1px solid #5a4c2a;
          color: #f4ce80;
          border-radius: 6px;
        }

        .footer {
          padding: 18px 0 25px;
          color: #65738d;
          font-size: 10px;
          text-align: center;
        }

        @media (max-width: 950px) {
          .sidebar {
            width: 205px;
          }

          .content {
            padding: 0 18px;
          }

          .stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .welcome {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 620px) {
          .admin-shell {
            flex-direction: column;
          }

          .sidebar {
            width: 100%;
            padding: 14px;
            border-right: 0;
            border-bottom: 1px solid #202b40;
          }

          .brand {
            padding-bottom: 12px;
          }

          .label {
            display: none;
          }

          .nav-button {
            width: auto;
            display: inline-flex;
            padding: 10px;
            margin: 2px;
            font-size: 11px;
          }

          .back-link {
            display: block;
            padding-top: 12px;
          }

          .content {
            padding: 0 13px;
          }

          .topbar {
            min-height: 75px;
          }

          .welcome {
            padding: 20px;
          }

          .welcome h2 {
            font-size: 21px;
          }

          .stats {
            gap: 9px;
          }

          .stat {
            padding: 14px;
          }

          .stat strong {
            font-size: 24px;
          }

          .panel {
            padding: 15px;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}

function TournamentTable({
  tournaments,
  updateStatus,
  deleteTournament,
}: {
  tournaments: Tournament[];
  updateStatus: (id: number, status: string) => void;
  deleteTournament: (id: number) => void;
}) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>TOURNAMENT</th>
            <th>MODE</th>
            <th>ENTRY</th>
            <th>PRIZE</th>
            <th>DATE</th>
            <th>STATUS</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
          {tournaments.map((t) => (
            <tr key={t.id}>
              <td>{t.name}</td>
              <td>{t.mode}</td>
              <td>Rs. {t.entryFee}</td>
              <td>Rs. {t.prize}</td>
              <td>{new Date(t.date).toLocaleString()}</td>
              <td>
                <select
                  value={t.status}
                  onChange={(e) => updateStatus(t.id, e.target.value)}
                >
                  <option>Upcoming</option>
                  <option>Live</option>
                  <option>Completed</option>
                  <option>Cancelled</option>
                </select>
              </td>
              <td>
                <button
                  className="delete-button"
                  onClick={() => deleteTournament(t.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
