"use client";

import { useEffect, useState, type ReactNode } from "react";

export default function ShelfExperience({
  covers,
  children,
}: {
  covers: string[];
  children: ReactNode;
}) {
  const [loaded, setLoaded] = useState(0);
  const [ready, setReady] = useState(covers.length === 0);

  useEffect(() => {
    const unique = [...new Set(covers)];
    if (unique.length === 0) {
      setReady(true);
      return;
    }

    let cancelled = false;
    let complete = 0;
    const images = unique.map((src) => {
      const image = new window.Image();
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        complete += 1;
        if (cancelled) return;
        setLoaded(complete);
        if (complete === unique.length) setReady(true);
      };
      image.addEventListener("load", finish, { once: true });
      image.addEventListener("error", finish, { once: true });
      image.src = src;
      if (image.complete) finish();
      return image;
    });

    return () => {
      cancelled = true;
      images.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, [covers]);

  if (ready) return children;

  return (
    <main className="loading-library" data-theme="clothbound">
      <p className="eyebrow">Preparing your archive</p>
      <h1 className="hero-title">shelving your books</h1>
      <p className="hero-sub">Every cover is being set in place before the library opens.</p>
      <div className="loading-count" aria-live="polite">{loaded} of {new Set(covers).size} covers</div>
      <div className="progress" role="progressbar" aria-valuenow={loaded} aria-valuemin={0} aria-valuemax={new Set(covers).size}>
        <div className="progress-fill" style={{ width: `${Math.round((loaded / new Set(covers).size) * 100)}%` }} />
      </div>
    </main>
  );
}
