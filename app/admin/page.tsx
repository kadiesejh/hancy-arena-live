
'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseBrowser } from '../../lib/supabase';

type GameResult = {
  id: string;
  registration_id: string;
  tournament_id: string;
  user_id: string;
  screenshot_path: string;
  notes: string;
  status: 'pending' | 'approved' | 'rejected';
  winner_name: string | null;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
};

type Tournament = {
  id: string;
  name: string;
  game_name?: string | null;
};

type Registration = {
  id: string;
  team_name: string | null;
  captain_name: string | null;
  phone?: string | null;
};

type ReviewItem = {
  result: GameResult;
  tournamentName: string;
  gameName: string;
  teamName: string;
  captainName: string;
  phone: string;
  screenshotUrl: string;
};

export default function AdminPage() {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [winnerNames, setWinnerNames] = useState<Record<string, string>>({});
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('pending');

  const loadResults = useCallback(async () => {
    const supabase = supabaseBrowser();
    if (!supabase) {
      setMessage('Supabase environment variables missing hain.');
      setChecking(false);
      return;
    }

    setChecking(true);
    setMessage('');

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    const user = sessionData.session?.user;

    if (sessionError || !user) {
      setAuthorized(false);
      setMessage('Admin Panel kholne ke liye pehle admin account se login karo.');
      setChecking(false);
      return;
    }

    const { data: adminRow, error: adminError } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (adminError || !adminRow) {
      setAuthorized(false);
      setMessage('Access denied. Is login ko admins table mein add nahi kiya gaya hai.');
      setChecking(false);
      return;
    }

    setAuthorized(true);

    const { data: rows, error } = await supabase
      .from('game_results')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setMessage('Results load nahi hue: ' + error.message);
      setChecking(false);
      return;
    }

    const results = (rows || []) as GameResult[];

    if (results.length === 0) {
      setItems([]);
      setChecking(false);
      return;
    }

    const tournamentIds = [...new Set(results.map((r) => r.tournament_id))];
    const registrationIds = [...new Set(results.map((r) => r.registration_id))];

    const [{ data: tournamentRows }, { data: registrationRows }] =
      await Promise.all([
        supabase
          .from('tournaments')
          .select('id, name, game_name')
          .in('id', tournamentIds),
        supabase
          .from('registrations')
          .select('id, team_name, captain_name, phone')
          .in('id', registrationIds),
      ]);

    const tournamentMap = new Map(
      ((tournamentRows || []) as Tournament[]).map((t) => [t.id, t])
    );

    const registrationMap = new Map(
      ((registrationRows || []) as Registration[]).map((r) => [r.id, r])
    );

    const reviewItems = await Promise.all(
      results.map(async (result) => {
        const { data: signedData, error: signedError } = await supabase.storage
          .from('result-proofs')
          .createSignedUrl(result.screenshot_path, 600);

        const tournament = tournamentMap.get(result.tournament_id);
        const registration = registrationMap.get(result.registration_id);

        return {
          result,
          tournamentName: tournament?.name || 'Tournament',
          gameName: tournament?.game_name || '',
          teamName: registration?.team_name || 'Not provided',
          captainName: registration?.captain_name || 'Not provided',
          phone: registration?.phone || 'Not provided',
          screenshotUrl: signedError ? '' : signedData?.signedUrl || '',
        };
      })
    );

    setItems(reviewItems);

    setWinnerNames((previous) => {
      const next = { ...previous };
      for (const item of reviewItems) {
        if (next[item.result.id] === undefined) {
          next[item.result.id] = item.result.winner_name || '';
        }
      }
      return next;
    });

    setAdminNotes((previous) => {
      const next = { ...previous };
      for (const item of reviewItems) {
        if (next[item.result.id] === undefined) {
          next[item.result.id] = item.result.admin_note || '';
        }
      }
      return next;
    });

    setChecking(false);
  }, []);

  useEffect(() => {
    loadResults().catch((error) => {
      setMessage(error instanceof Error ? error.message : 'Unexpected error.');
      setChecking(false);
    });
  }, [loadResults]);

  async function reviewResult(item: ReviewItem, decision: 'approved' | 'rejected') {
    const supabase = supabaseBrowser();
    if (!supabase) return;

    const result = item.result;
    const winner = (winnerNames[result.id] || '').trim();
    const note = (adminNotes[result.id] || '').trim();

    if (decision === 'approved' && !winner) {
      setMessage('Approve karne se pehle winner ka naam likho.');
      return;
    }

    setBusyId(result.id);
    setMessage('');

    const { error } = await supabase
      .from('game_results')
      .update({
        status: decision,
        winner_name: decision === 'approved' ? winner : null,
        admin_note: note || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', result.id);

    if (error) {
      setMessage('Result update nahi hua: ' + error.message);
      setBusyId('');
      return;
    }

    setMessage(
      decision === 'approved'
        ? 'Result approve ho gaya aur winner publish ho gaya!'
        : 'Result reject kar diya gaya.'
    );

    await loadResults();
    setBusyId('');
  }

  const filteredItems =
    filter === 'all' ? items : items.filter((item) => item.result.status === filter);

  const count = (status: string) =>
    items.filter((item) => item.result.status === status).length;

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 1050, margin: '0 auto' }}>
        <a href="/" style={{ color: '#60a5fa', textDecoration: 'none' }}>
          ← Hancy Arena Home
        </a>

        <h1 style={{ fontSize: 32, marginBottom: 6 }}>Hancy Arena Admin</h1>
        <p style={{ color: '#aab4c5', marginTop: 0 }}>
          Screenshot review, result approval aur winner management.
        </p>

        {checking ? (
          <p>Admin access aur results check ho rahe hain...</p>
        ) : !authorized ? (
          <section style={panelStyle}>
            <h2>Admin access required</h2>
            <p>{message || 'Admin account se login karo.'}</p>
            <a href="/" style={{ color: '#60a5fa' }}>
              Website par jao aur login karo
            </a>
          </section>
        ) : (
          <>
            <div style={statsGrid}>
              <Stat label="Pending" value={count('pending')} />
              <Stat label="Approved" value={count('approved')} />
              <Stat label="Rejected" value={count('rejected')} />
              <Stat label="Total" value={items.length} />
            </div>

            <section style={panelStyle}>
              <label htmlFor="filter" style={{ display: 'block' }}>
                Filter submissions
              </label>
              <select
                id="filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={inputStyle}
              >
                <option value="pending">Pending review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All submissions</option>
              </select>

              <button onClick={() => loadResults()} style={secondaryButton}>
                Refresh results
              </button>
            </section>

            {message && (
              <p role="status" style={{ color: '#86efac', overflowWrap: 'anywhere' }}>
                {message}
              </p>
            )}

            {filteredItems.length === 0 ? (
              <section style={panelStyle}>
                <p>Is filter mein koi submissions nahi hain.</p>
              </section>
            ) : (
              filteredItems.map((item) => {
                const result = item.result;

                return (
                  <section key={result.id} style={panelStyle}>
                    <div style={headerRow}>
                      <div>
                        <h2 style={{ margin: '0 0 6px' }}>
                          {item.tournamentName}
                        </h2>
                        <p style={{ color: '#aab4c5', margin: 0 }}>
                          {item.gameName || 'Game not specified'}
                        </p>
                      </div>
                      <span style={statusStyle(result.status)}>
                        {result.status.toUpperCase()}
                      </span>
                    </div>

                    <div style={detailsGrid}>
                      <p><strong>Team:</strong> {item.teamName}</p>
                      <p><strong>Captain:</strong> {item.captainName}</p>
                      <p><strong>Contact:</strong> {item.phone}</p>
                      <p>
                        <strong>Submitted:</strong>{' '}
                        {new Date(result.created_at).toLocaleString()}
                      </p>
                    </div>

                    {result.notes && (
                      <p>
                        <strong>Player notes:</strong> {result.notes}
                      </p>
                    )}

                    <h3>Match screenshot proof</h3>
                    {item.screenshotUrl ? (
                      <a
                        href={item.screenshotUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#60a5fa' }}
                      >
                        <img
                          src={item.screenshotUrl}
                          alt="Player submitted match screenshot"
                          style={{
                            display: 'block',
                            width: '100%',
                            maxWidth: 650,
                            maxHeight: 480,
                            objectFit: 'contain',
                            objectPosition: 'left',
                            background: '#080c14',
                            borderRadius: 10,
                            border: '1px solid #39465d',
                          }}
                        />
                        Open full-size screenshot
                      </a>
                    ) : (
                      <p style={{ color: '#fca5a5' }}>
                        Screenshot preview load nahi hua. Storage policy aur file path check karo.
                      </p>
                    )}

                    <label
                      htmlFor={`winner-${result.id}`}
                      style={{ display: 'block', marginTop: 20 }}
                    >
                      Winner name (approval ke liye required)
                    </label>
                    <input
                      id={`winner-${result.id}`}
                      value={winnerNames[result.id] || ''}
                      onChange={(e) =>
                        setWinnerNames((previous) => ({
                          ...previous,
                          [result.id]: e.target.value,
                        }))
                      }
                      placeholder="Winning player ya team ka naam"
                      style={inputStyle}
                    />

                    <label
                      htmlFor={`note-${result.id}`}
                      style={{ display: 'block' }}
                    >
                      Admin note (optional)
                    </label>
                    <textarea
                      id={`note-${result.id}`}
                      value={adminNotes[result.id] || ''}
                      onChange={(e) =>
                        setAdminNotes((previous) => ({
                          ...previous,
                          [result.id]: e.target.value,
                        }))
                      }
                      placeholder="Review note ya rejection reason..."
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />

                    <div style={buttonRow}>
                      <button
                        disabled={busyId === result.id}
                        onClick={() => reviewResult(item, 'approved')}
                        style={approveButton}
                      >
                        {busyId === result.id ? 'Saving...' : 'Approve & Publish'}
                      </button>
                      <button
                        disabled={busyId === result.id}
                        onClick={() => reviewResult(item, 'rejected')}
                        style={rejectButton}
                      >
                        Reject
                      </button>
                    </div>
                  </section>
                );
              })
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={statStyle}>
      <div style={{ color: '#aab4c5', fontSize: 14 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function statusStyle(status: string) {
  const color =
    status === 'approved'
      ? '#86efac'
      : status === 'rejected'
        ? '#fca5a5'
        : '#fde68a';

  return {
    color,
    background: '#0b1220',
    border: `1px solid ${color}`,
    borderRadius: 20,
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: 'nowrap' as const,
  };
}

const pageStyle = {
  minHeight: '100vh',
  background: '#090d18',
  color: '#f8fafc',
  padding: '32px 16px',
  fontFamily: 'Arial, sans-serif',
};

const panelStyle = {
  background: '#121a2a',
  border: '1px solid #273449',
  borderRadius: 14,
  padding: 20,
  marginTop: 18,
  overflowWrap: 'anywhere' as const,
};

const inputStyle = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box' as const,
  marginTop: 8,
  marginBottom: 16,
  padding: 12,
  borderRadius: 8,
  border: '1px solid #39465d',
  background: '#0b1220',
  color: '#f8fafc',
  fontSize: 15,
};

const statsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
  gap: 12,
  marginTop: 22,
};

const statStyle = {
  background: '#121a2a',
  border: '1px solid #273449',
  borderRadius: 12,
  padding: 16,
};

const headerRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: 12,
  flexWrap: 'wrap' as const,
};

const detailsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '0 16px',
  color: '#d1d9e6',
  marginTop: 12,
};

const buttonRow = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap' as const,
  marginTop: 18,
};

const approveButton = {
  flex: '1 1 220px',
  padding: 13,
  border: 0,
  borderRadius: 8,
  background: '#15803d',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
};

const rejectButton = {
  flex: '1 1 120px',
  padding: 13,
  border: 0,
  borderRadius: 8,
  background: '#b91c1c',
  color: '#fff',
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryButton = {
  padding: 12,
  border: '1px solid #39465d',
  borderRadius: 8,
  background: '#202b3d',
  color: '#fff',
  cursor: 'pointer',
};
