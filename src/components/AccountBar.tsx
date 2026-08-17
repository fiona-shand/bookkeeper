"use client";

import { useTransition } from "react";
import { signOut } from "@/app/auth-actions";

export default function AccountBar({ name }: { name: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="account-bar">
      <span className="eyebrow">Signed in as {name}</span>
      <button
        type="button"
        className="text-button"
        disabled={pending}
        onClick={() => startTransition(async () => { await signOut(); })}
      >
        {pending ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}
