-- Demo records used during the initial prototype. Their fixed ids distinguish
-- them from real Goodreads imports, including imports with the same titles.
DELETE FROM "Book"
WHERE "id" IN (
  'piranesi', 'secret-history', 'normal-people', 'circe', 'klara',
  'song-of-achilles', 'tomorrow', 'a-little-life', 'beloved',
  'jonathan-strange', 'the-idiot', 'educated', 'bunny',
  'never-let-me-go', 'project-hail-mary', 'left-hand', 'station-eleven',
  'braiding-sweetgrass', 'sapiens', 'magical-thinking', 'just-kids',
  'h-is-for-hawk', 'priory', 'castle', 'gone-girl', 'silent-patient',
  'small-things', 'beach-read', 'people-we-meet'
);
