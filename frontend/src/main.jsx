import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { LogOut, Plus, RefreshCcw, Trash2 } from "lucide-react";
import "./styles.css";

const API_URL = "http://localhost:4000";

function api(path, token, options = {}) {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
  });
}

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");

    try {
      const data = await api(`/auth/${mode}`, null, {
        method: "POST",
        body: JSON.stringify(form)
      });
      onLogin(data);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <h1>Spenza Webhooks</h1>
        <p>Subscribe to webhook sources and watch events arrive in real time.</p>

        <div className="tabs">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
          <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Sign up</button>
        </div>

        <form onSubmit={submit}>
          {mode === "signup" && (
            <label>
              Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
          )}
          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          {error && <div className="error">{error}</div>}
          <button className="primary" type="submit">{mode === "login" ? "Login" : "Create account"}</button>
        </form>
      </section>
    </main>
  );
}

function Dashboard({ session, onLogout }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ sourceUrl: "", callbackUrl: "" });
  const [message, setMessage] = useState("");

  const token = session.token;
  const webhookBase = useMemo(() => `${API_URL}/webhooks`, []);

  async function loadData() {
    const [subs, evts] = await Promise.all([
      api("/subscriptions", token),
      api("/events", token)
    ]);
    setSubscriptions(subs);
    setEvents(evts);
  }

  useEffect(() => {
    loadData().catch((err) => setMessage(err.message));

    const stream = new EventSource(`${API_URL}/events/stream?token=${encodeURIComponent(token)}`);
    stream.onmessage = (event) => {
      const next = JSON.parse(event.data);
      setEvents((current) => [next, ...current.filter((item) => item.id !== next.id)]);
    };

    return () => stream.close();
  }, [token]);

  async function createSubscription(event) {
    event.preventDefault();
    setMessage("");

    try {
      await api("/subscriptions", token, {
        method: "POST",
        body: JSON.stringify(form)
      });
      setForm({ sourceUrl: "", callbackUrl: "" });
      await loadData();
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function cancelSubscription(id) {
    await api(`/subscriptions/${id}`, token, { method: "DELETE" });
    await loadData();
  }

  async function retryEvent(id) {
    const updated = await api(`/events/${id}/retry`, token, { method: "POST" });
    setEvents((current) => current.map((item) => (item.id === id ? updated : item)));
  }

  return (
    <main className="app-shell">
      <header>
        <div>
          <h1>Webhook Dashboard</h1>
          <p>{session.user.email}</p>
        </div>
        <button className="icon-button" onClick={onLogout} title="Logout"><LogOut size={18} /></button>
      </header>

      <section className="grid">
        <form className="panel" onSubmit={createSubscription}>
          <h2>New Subscription</h2>
          <label>
            Source URL
            <input placeholder="https://api.example.com/orders" value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} />
          </label>
          <label>
            Callback URL
            <input placeholder="https://webhook.site/..." value={form.callbackUrl} onChange={(e) => setForm({ ...form, callbackUrl: e.target.value })} />
          </label>
          {message && <div className="error">{message}</div>}
          <button className="primary" type="submit"><Plus size={16} /> Subscribe</button>
        </form>

        <section className="panel">
          <h2>Subscriptions</h2>
          <div className="list">
            {subscriptions.map((sub) => (
              <article className="row" key={sub.id}>
                <div>
                  <strong>{sub.sourceUrl}</strong>
                  <span>{sub.status} | POST {webhookBase}/{sub.id}</span>
                </div>
                {sub.status === "active" && (
                  <button className="icon-button danger" onClick={() => cancelSubscription(sub.id)} title="Cancel subscription">
                    <Trash2 size={17} />
                  </button>
                )}
              </article>
            ))}
            {!subscriptions.length && <p className="muted">No subscriptions yet.</p>}
          </div>
        </section>
      </section>

      <section className="panel">
        <h2>Incoming Events</h2>
        <div className="events">
          {events.map((evt) => (
            <article className="event-card" key={evt.id}>
              <div className="event-head">
                <span className={`badge ${evt.status}`}>{evt.status}</span>
                <strong>{evt.type}</strong>
                <small>{new Date(evt.createdAt).toLocaleString()}</small>
                {evt.status === "failed" && (
                  <button className="icon-button" onClick={() => retryEvent(evt.id)} title="Retry delivery">
                    <RefreshCcw size={16} />
                  </button>
                )}
              </div>
              <pre>{JSON.stringify(evt.payload, null, 2)}</pre>
              {evt.error && <p className="error">{evt.error}</p>}
            </article>
          ))}
          {!events.length && <p className="muted">Waiting for webhook events.</p>}
        </div>
      </section>
    </main>
  );
}

function App() {
  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem("spenza-session");
    return saved ? JSON.parse(saved) : null;
  });

  function login(data) {
    localStorage.setItem("spenza-session", JSON.stringify(data));
    setSession(data);
  }

  function logout() {
    localStorage.removeItem("spenza-session");
    setSession(null);
  }

  return session ? <Dashboard session={session} onLogout={logout} /> : <AuthScreen onLogin={login} />;
}

createRoot(document.getElementById("root")).render(<App />);
