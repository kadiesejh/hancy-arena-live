
"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabaseBrowser } from "../lib/supabase";

const events = [
  ["Hancy Weekly Cup", "5v5 • Knockout", "NPR 100", "NPR 2,000"],
  ["Night Battle", "5v5 • Best of 1", "NPR 50", "NPR 1,000"],
  ["Hancy Championship", "5v5 • Best of 3", "NPR 250", "NPR 5,000"],
];

type AuthMode = "signup" | "login" | "forgot" | "reset";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>("signup");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) return;

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
        setPassword("");
        setMsg("Ab apna naya password set karo.");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleAuth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("");
    setBusy(true);

    try {
      const sb = supabaseBrowser();

      if (!sb) {
        setMsg("Supabase keys missing. Add them to .env.local");
        return;
      }

      if (mode === "signup") {
        const { error } = await sb.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) {
          setMsg(error.message);
        } else {
          setMsg(
            "Account created! Check your email if confirmation is enabled."
          );
        }
      } else if (mode === "login") {
        const { error } = await sb.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          setMsg(error.message);
        } else {
          setMsg("Login successful! Welcome to Hancy Arena.");
        }
      } else if (mode === "forgot") {
        const { error } = await sb.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: `${window.location.origin}/`,
          }
        );

        if (error) {
          setMsg(error.message);
        } else {
          setMsg(
            "Password reset email ki request bhej di gayi hai. Inbox aur Spam check karo."
          );
        }
      } else if (mode === "reset") {
        const { error } = await sb.auth.updateUser({ password });

        if (error) {
          setMsg(error.message);
        } else {
          setPassword("");
          setMode("login");
          setMsg("Password successfully change ho gaya! Ab login karo.");
        }
      }
    } catch {
      setMsg("Network problem. Internet check karke dobara try karo.");
    } finally {
      setBusy(false);
    }
  }

  const heading = {
    signup: "🔐 Create Account",
    login: "🔑 Login",
    forgot: "🔄 Forgot Password",
    reset: "🔒 Set New Password",
  }[mode];

  return (
    <>
      <header>
        <div className="wrap nav">
          <div className="logo">
            HANCY<span>ARENA</span>
          </div>
          <div className="links">
            <a href="#home">Home</a>
            <a href="#tournaments">Tournaments</a>
            <a href="#leaderboard">Leaderboard</a>
            <a
              href="#login"
              onClick={() => {
                setMode("login");
                setMsg("");
              }}
            >
              Login
            </a>
          </div>
        </div>
      </header>

      <main id="home">
        <div className="wrap">
          <section className="hero">
            <div>
              <span className="badge">
                ⚡ REAL MLBB TOURNAMENT PLATFORM
              </span>
              <h1>
                Play. Compete.
                <br />
                <span>Win.</span>
              </h1>
              <p>
                Hancy Arena is your place to join Mobile Legends tournaments,
                register your squad and track competition results.
              </p>
              <a className="btn" href="#tournaments">
                Join Tournament
              </a>
              <a
                className="btn alt"
                href="#login"
                onClick={() => {
                  setMode("signup");
                  setMsg("");
                }}
              >
                Create Account
              </a>
            </div>

            <div className="panel">
              <div className="trophy">🏆</div>
              <h2 style={{ textAlign: "center" }}>HANCY ARENA</h2>
              <p className="muted" style={{ textAlign: "center" }}>
                Tournament platform ready for Supabase.
              </p>
            </div>
          </section>

          <section className="section">
            <div className="stats">
              <div className="panel stat">
                <strong>24+</strong>
                <span className="muted">Teams</span>
              </div>
              <div className="panel stat">
                <strong>08</strong>
                <span className="muted">Events</span>
              </div>
              <div className="panel stat">
                <strong>NPR 50K+</strong>
                <span className="muted">Prize Pool</span>
              </div>
              <div className="panel stat">
                <strong>4.9★</strong>
                <span className="muted">Rating</span>
              </div>
            </div>
          </section>

          <section className="section" id="tournaments">
            <h2>🔥 Featured Tournaments</h2>
            <p className="muted">
              Tournament cards are ready for database integration.
            </p>
            <div className="grid">
              {events.map((x) => (
                <div className="panel card" key={x[0]}>
                  <span className="status">OPEN</span>
                  <h3>{x[0]}</h3>
                  <p className="muted">{x[1]}</p>
                  <b>Entry: {x[2]}</b>
                  <p className="muted">Prize Pool: {x[3]}</p>
                  <a className="btn" href="#login">
                    Register
                  </a>
                </div>
              ))}
            </div>
          </section>

          <section className="section" id="leaderboard">
            <h2>🏆 Leaderboard</h2>
            <div className="panel">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Team</th>
                    <th>Wins</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td>Hancy Warriors</td>
                    <td>8</td>
                    <td>240</td>
                  </tr>
                  <tr>
                    <td>2</td>
                    <td>Shadow Five</td>
                    <td>7</td>
                    <td>210</td>
                  </tr>
                  <tr>
                    <td>3</td>
                    <td>Nova Squad</td>
                    <td>6</td>
                    <td>185</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="section" id="login">
            <h2>{heading}</h2>

            <p className="muted">
              {mode === "signup" &&
                "Create your Hancy Arena account using your email and password."}
              {mode === "login" &&
                "Enter your existing account email and password."}
              {mode === "forgot" &&
                "Enter your registered email to receive a password reset link."}
              {mode === "reset" &&
                "Enter a new password for your account."}
            </p>

            <div className="panel">
              <form className="form" onSubmit={handleAuth}>
                {mode !== "reset" && (
                  <input
                    type="email"
                    placeholder="Email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                )}

                {mode !== "forgot" && (
                  <input
                    type="password"
                    placeholder={
                      mode === "reset"
                        ? "New password (minimum 6 characters)"
                        : "Password (minimum 6 characters)"
                    }
                    autoComplete={
                      mode === "signup"
                        ? "new-password"
                        : mode === "reset"
                          ? "new-password"
                          : "current-password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                )}

                <button className="btn" type="submit" disabled={busy}>
                  {busy
                    ? "Please wait..."
                    : mode === "signup"
                      ? "Create Account"
                      : mode === "login"
                        ? "Login"
                        : mode === "forgot"
                          ? "Send Reset Email"
                          : "Update Password"}
                </button>

                {mode === "login" && (
                  <button
                    className="btn alt"
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setMsg("");
                    }}
                  >
                    Forgot Password?
                  </button>
                )}

                {mode !== "signup" && mode !== "reset" && (
                  <button
                    className="btn alt"
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setMsg("");
                    }}
                  >
                    Create Account
                  </button>
                )}

                {mode !== "login" && (
                  <button
                    className="btn alt"
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setPassword("");
                      setMsg("");
                    }}
                  >
                    Already have an account? Login
                  </button>
                )}

                {mode === "signup" && (
                  <button
                    className="btn alt"
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setMsg("");
                    }}
                  >
                    Already registered? Login
                  </button>
                )}

                {msg && (
                  <div
                    className={
                      msg.toLowerCase().includes("successfully") ||
                      msg.toLowerCase().includes("account created") ||
                      msg.toLowerCase().includes("request bhej")
                        ? "msg"
                        : "msg err"
                    }
                    role="status"
                  >
                    {msg}
                  </div>
                )}
              </form>
            </div>
          </section>
        </div>
      </main>

      <footer>
        © 2026 Hancy Arena • MLBB Tournament Platform
      </footer>
    </>
  );
}
