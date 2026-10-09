
'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '../../lib/supabase';

type Registration = {
  id: string;
  tournament_id: string;
  team_name: string | null;
  captain_name: string | null;
};

type Tournament = {
  id: string;
  name: string;
  game_name?: string | null;
};

type GameResult = {
  id: string;
  registration_id?: string;
  tournament_id: string;
  screenshot_path?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  winner_name: string | null;
  admin_note?: string | null;
  created_at: string;
};

export default function ResultsPage() {
  const [userId, setUserId] = useState('');
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [myResults, setMyResults] = useState<GameResult[]>([]);
  const [publicResults, setPublicResults] = useState<GameResult[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadPage() {
      const supabase = supabaseBrowser();

      if (!supabase) {
        setMessage('Supabase environment variables set nahi hain.');
        setLoading(false);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const currentUser = sessionData.session?.user;

      if (currentUser) {
        setUserId(currentUser.id);

        const { data: regs, error: regsError } = await supabase
          .from('registrations')
          .select('id, tournament_id, team_name, captain_name')
          .eq('user_id', currentUser.id);

        if (regsError) {
          setMessage('Registrations load nahi hue: ' + regsError.message);
        } else {
          const registrationList = (regs || []) as Registration[];
          setRegistrations(registrationList);

          if (registrationList.length > 0) {
            setSelectedId(registrationList[0].id);

            const { data: mine } = await supabase
              .from('game_results')
              .select('*')
              .eq('user_id', currentUser.id)
              .order('created_at', { ascending: false });

            setMyResults((mine || []) as GameResult[]);
          }
        }
      }

      const { data: approved } = await supabase
        .from('game_results')
        .select('id, tournament_id, winner_name, status, created_at')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      const approvedList = (approved || []) as GameResult[];
      setPublicResults(approvedList);

      const ids = [
        ...new Set([
          ...(currentUser
            ? (await supabase
                .from('registrations')
                .select('tournament_id')
                .eq('user_id', currentUser.id)).data || []
            : []).map((r: { tournament_id: string }) => r.tournament_id),
          ...approvedList.map((r) => r.tournament_id),
        ]),
      ];

      if (ids.length > 0) {
        const { data: tournamentRows } = await supabase
          .from('tournaments')
          .select('id, name, game_name')
          .in('id', ids);

        setTournaments((tournamentRows || []) as Tournament[]);
      }

      setLoading(false);
    }

    loadPage().catch((error) => {
      setMessage(error instanceof Error ? error.message : 'Kuch galat hua.');
      setLoading(false);
    });
  }, []);

  const tournamentName = (id: string) =>
    tournaments.find((t) => t.id === id)?.name || 'Tournament';

  const selectedRegistration = registrations.find(
    (r) => r.id === selectedId
  );

  const existingResult = myResults.find(
    (r) => r.registration_id === selectedId
  );

  async function submitProof() {
    setMessage('');

    const supabase = supabaseBrowser();

    if (!supabase || !userId) {
      setMessage('Pehle website par login karo.');
      return;
    }

    if (!selectedRegistration) {
      setMessage('Apna registered tournament select karo.');
      return;
    }

    if (!file) {
      setMessage('Match ka screenshot select karo.');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      setMessage('Sirf JPG, PNG ya WebP image upload kar sakte ho.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage('Screenshot 5 MB se chhota hona chahiye.');
      return;
    }

    if (existingResult) {
      setMessage('Is registration ka proof pehle hi submit ho chuka hai.');
      return;
    }

    setUploading(true);

    const extension =
      file.type === 'image/jpeg'
        ? 'jpg'
        : file.type === 'image/png'
          ? 'png'
          : 'webp';

    const path = `${userId}/${selectedRegistration.id}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from('result-proofs')
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      setMessage('Screenshot upload nahi hua: ' + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: newResult, error: insertError } = await supabase
      .from('game_results')
      .insert({
        registration_id: selectedRegistration.id,
        tournament_id: selectedRegistration.tournament_id,
        user_id: userId,
        screenshot_path: path,
        notes: notes.trim(),
        status: 'pending',
      })
      .select('*')
      .single();

    if (insertError) {
      setMessage(
        'Proof record save nahi hua: ' +
          insertError.message +
          '. Admin se help lo.'
      );
      setUploading(false);
      return;
    }

    setMyResults((previous) => [newResult as GameResult, ...previous]);
    setFile(null);
    setNotes('');
    setMessage('Screenshot submit ho gaya! Admin ke review ka wait karo.');
    setUploading(false);
  }

  const statusLabel = (status: string) => {
    if (status === 'approved') return 'Approved';
    if (status === 'rejected') return 'Rejected';
    return 'Pending review';
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#090d18',
        color: '#f8fafc',
        padding: '32px 16px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <a href="/" style={{ color: '#60a5fa', textDecoration: 'none' }}>
          ← Back to Hancy Arena
        </a>

        <h1 style={{ fontSize: 32, marginBottom: 8 }}>Game Results</h1>
        <p style={{ color: '#aab4c5', marginTop: 0 }}>
          Match ka screenshot submit karo. Admin review ke baad winner yahan
          public dikhega.
        </p>

        <section
          style={{
            background: '#121a2a',
            border: '1px solid #273449',
            borderRadius: 16,
            padding: 22,
            marginTop: 24,
          }}
        >
          <h2 style={{ marginTop: 0 }}>Submit Match Screenshot</h2>

          {loading ? (
            <p>Loading...</p>
          ) : !userId ? (
            <p>
              Screenshot submit karne ke liye pehle login karo.{' '}
              <a href="/" style={{ color: '#60a5fa' }}>
                Login / Sign in
              </a>
            </p>
          ) : registrations.length === 0 ? (
            <p>
              Abhi tumhari koi tournament registration nahi mili. Pehle
              tournament mein register karo.
            </p>
          ) : (
            <>
              <label htmlFor="registration">Registered tournament</label>
              <select
                id="registration"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                style={inputStyle}
              >
                {registrations.map((registration) => (
                  <option key={registration.id} value={registration.id}>
                    {tournamentName(registration.tournament_id)}
                    {registration.team_name
                      ? ` — ${registration.team_name}`
                      : ''}
                  </option>
                ))}
              </select>

              {existingResult ? (
                <div
                  style={{
                    background: '#202b3d',
                    padding: 16,
                    borderRadius: 10,
                    marginTop: 16,
                  }}
                >
                  <strong>
                    Status: {statusLabel(existingResult.status)}
                  </strong>
                  <p style={{ color: '#cbd5e1' }}>
                    {existingResult.status === 'pending'
                      ? 'Admin tumhara screenshot check kar raha hai.'
                      : existingResult.status === 'approved'
                        ? `Winner: ${existingResult.winner_name || 'Not specified'}`
                        : 'Tumhara proof reject hua hai. Dobara submit karne ke liye admin se contact karo.'}
                  </p>
                  {existingResult.admin_note && (
                    <p>Admin note: {existingResult.admin_note}</p>
                  )}
                </div>
              ) : (
                <>
                  <label htmlFor="screenshot" style={{ display: 'block', marginTop: 18 }}>
                    Match screenshot (JPG, PNG, WebP; max 5 MB)
                  </label>
                  <input
                    id="screenshot"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    style={{ ...inputStyle, padding: 12 }}
                  />

                  {file && (
                    <p style={{ color: '#aab4c5' }}>
                      Selected: {file.name} (
                      {(file.size / (1024 * 1024)).toFixed(2)} MB)
                    </p>
                  )}

                  <label htmlFor="notes" style={{ display: 'block', marginTop: 16 }}>
                    Match details (optional)
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Match ID, score ya doosri details..."
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical' }}
                  />

                  <button
                    onClick={submitProof}
                    disabled={uploading}
                    style={buttonStyle}
                  >
                    {uploading ? 'Submitting...' : 'Submit Screenshot Proof'}
                  </button>
                </>
              )}
            </>
          )}

          {message && (
            <p
              role="status"
              style={{
                color: message.toLowerCase().includes('nahi') ||
                  message.toLowerCase().includes('error')
                  ? '#fca5a5'
                  : '#86efac',
                overflowWrap: 'anywhere',
              }}
            >
              {message}
            </p>
          )}
        </section>

        {userId && (
          <section style={{ marginTop: 28 }}>
            <h2>My Submissions</h2>
            {myResults.length === 0 ? (
              <p style={{ color: '#aab4c5' }}>Abhi koi proof submit nahi hua.</p>
            ) : (
              myResults.map((result) => (
                <div key={result.id} style={resultCardStyle}>
                  <strong>{tournamentName(result.tournament_id)}</strong>
                  <p style={{ marginBottom: 0 }}>
                    Status: {statusLabel(result.status)}
                  </p>
                  {result.winner_name && <p>Winner: {result.winner_name}</p>}
                  {result.admin_note && <p>Admin note: {result.admin_note}</p>}
                </div>
              ))
            )}
          </section>
        )}

        <section style={{ marginTop: 32 }}>
          <h2>Approved Winners</h2>
          {publicResults.length === 0 ? (
            <p style={{ color: '#aab4c5' }}>
              Abhi koi result approve nahi hua. Approved winners yahan dikhai denge.
            </p>
          ) : (
            publicResults.map((result) => (
              <div key={result.id} style={resultCardStyle}>
                <strong>{tournamentName(result.tournament_id)}</strong>
                <p style={{ color: '#86efac', marginBottom: 0 }}>
                  Winner: {result.winner_name || 'Not specified'}
                </p>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}

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

const buttonStyle = {
  width: '100%',
  padding: 14,
  border: 0,
  borderRadius: 8,
  background: '#2563eb',
  color: 'white',
  fontWeight: 700,
  fontSize: 16,
  cursor: 'pointer',
  marginTop: 16,
};

const resultCardStyle = {
  background: '#121a2a',
  border: '1px solid #273449',
  borderRadius: 12,
  padding: 16,
  marginTop: 12,
};
