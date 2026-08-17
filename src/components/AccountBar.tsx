"use client";

import { useTransition } from "react";
import { signOut } from "@/app/auth-actions";

export default function AccountBar({ name }: { name: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="account-bar">
      <button
        type="button"
        className="sign-out-icon"
        disabled={pending}
        aria-label={`Sign out ${name}`}
        title={pending ? "Signing out…" : "Sign out"}
        onClick={() => startTransition(async () => { await signOut(); })}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M10 5H5.75A1.75 1.75 0 0 0 4 6.75v10.5C4 18.22 4.78 19 5.75 19H10" />
          <path d="M14.5 8.5 18 12l-3.5 3.5M8 12h10" />
        </svg>
      </button>
    </div>
  );
}
