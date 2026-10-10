
'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseBrowser } from '../../lib/supabase';

type ReviewStatus = 'pending' | 'approved' | 'rejected';

type GameResult = {
  id: string;
  registration_id: string;
  tournament_id: string;
  user_id: string;
  screenshot_path: string;
  notes: string;
  status: ReviewStatus;
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

type WalletDeposit = {
  id: string;
  user_id: string;
  amount: number;
  payment_method: 'esewa' | 'khalti';
  transaction_id: string;
  screenshot_path: string;
  status: ReviewStatus;
  admin_note: string | null;
  created_at: string;
  reviewed_at?: string | null;
};

type DepositReviewItem = {
  deposit: WalletDeposit;
  screenshotUrl: string;
};

export default function AdminPage() {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  const [items, setItems] = useState<ReviewItem[]>([]);
  const [winnerNames, setWinnerNames] = useState<Record<string, string>>({});
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState('');

  const [deposits, setDeposits] = useState<DepositReviewItem[]>([]);
  const [depositNotes, setDepositNotes] = useState<Record<string, string>>({});
  const [depositBusyId, setDepositBusyId] = useState('');
  const [loadingDeposits, setLoadingDeposits] = useState(false);

  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('pending');
  const [depositFilter, setDepositFilter] = useState('pending');

  // Load wallet deposit requests and their private screenshots.
  const loadDeposits = useCallback(async () => {
    const supabase = supabaseBrowser();

    if (!supabase) {
      setMessage('Supabase environment variables are missing.');
      return;
    }

    setLoadingDeposits(true);

    try {
      const { data, error } = await supabase
        .from('wallet_deposits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setMessage('Payment requests could not load: ' + error.message);
        return;
      }

      const rows = (data || []) as WalletDeposit[];

      const loadedItems = await Promise.all(
        rows.map(async (deposit) => {
          if (!deposit.screenshot_path) {
            return { deposit, screenshotUrl: '' };
          }

          const { data: signedData, error: signedError } =
            await supabase.storage
              .from('payment-proofs')
              .createSignedUrl(deposit.screenshot_path, 600);

          return {
            deposit,
            screenshotUrl: signedError
              ? ''
              : signedData?.signedUrl || '',
          };
        })
      );

      setDeposits(loadedItems);

      setDepositNotes((previous) => {
        const next = { ...previous };

        for (const item of loadedItems) {
          if (next[item.deposit.id] === undefined) {
            next[item.deposit.id] = item.deposit.admin_note || '';
          }
        }

        return next;
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unexpected payment loading error.'
      );
    } finally {
      setLoadingDeposits(false);
    }
  }, []);

  // Existing result review system, with admin verification.
  const loadResults = useCallback(async () => {
    const supabase = supabaseBrowser();

    if (!supabase) {
      setMessage('Supabase environment variables are missing.');
      setChecking(false);
      return;
    }

    setChecking(true);
    setMessage('');

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      const user = sessionData.session?.user;

      if (sessionError || !user) {
        setAuthorized(false);
        setMessage('Please log in with your admin account first.');
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
        setMessage(
          'Access denied. This account is not registered in the admins table.'
        );
        setChecking(false);
        return;
      }

      setAuthorized(true);

      // Load payments only after the admin account has been verified.
      await loadDeposits();

      const { data: rows, error } = await supabase
        .from('game_results')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setMessage('Results could not load: ' + error.message);
        setChecking(false);
        return;
      }

      const results = (rows || []) as GameResult[];

      if (results.length === 0) {
        setItems([]);
        setChecking(false);
        return;
      }

      const tournamentIds = [
        ...new Set(results.map((result) => result.tournament_id)),
      ];

      const registrationIds = [
        ...new Set(results.map((result) => result.registration_id)),
      ];

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
        ((tournamentRows || []) as Tournament[]).map((tournament) => [
          tournament.id,
          tournament,
        ])
      );

      const registrationMap = new Map(
        ((registrationRows || []) as Registration[]).map((registration) => [
          registration.id,
          registration,
        ])
      );

      const reviewItems = await Promise.all(
        results.map(async (result) => {
          const { data: signedData, error: signedError } =
            await supabase.storage
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
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unexpected error.'
      );
    } finally {
      setChecking(false);
    }
  }, [loadDeposits]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  // Existing match-result approval/rejection.
  async function reviewResult(
    item: ReviewItem,
    decision: 'approved' | 'rejected'
  ) {
    const supabase = supabaseBrowser();
    if (!supabase) return;

    const result = item.result;
    const winner = (winnerNames[result.id] || '').trim();
    const note = (adminNotes[result.id] || '').trim();

    if (result.status !== 'pending') {
      setMessage('This match result has already been reviewed.');
      return;
    }

    if (decision === 'approved' && !winner) {
      setMessage('Enter the winner name before approving.');
      return;
    }

    if (
      !window.confirm(
        decision === 'approved'
          ? 'Approve this match result and publish the winner?'
          : 'Are you sure you want to reject this match result?'
      )
    ) {
      return;
    }

    setBusyId(result.id);
    setMessage('');

    const { data, error } = await supabase
      .from('game_results')
      .update({
        status: decision,
        winner_name: decision === 'approved' ? winner : null,
        admin_note: note || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', result.id)
      .eq('status', 'pending')
      .select('id');

    if (error) {
      setMessage('Result update failed: ' + error.message);
      setBusyId('');
      return;
    }

    if (!data || data.length === 0) {
      setMessage('This result may already have been reviewed.');
      setBusyId('');
      await loadResults();
      return;
    }

    setMessage(
      decision === 'approved'
        ? 'Result approved and winner published!'
        : 'Result rejected.'
    );

    await loadResults();
    setBusyId('');
  }

  // Securely review deposits through the database RPC.
  async function reviewDeposit(
    item: DepositReviewItem,
    action: 'approve' | 'reject'
  ) {
    const supabase = supabaseBrowser();
    if (!supabase) return;

    const deposit = item.deposit;

    if (deposit.status !== 'pending') {
      setMessage('This deposit has already been reviewed.');
      return;
    }

    if (
      action === 'approve' &&
      (!item.screenshotUrl || !deposit.transaction_id)
    ) {
      setMessage(
        'Payment proof is unavailable. Check the screenshot and transaction ID before reviewing.'
      );
      return;
    }

    const confirmation =
      action === 'approve'
        ? `Have you verified NPR ${Number(deposit.amount).toLocaleString()} in your eSewa/Khalti account? Only approve confirmed payments.`
        : 'Are you sure you want to reject this deposit?';

    if (!window.confirm(confirmation)) return;

    setDepositBusyId(deposit.id);
    setMessage('');

    try {
      const { data, error } = await supabase.rpc(
        'review_wallet_deposit',
        {
          p_deposit_id: deposit.id,
          p_action: action,
          p_admin_note: depositNotes[deposit.id]?.trim() || null,
        }
      );

      if (error) {
        setMessage('Payment review failed: ' + error.message);
        return;
      }

      setMessage(
        typeof data === 'string'
          ? data
          : action === 'approve'
            ? 'Deposit approved.'
            : 'Deposit rejected.'
      );

      await loadDeposits();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Unexpected payment review error.'
      );
    } finally {
      setDepositBusyId('');
    }
  }

  const filteredItems =
    filter === 'all'
      ? items
      : items.filter((item) => item.result.status === filter);

  const count = (status: string) =>
    items.filter((item) => item.result.status === status).length;

  const filteredDeposits =
    depositFilter === 'all'
      ? deposits
      : deposits.filter((item) => item.deposit.status === depositFilter);

  const depositCount = (status: string) =>
    deposits.filter((item) => item.deposit.status === status).length;

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: 1050, margin: '0 auto' }}>
        <a href="/" style={{ color: '#60a5fa', textDecoration: 'none' }}>
          ← Hancy Arena Home
        </a>

        <h1 style={{ fontSize: 32, marginBottom: 6 }}>
          Hancy Arena Admin
        </h1>

        <p style={{ color: '#aab4c5', marginTop: 0 }}>
          Match result review, winner management and wallet payment review.
        </p>

        {checking ? (
          <p>Checking admin access and loading submissions...</p>
        ) : !authorized ? (
          <section style={panelStyle}>
            <h2>Admin access required</h2>
            <p>{message || 'Please log in with your admin account.'}</p>
            <a href="/" style={{ color: '#60a5fa' }}>
              Go to website and log in
            </a>
          </section>
        ) : (
          <>
            {message && (
              <p
                role="status"
                style={{ color: '#86efac', overflowWrap: 'anywhere' }}
              >
                {message}
              </p>
            )}

            {/* WALLET DEPOSITS */}
            <section style={panelStyle}>
              <h2 style={{ marginTop: 0 }}>Wallet Deposit Requests</h2>

              <p style={{ color: '#aab4c5' }}>
                Verify each eSewa or Khalti payment in your payment account
                before approving it.
              </p>

              <div style={statsGrid}>
                <Stat label="Pending Payments" value={depositCount('pending')} />
                <Stat label="Approved Payments" value={depositCount('approved')} />
                <Stat label="Rejected Payments" value={depositCount('rejected')} />
                <Stat label="Total Payments" value={deposits.length} />
              </div>

              <label htmlFor="deposit-filter" style={{ display: 'block', marginTop: 20 }}>
                Filter payment requests
              </label>

              <select
                id="deposit-filter"
                value={depositFilter}
                onChange={(event) => setDepositFilter(event.target.value)}
                style={inputStyle}
              >
                <option value="pending">Pending payments</option>
                <option value="approved">Approved payments</option>
                <option value="rejected">Rejected payments</option>
                <option value="all">All payments</option>
              </select>

              <button
                onClick={() => loadDeposits()}
                disabled={loadingDeposits}
                style={secondaryButton}
              >
                {loadingDeposits ? 'Refreshing...' : 'Refresh Payments'}
              </button>

              {filteredDeposits.length === 0 ? (
                <p style={{ color: '#aab4c5', marginTop: 20 }}>
                  {loadingDeposits
                    ? 'Loading payment requests...'
                    : 'No payment requests found in this filter.'}
                </p>
              ) : (
                filteredDeposits.map((item) => {
                  const deposit = item.deposit;

                  return (
                    <div
                      key={deposit.id}
                      style={{
                        borderTop: '1px solid #39465d',
                        paddingTop: 18,
                        marginTop: 22,
                      }}
                    >
                      <div style={headerRow}>
                        <div>
                          <h3 style={{ margin: '0 0 8px' }}>
                            NPR {Number(deposit.amount).toLocaleString()}
                          </h3>
                          <p style={{ color: '#aab4c5', margin: 0 }}>
                            {deposit.payment_method.toUpperCase()}
                          </p>
                        </div>

                        <span style={statusStyle(deposit.status)}>
                          {deposit.status.toUpperCase()}
                        </span>
                      </div>

                      <p style={{ overflowWrap: 'anywhere' }}>
                        <strong>Transaction ID:</strong>{' '}
                        {deposit.transaction_id || 'Not provided'}
                      </p>

                      <p style={{ overflowWrap: 'anywhere' }}>
                        <strong>Player ID:</strong> {deposit.user_id}
                      </p>

                      <p>
                        <strong>Submitted:</strong>{' '}
                        {new Date(deposit.created_at).toLocaleString()}
                      </p>

                      <h4>Payment Screenshot</h4>

                      {item.screenshotUrl ? (
                        <a
                          href={item.screenshotUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#60a5fa' }}
                        >
                          <img
                            src={item.screenshotUrl}
                            alt="Player submitted payment proof"
                            style={{
                              display: 'block',
                              width: '100%',
                              maxWidth: 500,
                              maxHeight: 400,
                              objectFit: 'contain',
                              background: '#080c14',
                              borderRadius: 10,
                              border: '1px solid #39465d',
                            }}
                          />
                          Open full-size payment screenshot
                        </a>
                      ) : (
                        <p style={{ color: '#fca5a5' }}>
                          Screenshot preview unavailable. Check that the
                          private payment-proofs bucket exists and the
                          screenshot path is correct.
                        </p>
                      )}

                      <label
                        htmlFor={`deposit-note-${deposit.id}`}
                        style={{ display: 'block', marginTop: 18 }}
                      >
                        Admin note (optional)
                      </label>

                      <textarea
                        id={`deposit-note-${deposit.id}`}
                        value={depositNotes[deposit.id] || ''}
                        onChange={(event) =>
                          setDepositNotes((previous) => ({
                            ...previous,
                            [deposit.id]: event.target.value,
                          }))
                        }
                        placeholder="Review note or rejection reason"
                        rows={3}
                        style={{ ...inputStyle, resize: 'vertical' }}
                        disabled={deposit.status !== 'pending'}
                      />

                      {deposit.status === 'pending' && (
                        <div style={buttonRow}>
                          <button
                            disabled={depositBusyId === deposit.id}
                            onClick={() => reviewDeposit(item, 'approve')}
                            style={approveButton}
                          >
                            {depositBusyId === deposit.id
                              ? 'Processing...'
                              : 'Verify & Approve'}
                          </button>

                          <button
                            disabled={depositBusyId === deposit.id}
                            onClick={() => reviewDeposit(item, 'reject')}
                            style={rejectButton}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </section>

            {/* EXISTING GAME RESULT REVIEW */}
            <h2 style={{ marginTop: 32 }}>Match Results & Winners</h2>

            <div style={statsGrid}>
              <Stat label="Pending" value={count('pending')} />
              <Stat label="Approved" value={count('approved')} />
              <Stat label="Rejected" value={count('rejected')} />
              <Stat label="Total Results" value={items.length} />
            </div>

            <section style={panelStyle}>
              <label htmlFor="result-filter" style={{ display: 'block' }}>
                Filter submissions
              </label>

              <select
                id="result-filter"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                style={inputStyle}
              >
                <option value="pending">Pending review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All submissions</option>
              </select>

              <button
                onClick={() => loadResults()}
                style={secondaryButton}
              >
                Refresh Results
              </button>
            </section>

            {filteredItems.length === 0 ? (
              <section style={panelStyle}>
                <p>No match submissions found in this filter.</p>
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

                    <h3>Match Screenshot Proof</h3>

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
                        Screenshot preview unavailable. Check the
                        result-proofs storage bucket and file path.
                      </p>
                    )}

                    <label
                      htmlFor={`winner-${result.id}`}
                      style={{ display: 'block', marginTop: 20 }}
                    >
                      Winner name (required for approval)
                    </label>

                    <input
                      id={`winner-${result.id}`}
                      value={winnerNames[result.id] || ''}
                      onChange={(event) =>
                        setWinnerNames((previous) => ({
                          ...previous,
                          [result.id]: event.target.value,
                        }))
                      }
                      placeholder="Winning player or team name"
                      style={inputStyle}
                      disabled={result.status !== 'pending'}
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
                      onChange={(event) =>
                        setAdminNotes((previous) => ({
                          ...previous,
                          [result.id]: event.target.value,
                        }))
                      }
                      placeholder="Review note or rejection reason"
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical' }}
                      disabled={result.status !== 'pending'}
                    />

                    {result.status === 'pending' && (
                      <div style={buttonRow}>
                        <button
                          disabled={busyId === result.id}
                          onClick={() => reviewResult(item, 'approved')}
                          style={approveButton}
                        >
                          {busyId === result.id
                            ? 'Saving...'
                            : 'Approve & Publish'}
                        </button>

                        <button
                          disabled={busyId === result.id}
                          onClick={() => reviewResult(item, 'rejected')}
                          style={rejectButton}
                        >
                          Reject
                        </button>
                      </div>
                    )}
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
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>
        {value}
      </div>
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
