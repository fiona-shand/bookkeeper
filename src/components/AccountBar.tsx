"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { signOut } from "@/app/auth-actions";
import { isTheme, THEME_LABELS, THEMES, type ThemeName } from "@/lib/theme";

const THEME_STORAGE_KEY = "bookkeeper-theme";

export default function AccountBar({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeName>("clothbound");
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    const nextTheme = isTheme(saved) ? saved : "clothbound";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function selectTheme(nextTheme: ThemeName) {
    setTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }

  return (
    <div className="account-menu">
      <div className="profile-menu" ref={menuRef}>
        <button
          type="button"
          className="profile-trigger"
          aria-label={`${name}'s account and themes`}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((value) => !value)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="3.25" />
            <path d="M5.75 19c.55-3.35 2.65-5.25 6.25-5.25S17.7 15.65 18.25 19" />
          </svg>
        </button>

        {open ? (
          <div className="profile-popover" role="menu">
            <p className="profile-name">{name}</p>
            <div className="theme-picker">
              <span>Color scheme</span>
              <div className="theme-options" aria-label="Color scheme">
                {THEMES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`theme-swatch theme-swatch-${option}`}
                    aria-label={THEME_LABELS[option]}
                    aria-pressed={theme === option}
                    title={THEME_LABELS[option]}
                    onClick={() => selectTheme(option)}
                  ><i /><i /><i /></button>
                ))}
              </div>
            </div>
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => startTransition(async () => { await signOut(); })}
            >
              {pending ? "Signing out…" : "Sign out"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
