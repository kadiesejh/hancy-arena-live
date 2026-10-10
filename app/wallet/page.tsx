
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

type Withdrawal = {
  id: string;
  amount: number;
  payment_method: string;
  account_name: string;
  account_number: string;
  status: string;
  admin_note?: string | null;
  created_at: string;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const RECEIVER_NUMBER = '9822342686';

export default function WalletPage() {
  const [client] = useState(() => supabaseBrowser());

  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [balance, setBalance] = useState(0);

  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('eSewa');
  const [amount, setAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [proof, setProof] = useState<File | null>(null);

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] =
    useState<PaymentMethod>('eSewa');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const [loading, setLoading] = useState(true);
  const [depositLoading, setDepositLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [expandedQR, setExpandedQR] = useState<string | null>(null);

  const qrImage =
    paymentMethod === 'eSewa' ? '/esewa-qr.png' : '/khalti-qr.png';

  const loadWallet = useCallback(async () => {
    if (!client) {
      setError('Supabase connection nahi mila. Configuration check karo.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: sessionData, error: sessionError } =
        await client.auth.getSession();

      if (sessionError) throw sessionError;

      const user = sessionData.session?.user;

      if (!user) {
        setUserId('');
        setEmail('');
        setError('Wallet use karne ke liye pehle login karo.');
        setLoading(false);
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? '');

      const [walletResult, depositResult, withdrawalResult] =
        await Promise.all([
          client
            .from('wallets')
            .select('balance')
            .eq('user_id', user.id)
            .maybeSingle(),

          client
            .from('wallet_deposits')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),

          client
            .from('wallet_withdrawals')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
        ]);

      if (walletResult.error) throw walletResult.error;
      if (depositResult.error) throw depositResult.error;

      // Withdrawal history may not be available until its SQL table is created.
      if (withdrawalResult.error) {
        setWithdrawals([]);
        console.error('Withdrawal history:', withdrawalResult.error.message);
      } else {
        setWithdrawals((withdrawalResult.data ?? []) as Withdrawal[]);
      }

      setBalance(Number(walletResult.data?.balance ?? 0));
      setDeposits((depositResult.data ?? []) as Deposit[]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Wallet load nahi ho paya.'
      );
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  async function handleLogout() {
    if (!client) return;

    const { error: logoutError } = await client.auth.signOut();

    if (logoutError) {
      setError(logoutError.message);
      return;
    }

    window.location.href = '/login';
  }

  async function handleDeposit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!client || !userId) {
      setError('Pehle login karo.');
      return;
    }

    const amountValue = Number(amount);

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError('Sahi deposit amount enter karo.');
      return;
    }

    if (!transactionId.trim()) {
      setError('Transaction ID enter karo.');
      return;
    }

    if (!proof) {
      setError('Payment screenshot select karo.');
      return;
    }

    if (proof.size > MAX_FILE_SIZE) {
      setError('Screenshot 5 MB se chhota hona chahiye.');
      return;
    }

    if (!proof.type.startsWith('image/')) {
      setError('Sirf image screenshot upload kar sakte ho.');
      return;
    }

    setDepositLoading(true);

    try {
      const fileExt = proof.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await client.storage
        .from('payment-proofs')
        .upload(filePath, proof, {
          upsert: false,
          contentType: proof.type,
        });

      if (uploadError) throw uploadError;

      // Private bucket ke liye public URL nahi, storage path save karo.
      const { error: insertError } = await client
        .from('wallet_deposits')
        .insert({
          user_id: userId,
          amount: amountValue,
          payment_method: paymentMethod,
          transaction_id: transactionId.trim(),
          proof_url: filePath,
          status: 'pending',
        });

      if (insertError) throw insertError;

      setMessage('Deposit request submit ho gayi! Admin verification pending hai.');
      setAmount('');
      setTransactionId('');
      setProof(null);

      const fileInput = document.getElementById(
        'payment-proof'
      ) as HTMLInputElement | null;

      if (fileInput) fileInput.value = '';

      await loadWallet();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Deposit request fail ho gayi.'
      );
    } finally {
      setDepositLoading(false);
    }
  }

  async function handleWithdrawal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!client || !userId) {
      setError('Withdrawal ke liye pehle login karo.');
      return;
    }

    const amountValue = Number(withdrawAmount);

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError('Sahi withdrawal amount enter karo.');
      return;
    }

    if (amountValue > balance) {
      setError('Withdrawal amount tumhare available balance se zyada hai.');
      return;
    }

    if (!accountName.trim() || !accountNumber.trim()) {
      setError('Account holder name aur account number dono bharo.');
      return;
    }

    setWithdrawLoading(true);

    try {
      const { error: insertError } = await client
        .from('wallet_withdrawals')
        .insert({
          user_id: userId,
          amount: amountValue,
          payment_method: withdrawMethod,
          account_name: accountName.trim(),
          account_number: accountNumber.trim(),
          status: 'pending',
        });

      if (insertError) throw insertError;

      setMessage(
        'Withdrawal request submit ho gayi! Admin approval ka wait karo.'
      );
      setWithdrawAmount('');
      setAccountName('');
      setAccountNumber('');

      await loadWallet();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Withdrawal request submit nahi hui.'
      );
    } finally {
      setWithdrawLoading(false);
    }
  }

  function downloadQR(src: string, name: string) {
    const link = document.createElement('a');
    link.href = src;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function statusColor(status: string) {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'paid':
      case 'completed':
        return 'text-green-400';
      case 'rejected':
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-yellow-400';
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-center text-white">
        Wallet load ho raha hai...
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center">
          <h1 className="mb-3 text-2xl font-bold">Hancy Arena Wallet</h1>
          <p className="mb-5 text-slate-300">
            {error || 'Wallet dekhne ke liye login karo.'}
          </p>
          <a
            href="/login"
            className="inline-block rounded-lg bg-violet-600 px-6 py-3 font-semibold hover:bg-violet-500"
          >
            Login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <a href="/" className="text-sm text-violet-300 hover:text-violet-200">
              ← Hancy Arena Home
            </a>
            <h1 className="mt-2 text-3xl font-extrabold">My Wallet</h1>
            <p className="mt-1 break-all text-sm text-slate-400">{email}</p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-600 px-4 py-2 hover:bg-slate-800"
          >
            Logout
          </button>
        </header>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-red-200">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 rounded-xl border border-green-500/40 bg-green-950/40 p-4 text-green-200">
            {message}
          </div>
        )}

        <section className="mb-8 rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-950 to-slate-900 p-6">
          <p className="text-slate-300">Available wallet balance</p>
          <h2 className="mt-2 text-4xl font-extrabold">
            NPR {balance.toLocaleString('en-NP', { maximumFractionDigits: 2 })}
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            Deposit aur withdrawal requests ka status yahin dekh sakte ho.
          </p>
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* DEPOSIT */}
          <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6">
            <h2 className="mb-5 text-2xl font-bold">Add Money</h2>

            <form onSubmit={handleDeposit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Payment method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['eSewa', 'Khalti'] as PaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`rounded-xl border p-3 font-bold ${
                        paymentMethod === method
                          ? 'border-violet-400 bg-violet-600/20 text-white'
                          : 'border-slate-600 text-slate-300'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 text-center">
                <p className="mb-3 text-sm text-slate-300">
                  {paymentMethod} QR Code
                </p>

                <button
                  type="button"
                  onClick={() => setExpandedQR(qrImage)}
                  className="mx-auto block rounded-xl bg-white p-2"
                  aria-label={`Open ${paymentMethod} QR full screen`}
                >
                  <img
                    src={qrImage}
                    alt={`${paymentMethod} payment QR`}
                    className="h-44 w-44 object-contain"
                  />
                </button>

                <p className="mt-3 text-sm text-slate-300">
                  Receiver number: <strong>{RECEIVER_NUMBER}</strong>
                </p>

                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedQR(qrImage)}
                    className="rounded-lg bg-slate-700 px-4 py-2 text-sm hover:bg-slate-600"
                  >
                    Enlarge QR
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadQR(
                        qrImage,
                        paymentMethod === 'eSewa' ? 'esewa-qr.png' : 'khalti-qr.png'
                      )
                    }
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500"
                  >
                    Download QR
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="deposit-amount" className="mb-2 block text-sm text-slate-300">
                  Amount (NPR)
                </label>
                <input
                  id="deposit-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label htmlFor="transaction-id" className="mb-2 block text-sm text-slate-300">
                  Transaction ID / Reference
                </label>
                <input
                  id="transaction-id"
                  type="text"
                  required
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Enter payment reference"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label htmlFor="payment-proof" className="mb-2 block text-sm text-slate-300">
                  Payment screenshot (max 5 MB)
                </label>
                <input
                  id="payment-proof"
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => setProof(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={depositLoading}
                className="w-full rounded-xl bg-violet-600 p-3 font-bold hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {depositLoading ? 'Submitting...' : 'Submit Deposit Request'}
              </button>

              <p className="text-xs leading-5 text-slate-400">
                Payment karne ke baad reference aur screenshot submit karo.
                Amount verification ke baad hi wallet mein add hona chahiye.
              </p>
            </form>
          </section>

          {/* WITHDRAW */}
          <section className="rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6">
            <h2 className="mb-2 text-2xl font-bold">Withdraw Money</h2>
            <p className="mb-5 text-sm text-slate-400">
              Available balance: NPR {balance.toLocaleString('en-NP')}
            </p>

            <form onSubmit={handleWithdrawal} className="space-y-4">
              <div>
                <label htmlFor="withdraw-amount" className="mb-2 block text-sm text-slate-300">
                  Withdrawal amount (NPR)
                </label>
                <input
                  id="withdraw-amount"
                  type="number"
                  min="1"
                  max={balance}
                  step="0.01"
                  required
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Receive payment through
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['eSewa', 'Khalti'] as PaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setWithdrawMethod(method)}
                      className={`rounded-xl border p-3 font-bold ${
                        withdrawMethod === method
                          ? 'border-violet-400 bg-violet-600/20'
                          : 'border-slate-600 text-slate-300'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="account-name" className="mb-2 block text-sm text-slate-300">
                  Account holder name
                </label>
                <input
                  id="account-name"
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Name on your account"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label htmlFor="account-number" className="mb-2 block text-sm text-slate-300">
                  {withdrawMethod} mobile / account number
                </label>
                <input
                  id="account-number"
                  type="text"
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Enter receiving number"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 outline-none focus:border-violet-500"
                />
              </div>

              <button
                type="submit"
                disabled={withdrawLoading}
                className="w-full rounded-xl bg-emerald-600 p-3 font-bold hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {withdrawLoading ? 'Submitting...' : 'Request Withdrawal'}
              </button>

              <p className="text-xs leading-5 text-slate-400">
                Request admin approval ke liye jayegi. Request submit hone se
                balance deduct nahi hota. Actual payout aur balance update
                secure admin-side process se karna zaroori hai.
              </p>
            </form>
          </section>
        </div>

        {/* DEPOSIT HISTORY */}
        <section className="mt-8 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6">
          <h2 className="mb-4 text-xl font-bold">Deposit History</h2>

          {deposits.length === 0 ? (
            <p className="text-slate-400">Abhi koi deposit request nahi hai.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="border-b border-slate-700 text-slate-400">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Transaction ID</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((item) => (
                    <tr key={item.id} className="border-b border-slate-800">
                      <td className="p-3">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">{item.payment_method}</td>
                      <td className="p-3">NPR {Number(item.amount).toLocaleString('en-NP')}</td>
                      <td className="p-3">{item.transaction_id}</td>
                      <td className={`p-3 font-semibold ${statusColor(item.status)}`}>
                        {item.status}
                        {item.admin_note ? (
                          <p className="mt-1 max-w-xs text-xs font-normal text-slate-400">
                            {item.admin_note}
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* WITHDRAWAL HISTORY */}
        <section className="mt-8 rounded-2xl border border-slate-700 bg-slate-900 p-5 sm:p-6">
          <h2 className="mb-4 text-xl font-bold">Withdrawal History</h2>

          {withdrawals.length === 0 ? (
            <p className="text-slate-400">Abhi koi withdrawal request nahi hai.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead className="border-b border-slate-700 text-slate-400">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Receiving account</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((item) => (
                    <tr key={item.id} className="border-b border-slate-800">
                      <td className="p-3">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">{item.payment_method}</td>
                      <td className="p-3">NPR {Number(item.amount).toLocaleString('en-NP')}</td>
                      <td className="p-3">
                        <div>{item.account_name}</div>
                        <div className="text-slate-400">{item.account_number}</div>
                      </td>
                      <td className={`p-3 font-semibold ${statusColor(item.status)}`}>
                        {item.status}
                        {item.admin_note ? (
                          <p className="mt-1 max-w-xs text-xs font-normal text-slate-400">
                            {item.admin_note}
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* FULL-SCREEN QR VIEWER */}
      {expandedQR && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Full-screen payment QR"
          onClick={() => setExpandedQR(null)}
        >
          <button
            type="button"
            aria-label="Close QR viewer"
            onClick={() => setExpandedQR(null)}
            className="absolute right-5 top-5 rounded-full bg-slate-800 px-4 py-2 text-2xl hover:bg-slate-700"
          >
            ×
          </button>

          <div
            className="flex w-full max-w-lg flex-col items-center rounded-2xl border border-slate-700 bg-slate-900 p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="mb-4 text-xl font-bold">
              {expandedQR.includes('esewa') ? 'eSewa QR Code' : 'Khalti QR Code'}
            </h2>

            <div className="rounded-xl bg-white p-3">
              <img
                src={expandedQR}
                alt="Enlarged payment QR"
                className="max-h-[65vh] w-full max-w-[420px] object-contain"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                downloadQR(
                  expandedQR,
                  expandedQR.includes('esewa') ? 'esewa-qr.png' : 'khalti-qr.png'
                )
              }
              className="mt-5 w-full rounded-xl bg-violet-600 px-5 py-3 font-bold hover:bg-violet-500"
            >
              Download QR Code
            </button>

            <button
              type="button"
              onClick={() => setExpandedQR(null)}
              className="mt-2 w-full rounded-xl border border-slate-600 px-5 py-3 hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
