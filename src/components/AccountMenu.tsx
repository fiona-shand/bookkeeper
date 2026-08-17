"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import { THEME_LABELS, THEMES, type ThemeName } from "@/lib/theme";

export default function AccountMenu({ name, initialTheme }: { name: string; initialTheme: ThemeName }) {
  const { openUserProfile, signOut } = useClerk();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(initialTheme);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  async function selectTheme(nextTheme: ThemeName) {
    setTheme(nextTheme);
    if (!user) return;
    await user.update({ unsafeMetadata: { ...user.unsafeMetadata, theme: nextTheme } });
  }

  return (
    <div className="profile-menu" ref={menuRef}>
      <button
        type="button"
        className="profile-trigger"
        aria-label={`${name}'s profile and settings`}
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
                  onClick={() => void selectTheme(option)}
                ><i /><i /><i /></button>
              ))}
            </div>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              openUserProfile();
            }}
          >
            Manage profile
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => void signOut({ redirectUrl: "/" })}
          >
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
