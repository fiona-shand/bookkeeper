export const GENRES = [
  "Fiction",
  "Nonfiction",
  "Sci-Fi",
  "Fantasy",
  "Mystery & Thrillers",
  "Romance",
] as const;

export type Genre = (typeof GENRES)[number];

export const READING_STATUSES = ["reading", "read", "want"] as const;

export type ReadingStatus = (typeof READING_STATUSES)[number];

export const STATUS_LABEL: Record<ReadingStatus, string> = {
  reading: "Currently reading",
  read: "Read",
  want: "Want to read",
};
