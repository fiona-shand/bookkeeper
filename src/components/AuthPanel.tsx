"use client";

import { useState, useTransition } from "react";
import { register, signIn } from "@/app/auth-actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-constants";

type Mode = "signIn" | "register";

export default function AuthPanel() {
  const [mode, setMode] = useState<Mode>("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const registering = mode === "register";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = registering
        ? await register({ name, email, password })
        : await signIn({ email, password });

      if (!result.ok) setError(result.error);
      // On success the page re-renders with the shelf; no redirect needed.
    });
  }

  return (
    <form className="auth-panel" onSubmit={submit}>
      <p className="eyebrow">{registering ? "Make a shelf" : "Welcome back"}</p>

      {registering ? (
        <label className="auth-field">
          <span className="auth-label">Name</span>
          <input
            className="auth-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            required
          />
        </label>
      ) : null}

      <label className="auth-field">
        <span className="auth-label">Email</span>
        <input
          className="auth-input"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </label>

      <label className="auth-field">
        <span className="auth-label">Password</span>
        <input
          className="auth-input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={registering ? "new-password" : "current-password"}
          minLength={registering ? MIN_PASSWORD_LENGTH : undefined}
          required
        />
        {registering ? (
          <span className="auth-hint">
            At least {MIN_PASSWORD_LENGTH} characters.
          </span>
        ) : null}
      </label>

      {error ? <p className="add-status add-error">{error}</p> : null}

      <div className="add-actions">
        <button type="submit" className="ink-button" disabled={pending}>
          {pending
            ? registering
              ? "Making your shelf…"
              : "Signing in…"
            : registering
              ? "Make my shelf"
              : "Sign in"}
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setMode(registering ? "signIn" : "register");
            setError(null);
          }}
        >
          {registering ? "I already have one" : "I'm new here"}
        </button>
      </div>
    </form>
  );
}
