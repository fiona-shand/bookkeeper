"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { importGoodreadsBatch, previewGoodreads } from "@/app/import";

export default function ShelfExperience({
  covers,
  goodreadsProfileId,
  missingCovers,
  children,
}: {
  covers: string[];
  goodreadsProfileId: string | null;
  missingCovers: number;
  children: ReactNode;
}) {
  const router = useRouter();
  const [repairing, setRepairing] = useState(
    Boolean(goodreadsProfileId && missingCovers > 0),
  );
  const [loaded, setLoaded] = useState(0);
  const [ready, setReady] = useState(covers.length === 0 && !repairing);

  useEffect(() => {
    if (!repairing || !goodreadsProfileId) return;
    const profileId = goodreadsProfileId;
    const repairKey = `bookkeeper-cover-repair:${profileId}`;
    if (window.sessionStorage.getItem(repairKey)) {
      setRepairing(false);
      if (covers.length === 0) setReady(true);
      return;
    }

    let cancelled = false;
    async function repair() {
      try {
        const preview = await previewGoodreads(profileId);
        if (!preview.ok) return;
        for (let start = 0; start < preview.books.length; start += 4) {
          await importGoodreadsBatch(preview.books.slice(start, start + 4));
        }
        window.sessionStorage.setItem(repairKey, "done");
        if (!cancelled) router.refresh();
      } finally {
        if (!cancelled) setRepairing(false);
      }
    }
    void repair();
    return () => { cancelled = true; };
  }, [covers.length, goodreadsProfileId, repairing, router]);

  useEffect(() => {
    if (repairing) return;
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
  }, [covers, repairing]);

  if (ready) return children;

  return (
    <main className="loading-library" data-theme="clothbound">
      <p className="eyebrow">Preparing your archive</p>
      <h1 className="hero-title">{repairing ? "finding every cover" : "shelving your books"}</h1>
      {repairing ? <p className="hero-sub">Your Goodreads shelves are filling in artwork that was missed.</p> : null}
      <div className="loading-count" aria-live="polite">{repairing ? `${missingCovers} covers to check` : `${loaded} of ${new Set(covers).size} covers`}</div>
      <div className="progress" role="progressbar" aria-valuenow={loaded} aria-valuemin={0} aria-valuemax={new Set(covers).size}>
        <div className="progress-fill" style={{ width: repairing ? "18%" : `${Math.round((loaded / new Set(covers).size) * 100)}%` }} />
      </div>
    </main>
  );
}
