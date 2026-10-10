
'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { supabaseBrowser } from '../../lib/supabase';

type PaymentMethod = 'eSewa' | 'Khalti';

type Deposit = {
  id: string;
  amount: number;
  payment_method: string;
  transaction_id: string;
  status: string;
  admin_note?: string | null;
  created_at: string;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function WalletPage() {
  const [user, setUser] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);

  const [balance, setBalance] = useState<number | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('eSewa');
  const [amount, setAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);

  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const formatMoney = (value: number) =>
    `NPR ${Number(value || 0).toLocaleString('en-IN')}`;

  const loadWallet = useCallback(async (userId: string) => {
    const maybeClient = supabaseBrowser();

    if (!maybeClient) {
      setHistoryError('Supabase configuration missing hai.');
      setLoading(false);
      return;
    }

    const client = maybeClient;

    setLoading(true);
    setHistoryError('');

    try {
      const [walletResult, depositResult] = await Promise.all([
        client
          .from('wallets')
          .select('balance')
          .eq('user_id', userId)
          .maybeSingle(),

        client
          .from('wallet_deposits')
          .select(
            'id, amount, payment_method, transaction_id, status, admin_note, created_at'
          )
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (walletResult.error) {
        setBalance(null);
        setHistoryError(
          `Wallet balance load nahi hua: ${walletResult.error.message}`
        );
      } else {
        setBalance(Number(walletResult.data?.balance ?? 0));
      }

      if (depositResult.error) {
        setDeposits([]);
        setHistoryError((previous) =>
          previous
            ? `${previous} | Deposit history: ${depositResult.error.message}`
            : `Deposit history load nahi hui: ${depositResult.error.message}`
        );
      } else {
        setDeposits((depositResult.data || []) as Deposit[]);
      }
    } catch {
      setHistoryError('Wallet data load nahi hua. Dobara try karo.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Supabase client ko null-check ke baad stable, non-null variable mein rakho.
  useEffect(() => {
    const maybeClient = supabaseBrowser();

    if (!maybeClient) {
      setHistoryError('Supabase configuration missing hai.');
      setAuthReady(true);
      setLoading(false);
      return;
    }

    const client = maybeClient as NonNullable<typeof maybeClient>;
    let mounted = true;

    async function initialize() {
      try {
        const { data, error } = await client.auth.getSession();

        if (!mounted) return;

        if (error) {
          setHistoryError(`Session error: ${error.message}`);
        }

        setUser(data.session?.user ?? null);
        setAuthReady(true);
      } catch {
        if (mounted) {
          setHistoryError('Session load nahi hua. Dobara try karo.');
          setAuthReady(true);
          setLoading(false);
        }
      }
    }

    void initialize();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      setUser(session?.user ?? null);

      if (!session?.user) {
        setBalance(null);
        setDeposits([]);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady) return;

    if (!user?.id) {
      setLoading(false);
      setBalance(null);
      setDeposits([]);
      return;
    }

    void loadWallet(user.id);
  }, [authReady, user?.id, refreshKey, loadWallet]);

  async function submitDeposit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage('');
    setIsError(false);

    if (!user?.id) {
      setMessage('Pehle apne Hancy Arena account mein Sign In karo.');
      setIsError(true);
      return;
    }

    const numericAmount = Number(amount);
    const cleanTransactionId = transactionId.trim();

    if (
      !Number.isFinite(numericAmount) ||
      !Number.isInteger(numericAmount) ||
      numericAmount < 10 ||
      numericAmount > 10000
    ) {
      setMessage(
        'Amount NPR 10 se NPR 10,000 ke beech poori rakam mein bharo.'
      );
      setIsError(true);
      return;
    }

    if (
      cleanTransactionId.length < 3 ||
      cleanTransactionId.length > 120
    ) {
      setMessage('Sahi transaction ID enter karo.');
      setIsError(true);
      return;
    }

    if (!screenshot) {
      setMessage('Payment ka screenshot select karo.');
      setIsError(true);
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(screenshot.type)) {
      setMessage('Sirf JPG, PNG ya WebP image upload kar sakte ho.');
      setIsError(true);
      return;
    }

    if (screenshot.size > MAX_FILE_SIZE) {
      setMessage('Screenshot 5 MB se chhota hona chahiye.');
      setIsError(true);
      return;
    }

    const maybeClient = supabaseBrowser();

    if (!maybeClient) {
      setMessage('Supabase configuration missing hai.');
      setIsError(true);
      return;
    }

    const client = maybeClient as NonNullable<typeof maybeClient>;

    setSubmitting(true);

    let uploadedPath: string | null = null;

    try {
      const extensionByType: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
      };

      const extension = extensionByType[screenshot.type];
      const filePath = `${user.id}/${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await client.storage
        .from('payment-proofs')
        .upload(filePath, screenshot, {
          contentType: screenshot.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(
          `Screenshot upload failed: ${uploadError.message}`
        );
      }

      uploadedPath = filePath;

      const { error: insertError } = await client
        .from('wallet_deposits')
        .insert({
          user_id: user.id,
          amount: numericAmount,
          payment_method: paymentMethod,
          transaction_id: cleanTransactionId,
          screenshot_path: filePath,
          status: 'pending',
        });

      if (insertError) {
        throw new Error(
          `Deposit request failed: ${insertError.message}`
        );
      }

      setMessage(
        'Payment request submit ho gayi! Admin payment verify karega. Approval ke baad balance update hoga.'
      );
      setIsError(false);
      setAmount('');
      setTransactionId('');
      setScreenshot(null);

      const fileInput = document.getElementById(
        'payment-screenshot'
      ) as HTMLInputElement | null;

      if (fileInput) fileInput.value = '';

      setRefreshKey((value) => value + 1);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Payment request submit nahi hui. Dobara try karo.'
      );
      setIsError(true);

      if (uploadedPath) {
        try {
          await client.storage
            .from('payment-proofs')
            .remove([uploadedPath]);
        } catch {
          // Original error ko preserve karo.
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function logout() {
    const maybeClient = supabaseBrowser();

    if (!maybeClient) {
      setMessage('Supabase configuration missing hai.');
      setIsError(true);
      return;
    }

    const client = maybeClient as NonNullable<typeof maybeClient>;

    const { error } = await client.auth.signOut();

    if (error) {
      setMessage(`Logout error: ${error.message}`);
      setIsError(true);
      return;
    }

    window.location.href = '/';
  }

  return (
    <main className="wallet-page">
      <header className="topbar">
        <a href="/" className="brand">
          HANCY<span>ARENA</span>
        </a>

        <nav>
          <a href="/">Home</a>
          <a href="/#tournaments">Tournaments</a>
          {user && (
            <button type="button" onClick={logout}>
              Sign Out
            </button>
          )}
        </nav>
      </header>

      <div className="container">
        <div className="page-heading">
          <p className="eyebrow">PLAYER ACCOUNT</p>
          <h1>💳 My Wallet</h1>
          <p className="muted">
            Apna balance dekho aur eSewa ya Khalti se wallet top-up request bhejo.
          </p>
        </div>

        {!authReady && (
          <section className="panel">Account check ho raha hai...</section>
        )}

        {authReady && !user && (
          <section className="panel">
            <h2>Sign In Required</h2>
            <p className="muted">
              Wallet use karne aur payment request bhejne ke liye pehle login karo.
            </p>
            <a className="button" href="/#login">
              Sign In / Create Account
            </a>
          </section>
        )}

        {authReady && user && (
          <>
            <section className="balance-card">
              <div>
                <p>AVAILABLE WALLET BALANCE</p>
                <h2>
                  {loading && balance === null
                    ? 'Loading...'
                    : formatMoney(balance ?? 0)}
                </h2>
                <span>
                  Balance sirf admin ke verified approval ke baad badhega.
                </span>
              </div>
              <div className="balance-icon">💰</div>
            </section>

            <section className="panel payment-panel">
              <h2>➕ Add Money</h2>
              <p className="muted">
                Payment apne eSewa/Khalti app se karo, phir transaction details submit karo.
              </p>

              <div className="method-grid">
                <button
                  type="button"
                  className={`method ${paymentMethod === 'eSewa' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('eSewa')}
                >
                  <span className="method-icon esewa-icon">e</span>
                  <span>
                    <strong>eSewa</strong>
                    <small>Pay using eSewa</small>
                  </span>
                  <span className="radio-dot">
                    {paymentMethod === 'eSewa' ? '✓' : ''}
                  </span>
                </button>

                <button
                  type="button"
                  className={`method ${paymentMethod === 'Khalti' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('Khalti')}
                >
                  <span className="method-icon khalti-icon">K</span>
                  <span>
                    <strong>Khalti</strong>
                    <small>Pay using Khalti</small>
                  </span>
                  <span className="radio-dot">
                    {paymentMethod === 'Khalti' ? '✓' : ''}
                  </span>
                </button>
              </div>

              <div className="payment-instructions">
                <div className="qr-area">
                  {paymentMethod === 'eSewa' ? (
                    <img
                      src="/esewa-qr.png"
                      alt="eSewa payment QR code"
                      className="qr-image"
                    />
                  ) : (
                    <img
                      src="/khalti-qr.png"
                      alt="Khalti payment QR code"
                      className="qr-image"
                    />
                  )}
                </div>

                <div className="instruction-text">
                  <h3>{paymentMethod} Payment</h3>
                  <p>1. Apne {paymentMethod} app ko kholo.</p>
                  <p>2. QR scan karke payment karo.</p>
                  <p>3. Transaction ID aur payment screenshot sambhal kar rakho.</p>
                  <p>4. Neeche form bhar kar request submit karo.</p>

                  <div className="receiver">
                    <span>Payment number</span>
                    <strong>9822342686</strong>
                  </div>

                  <p className="small-note">
                    Payment bhejne se pehle receiver name aur details verify kar lena.
                    Agar QR image load nahi ho, to public folder mein QR file ka naam check karo.
                  </p>
                </div>
              </div>

              <form className="deposit-form" onSubmit={submitDeposit}>
                <label htmlFor="amount">Amount (NPR)</label>
                <input
                  id="amount"
                  type="number"
                  min="10"
                  max="10000"
                  step="1"
                  placeholder="Example: 100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />

                <div className="quick-amounts">
                  {[50, 100, 200, 500, 1000].map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={amount === String(value) ? 'chosen' : ''}
                      onClick={() => setAmount(String(value))}
                    >
                      NPR {value}
                    </button>
                  ))}
                </div>

                <label htmlFor="transaction-id">
                  Transaction ID / Reference ID
                </label>
                <input
                  id="transaction-id"
                  type="text"
                  minLength={3}
                  maxLength={120}
                  placeholder="Payment transaction ID"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  required
                />

                <label htmlFor="payment-screenshot">
                  Payment Screenshot
                </label>
                <input
                  id="payment-screenshot"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) =>
                    setScreenshot(e.target.files?.[0] || null)
                  }
                  required
                />
                <p className="small-note">
                  JPG, PNG ya WebP • Maximum 5 MB
                </p>

                {screenshot && (
                  <p className="selected-file">
                    Selected: {screenshot.name}
                  </p>
                )}

                <button
                  className="button submit-button"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting
                    ? 'Submitting Request...'
                    : 'Submit Deposit Request'}
                </button>

                {message && (
                  <div
                    className={`notice ${isError ? 'error' : 'success'}`}
                    role="status"
                  >
                    {message}
                  </div>
                )}
              </form>
            </section>

            <section className="panel history-panel">
              <div className="history-heading">
                <div>
                  <h2>📋 Deposit History</h2>
                  <p className="muted">
                    Tumhari recent wallet top-up requests.
                  </p>
                </div>

                <button
                  type="button"
                  className="refresh-button"
                  onClick={() => setRefreshKey((value) => value + 1)}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : '↻ Refresh'}
                </button>
              </div>

              {historyError && (
                <div className="notice error">{historyError}</div>
              )}

              {loading && (
                <p className="muted">Wallet history load ho rahi hai...</p>
              )}

              {!loading && deposits.length === 0 && (
                <div className="empty-state">
                  <span>🧾</span>
                  <p>Abhi koi deposit request nahi hai.</p>
                </div>
              )}

              {!loading && deposits.length > 0 && (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Method</th>
                        <th>Amount</th>
                        <th>Transaction ID</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deposits.map((deposit) => (
                        <tr key={deposit.id}>
                          <td>
                            {new Date(deposit.created_at).toLocaleString()}
                          </td>
                          <td>{deposit.payment_method}</td>
                          <td>{formatMoney(Number(deposit.amount))}</td>
                          <td className="transaction-cell">
                            {deposit.transaction_id}
                          </td>
                          <td>
                            <span
                              className={`status status-${String(
                                deposit.status
                              ).toLowerCase()}`}
                            >
                              {deposit.status}
                            </span>
                            {deposit.admin_note && (
                              <p className="admin-note">
                                Admin: {deposit.admin_note}
                              </p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="small-note">
                Pending = verification baaki hai. Approved = request accept hui.
                Rejected = request reject hui. Rejected request ka paisa wallet mein
                add nahi hota.
              </p>
            </section>
          </>
        )}

        <footer className="footer">
          © 2026 Hancy Arena • Secure Player Wallet
        </footer>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .wallet-page {
          min-height: 100vh;
          background: #090b14;
          color: #f5f6ff;
          padding-bottom: 30px;
        }

        .topbar {
          min-height: 72px;
          padding: 14px max(5%, calc((100% - 1120px) / 2));
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .brand {
          color: #fff;
          font-size: 20px;
          font-weight: 900;
          text-decoration: none;
          letter-spacing: 1px;
        }

        .brand span {
          color: #9277ff;
        }

        nav {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        nav a,
        nav button {
          color: #c9cbe0;
          background: transparent;
          border: 0;
          text-decoration: none;
          font: inherit;
          font-size: 13px;
          cursor: pointer;
        }

        nav a:hover,
        nav button:hover {
          color: #a895ff;
        }

        .container {
          width: min(100% - 32px, 1000px);
          margin: 0 auto;
        }

        .page-heading {
          padding: 35px 0 22px;
        }

        .eyebrow {
          color: #a895ff;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        h1 {
          font-size: clamp(28px, 5vw, 42px);
          margin: 8px 0;
        }

        h2 {
          margin-top: 0;
          font-size: 22px;
        }

        h3 {
          margin-top: 0;
        }

        .muted,
        .small-note {
          color: #a7abc4;
          line-height: 1.7;
        }

        .panel {
          margin-bottom: 22px;
          padding: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 18px;
          background: #111525;
        }

        .balance-card {
          margin-bottom: 24px;
          padding: 28px;
          border-radius: 20px;
          background: linear-gradient(120deg, #4b35b9, #22245b 70%, #17203f);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          box-shadow: 0 15px 40px rgba(62, 45, 160, 0.18);
        }

        .balance-card p {
          margin: 0;
          font-size: 12px;
          letter-spacing: 1.2px;
          font-weight: 800;
        }

        .balance-card h2 {
          margin: 12px 0;
          font-size: clamp(30px, 5vw, 40px);
        }

        .balance-card span {
          font-size: 12px;
          color: #e0dcff;
          line-height: 1.6;
        }

        .balance-icon {
          font-size: 46px;
        }

        .method-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin: 20px 0;
        }

        .method {
          display: flex;
          align-items: center;
          gap: 12px;
          text-align: left;
          color: white;
          background: #0b0f1e;
          border: 1px solid #30354c;
          border-radius: 14px;
          padding: 15px;
          cursor: pointer;
          min-width: 0;
        }

        .method.active {
          border-color: #9277ff;
          box-shadow: 0 0 0 1px #9277ff;
          background: #191733;
        }

        .method-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          font-size: 23px;
          font-weight: 900;
          flex-shrink: 0;
        }

        .esewa-icon {
          color: #fff;
          background: #43a047;
        }

        .khalti-icon {
          color: #fff;
          background: #6639c7;
        }

        .method strong,
        .method small {
          display: block;
        }

        .method small {
          color: #a7abc4;
          margin-top: 4px;
          font-size: 11px;
        }

        .radio-dot {
          margin-left: auto;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 1px solid #777b9c;
          display: grid;
          place-items: center;
          font-size: 13px;
          flex-shrink: 0;
        }

        .active .radio-dot {
          background: #9277ff;
          border-color: #9277ff;
        }

        .payment-instructions {
          display: grid;
          grid-template-columns: minmax(180px, 250px) minmax(0, 1fr);
          gap: 24px;
          padding: 20px;
          margin: 22px 0;
          border-radius: 16px;
          background: #0b0f1e;
          border: 1px solid #252a41;
        }

        .qr-area {
          display: grid;
          place-items: center;
          min-width: 0;
        }

        .qr-image {
          width: 100%;
          max-width: 230px;
          aspect-ratio: 1;
          object-fit: contain;
          background: white;
          padding: 8px;
          border-radius: 12px;
        }

        .instruction-text p {
          font-size: 13px;
          color: #c3c6dc;
          line-height: 1.65;
        }

        .receiver {
          padding: 12px;
          border-radius: 10px;
          background: #171d32;
          display: flex;
          flex-direction: column;
          gap: 5px;
          margin-top: 15px;
        }

        .receiver span {
          font-size: 12px;
          color: #a7abc4;
        }

        .receiver strong {
          font-size: 20px;
          letter-spacing: 1px;
        }

        .deposit-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .deposit-form label {
          margin-top: 10px;
          font-weight: 700;
          font-size: 13px;
        }

        .deposit-form input {
          width: 100%;
          min-width: 0;
          border: 1px solid #353b54;
          border-radius: 10px;
          padding: 13px;
          background: #0b0f1e;
          color: #fff;
          font: inherit;
        }

        .deposit-form input:focus {
          outline: 2px solid #7257ff;
          border-color: transparent;
        }

        .deposit-form input[type='file'] {
          padding: 10px;
        }

        .quick-amounts {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 4px 0 10px;
        }

        .quick-amounts button,
        .refresh-button {
          border: 1px solid #353b54;
          border-radius: 9px;
          padding: 9px 12px;
          background: #171d32;
          color: #dddff5;
          cursor: pointer;
        }

        .quick-amounts button.chosen {
          border-color: #9277ff;
          color: white;
          background: #30265c;
        }

        .button {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          text-decoration: none;
          text-align: center;
          border: 0;
          border-radius: 10px;
          padding: 13px 18px;
          color: white;
          background: linear-gradient(100deg, #7257ff, #5140c5);
          font: inherit;
          font-weight: 800;
          cursor: pointer;
        }

        .submit-button {
          width: 100%;
          margin-top: 12px;
        }

        .button:disabled,
        .refresh-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .selected-file {
          font-size: 12px;
          color: #b9b0ff;
          overflow-wrap: anywhere;
        }

        .notice {
          margin-top: 14px;
          padding: 13px;
          border-radius: 10px;
          line-height: 1.6;
          overflow-wrap: anywhere;
          font-size: 13px;
        }

        .success {
          color: #a8f0d1;
          background: rgba(32, 201, 151, 0.12);
          border: 1px solid rgba(32, 201, 151, 0.2);
        }

        .error {
          color: #ffc2b7;
          background: rgba(255, 87, 56, 0.12);
          border: 1px solid rgba(255, 87, 56, 0.2);
        }

        .history-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 18px;
        }

        .history-heading h2 {
          margin-bottom: 4px;
        }

        .history-heading p {
          margin-top: 0;
        }

        .table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        th,
        td {
          padding: 13px 10px;
          text-align: left;
          border-bottom: 1px solid #2a3045;
          vertical-align: top;
        }

        th {
          color: #a7abc4;
          font-weight: 700;
        }

        .transaction-cell {
          overflow-wrap: anywhere;
          min-width: 120px;
        }

        .status {
          display: inline-block;
          border-radius: 20px;
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          background: #34384d;
          color: #e0e2f4;
        }

        .status-pending {
          background: #493c19;
          color: #ffe19a;
        }

        .status-approved {
          background: #143d32;
          color: #a8f0d1;
        }

        .status-rejected {
          background: #4a2427;
          color: #ffc2b7;
        }

        .admin-note {
          color: #a7abc4;
          font-size: 11px;
          line-height: 1.5;
          max-width: 180px;
        }

        .empty-state {
          padding: 25px 10px;
          text-align: center;
          color: #a7abc4;
        }

        .empty-state span {
          font-size: 35px;
        }

        .footer {
          padding: 20px 0;
          text-align: center;
          color: #777d9a;
          font-size: 12px;
        }

        @media (max-width: 650px) {
          .topbar {
            align-items: flex-start;
            flex-direction: column;
          }

          nav {
            gap: 13px;
          }

          .panel {
            padding: 17px;
          }

          .balance-card {
            padding: 22px 18px;
          }

          .payment-instructions {
            grid-template-columns: 1fr;
            padding: 15px;
          }

          .qr-image {
            max-width: 220px;
          }

          .method-grid {
            grid-template-columns: 1fr;
          }

          .history-heading {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}
