"use client";

type StarRatingProps = {
  value: number | null;
  onChange?: (rating: number | null) => void;
  /** Read-only mode for display outside the review form. */
  readOnly?: boolean;
};

const STARS = [1, 2, 3, 4, 5];

export default function StarRating({
  value,
  onChange,
  readOnly = false,
}: StarRatingProps) {
  if (readOnly) {
    return (
      <span className="stars" aria-label={value ? `${value} out of 5` : "Unrated"}>
        {STARS.map((star) => (
          <span key={star} className={star <= (value ?? 0) ? "star-on" : "star-off"}>
            ★
          </span>
        ))}
      </span>
    );
  }

  return (
    <span className="stars" role="group" aria-label="Your rating">
      {STARS.map((star) => (
        <button
          key={star}
          type="button"
          className="star-button"
          // Clicking the current rating again clears it.
          onClick={() => onChange?.(value === star ? null : star)}
          aria-label={`${star} star${star === 1 ? "" : "s"}`}
          aria-pressed={star <= (value ?? 0)}
        >
          <span className={star <= (value ?? 0) ? "star-on" : "star-off"}>★</span>
        </button>
      ))}
    </span>
  );
}
