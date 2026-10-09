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

function createTournament(e: React.FormEvent) {
e.preventDefault();
if (!name.trim() || !date) {
setNotice("Tournament name aur date bharo.");
return;
}

```
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
setNotice("Tournament add ho gaya! Demo data abhi browser mein hai.");
```

}

function updateStatus(id: number, status: string) {
setTournaments((old) =>
old.map((t) => (t.id === id ? { ...t, status } : t))
);
}

function deleteTournament(id: number) {
setTournaments((old) => old.filter((t) => t.id !== id));
}

const menu = ["Dashboard", "Tournaments", "Create Tournament", "Players"];

return ( <main className="admin-shell"> <aside className="admin-sidebar"> <div className="admin-brand"> <span className="admin-logo">H</span> <div> <strong>HANCY ARENA</strong> <small>ADMIN CONTROL</small> </div> </div>

```
    <p className="admin-label">MANAGEMENT</p>
    {menu.map((item) => (
      <button
        key={item}
        className={`admin-nav ${active === item ? "selected" : ""}`}
        onClick={() => {
          setActive(item);
          setNotice("");
        }}
      >
        <span>{item === "Dashboard" ? "◫" : item === "Tournaments" ? "🏆" : item === "Players" ? "♙" : "+"}</span>
        {item}
      </button>
    ))}

    <div className="admin-sidebar-bottom">
      <span className="online-dot" /> Admin workspace
      <a href="/">← Back to website</a>
    </div>
  </aside>

  <section className="admin-main">
    <header className="admin-topbar">
      <div>
        <small>HANCY ARENA / ADMIN</small>
        <h1>{active}</h1>
      </div>
      <span className="admin-avatar">HA</span>
    </header>

    {notice && <div className="admin-notice">{notice}</div>}

    {active === "Dashboard" && (
      <>
        <div className="admin-welcome">
          <div>
            <span className="admin-kicker">TOURNAMENT COMMAND CENTER</span>
            <h2>Welcome to Hancy Arena</h2>
            <p>Manage your Mobile Legends tournaments from one place.</p>
          </div>
          <button className="admin-primary" onClick={() => setActive("Create Tournament")}>
            + Create Tournament
          </button>
        </div>

        <div className="admin-stats">
          <article className="admin-stat">
            <span>Total Tournaments</span>
            <strong>{tournaments.length}</strong>
            <small>Created in this session</small>
          </article>
          <article className="admin-stat">
            <span>Upcoming</span>
            <strong>{tournaments.filter((t) => t.status === "Upcoming").length}</strong>
            <small>Waiting to start</small>
          </article>
          <article className="admin-stat">
            <span>Live Tournaments</span>
            <strong>{tournaments.filter((t) => t.status === "Live").length}</strong>
            <small>Currently marked live</small>
          </article>
          <article className="admin-stat">
            <span>Player Registrations</span>
            <strong>0</strong>
            <small>Database connection pending</small>
          </article>
        </div>

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div><h3>Recent Tournaments</h3><p>Your latest tournament activity</p></div>
            <button className="admin-secondary" onClick={() => setActive("Tournaments")}>View all →</button>
          </div>
          {tournaments.length === 0 ? (
            <div className="admin-empty">
              <span>🏆</span>
              <strong>No tournaments yet</strong>
              <p>Create your first tournament to see it here.</p>
              <button className="admin-primary" onClick={() => setActive("Create Tournament")}>Create first tournament</button>
            </div>
          ) : (
            <TournamentTable tournaments={tournaments} updateStatus={updateStatus} deleteTournament={deleteTournament} />
          )}
        </section>
      </>
    )}

    {active === "Create Tournament" && (
      <section className="admin-panel admin-form-panel">
        <h3>Create a tournament</h3>
        <p>Enter the details for your next MLBB event.</p>
        <form onSubmit={createTournament} className="admin-form">
          <label>Tournament name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hancy Arena Cup" required /></label>
          <label>Game mode<select value={mode} onChange={(e) => setMode(e.target.value)}><option>5v5</option><option>1v1</option><option>2v2</option><option>3v3</option></select></label>
          <div className="admin-form-grid">
            <label>Entry fee (NPR)<input type="number" min="0" value={entryFee} onChange={(e) => setEntryFee(e.target.value)} required /></label>
            <label>Prize pool (NPR)<input type="number" min="0" value={prize} onChange={(e) => setPrize(e.target.value)} required /></label>
          </div>
          <label>Tournament date<input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
          <button type="submit" className="admin-primary">Create Tournament</button>
        </form>
      </section>
    )}

    {active === "Tournaments" && (
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div><h3>All Tournaments</h3><p>Manage status or remove a tournament.</p></div>
          <button className="admin-primary" onClick={() => setActive("Create Tournament")}>+ Create</button>
        </div>
        {tournaments.length === 0 ? (
          <div className="admin-empty"><span>🏆</span><strong>No tournaments created</strong><p>Use Create Tournament to add your first event.</p></div>
        ) : <TournamentTable tournaments={tournaments} updateStatus={updateStatus} deleteTournament={deleteTournament} />}
      </section>
    )}

    {active === "Players" && (
      <section className="admin-panel admin-empty">
        <span>♙</span>
        <h3>Player Registrations</h3>
        <p>Player registration records will appear here after we connect Supabase and create the registration workflow.</p>
        <span className="admin-pending">DATABASE CONNECTION PENDING</span>
      </section>
    )}

    <footer className="admin-footer">Hancy Arena · MLBB Tournament Platform</footer>
  </section>

  <style jsx global>{`
    * { box-sizing: border-box; }
    body { margin: 0; background: #090d18; color: #eef2ff; font-family: Arial, Helvetica, sans-serif; }
    .admin-shell { min-height: 100vh; background: #090d18; color: #eef2ff; display: flex; }
    .admin-sidebar { width: 245px; padding: 26px 16px; background: #0d1322; border-right: 1px solid #202b40; display: flex; flex-direction: column; flex-shrink: 0; }
    .admin-brand { display: flex; align-items: center; gap: 11px; padding: 0 8px 30px; }
    .admin-logo { width: 43px; height: 43px; display: grid; place-items: center; border-radius: 12px; background: linear-gradient(135deg,#20d6c1,#6476ff); color: #07111b; font-size: 25px; font-weight: 900; }
    .admin-brand strong { display: block; font-size: 13px; letter-spacing: 1px; }
    .admin-brand small { display: block; margin-top: 5px; font-size: 9px; letter-spacing: 2px; color: #8291ad; }
    .admin-label { color: #75839f; font-size: 10px; letter-spacing: 1.8px; padding: 0 10px; margin: 12px 0; }
    .admin-nav { width: 100%; text-align: left; border: 0; border-radius: 9px; padding: 13px 12px; margin-bottom: 5px; color: #aab6cd; background: transparent; cursor: pointer; display: flex; align-items: center; gap: 11px; font-size: 13px; }
    .admin-nav.selected { background: #18333b; color: #53e5d0; }
    .admin-sidebar-bottom { margin-top: auto; padding: 20px 8px 0; font-size: 11px; color: #8291ad; }
    .online-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #39d7a1; margin-right: 6px; }
    .admin-sidebar-bottom a { display: block; color: #aebbd3; text-decoration: none; margin-top: 22px; }
    .admin-main { flex: 1; min-width: 0; padding: 0 30px; }
    .admin-topbar { min-height: 91px; border-bottom: 1px solid #202b40; display: flex; align-items: center; justify-content: space-between; }
    .admin-topbar small { color: #8592ad; font-size: 10px; letter-spacing: 1.5px; }
    .admin-topbar h1 { font-size: 23px; margin: 7px 0 0; }
    .admin-avatar { width: 38px; height: 38px; display: grid; place-items: center; background: #202e46; border: 1px solid #354663; border-radius: 50%; font-size: 12px; font-weight: bold; }
    .admin-welcome { margin: 28px 0; padding: 27px; border-radius: 14px; border: 1px solid #28434e; background: linear-gradient(115deg,#132c38,#11182b 75%); display: flex; align-items: center; justify-content: space-between; gap: 20px; }
    .admin-kicker { color: #50e0cf; font-size: 10px; letter-spacing: 2px; }
    .admin-welcome h2 { font-size: 25px; margin: 10px 0; }
    .admin-welcome p,.admin-panel-heading p,.admin-form-panel > p { color: #8d9bb5; font-size: 13px; margin: 0; line-height: 1.6; }
    .admin-primary,.admin-secondary { border: 0; border-radius: 8px; padding: 12px 16px; font-weight: bold; cursor: pointer; font-size: 12px; }
    .admin-primary { background: #43dfca; color: #07151b; }
    .admin-secondary { background: #1b263a; color: #d9e3f8; }
    .admin-stats { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 15px; margin-bottom: 25px; }
    .admin-stat { background: #101827; border: 1px solid #202b40; padding: 20px; border-radius: 12px; }
    .admin-stat span { display: block; color: #9ba9c2; font-size: 12px; }
    .admin-stat strong { display: block; font-size: 29px; margin: 14px 0 8px; }
    .admin-stat small { font-size: 10px; color: #7887a1; }
    .admin-panel { background: #101827; border: 1px solid #202b40; border-radius: 13px; padding: 23px; margin-bottom: 25px; }
    .admin-panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
    .admin-panel h3 { margin: 0 0 7px; font-size: 17px; }
    .admin-empty { min-height: 200px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 10px; color: #93a2bd; }
    .admin-empty > span:first-child { font-size: 30px; }
    .admin-empty strong,.admin-empty h3 { color: #e7edfa; }
    .admin-empty p { font-size: 12px; line-height: 1.7; max-width: 440px; margin: 0 0 8px; }
    .admin-form-panel { max-width: 760px; margin: 28px auto; }
    .admin-form { display: grid; gap: 18px; margin-top: 25px; }
    .admin-form label { display: grid; gap: 8px; color: #bdc9de; font-size: 12px; }
    .admin-form input,.admin-form select { width: 100%; padding: 13px; border-radius: 7px; border: 1px solid #2b3850; background: #0a1120; color: #eef2ff; font: inherit; outline-color: #43dfca; }
    .admin-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .admin-table-wrap { overflow-x: auto; }
    .admin-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; }
    .admin-table th { color: #8190ab; font-weight: normal; font-size: 10px; letter-spacing: .7px; }
    .admin-table th,.admin-table td { padding: 14px 10px; border-bottom: 1px solid #202b40; white-space: nowrap; }
    .admin-table td { color: #d6dfef; }
    .admin-table select { background: #111d2e; color: #eaf0ff; border: 1px solid #34435b; border-radius: 6px; padding: 7px; }
    .admin-delete { border: 1px solid #713a4a; color: #ff9caf; background: #301c2a; padding: 7px 9px; border-radius: 6px; cursor: pointer; }
    .admin-notice { margin-top: 20px; padding: 13px; background: #17352f; border: 1px solid #285b50; color: #7ff0d8; border-radius: 8px; font-size: 12px; }
    .admin-pending { font-size: 10px; letter-spacing: 1px; padding: 8px 10px; border: 1px solid #5a4c2a; color: #f4ce80; border-radius: 6px; }
    .admin-footer { padding: 18px 0 25px; color: #65738d; font-size: 10px; text-align: center; }
    @media (max-width: 950px) { .admin-sidebar { width: 205px; } .admin-main { padding: 0 18px; } .admin-stats { grid-template-columns: repeat(2,minmax(0,1fr)); } .admin-welcome { align-items: flex-start; flex-direction: column; } }
    @media (max-width: 620px) { .admin-shell { flex-direction: column; } .admin-sidebar { width: 100%; padding: 14px; border-right: 0; border-bottom: 1px solid #202b40; } .admin-brand { padding-bottom: 12px; } .admin-label,.admin-sidebar-bottom { display: none; } .admin-sidebar { display: block; } .admin-nav { width: auto; display: inline-flex; padding: 10px; margin: 2px; font-size: 11px; } .admin-main { padding: 0 13px; } .admin-topbar { min-height: 75px; } .admin-welcome { padding: 20px; } .admin-welcome h2 { font-size: 21px; } .admin-stats { gap: 9px; } .admin-stat { padding: 14px; } .admin-stat strong { font-size: 24px; } .admin-panel { padding: 15px; } .admin-form-grid { grid-template-columns: 1fr; } }
  `}</style>
</main>
```

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
return ( <div className="admin-table-wrap"> <table className="admin-table"> <thead> <tr> <th>TOURNAMENT</th> <th>MODE</th> <th>ENTRY</th> <th>PRIZE</th> <th>DATE</th> <th>STATUS</th> <th>ACTION</th> </tr> </thead> <tbody>
{tournaments.map((t) => ( <tr key={t.id}> <td>{t.name}</td> <td>{t.mode}</td> <td>Rs. {t.entryFee}</td> <td>Rs. {t.prize}</td> <td>{new Date(t.date).toLocaleString()}</td> <td>
<select value={t.status} onChange={(e) => updateStatus(t.id, e.target.value)}> <option>Upcoming</option> <option>Live</option> <option>Completed</option> <option>Cancelled</option> </select> </td> <td><button className="admin-delete" onClick={() => deleteTournament(t.id)}>Delete</button></td> </tr>
))} </tbody> </table> </div>
);
}
