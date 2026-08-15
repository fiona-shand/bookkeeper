import { deflateSync } from "node:zlib";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { coverUrl, guessGenre, parseSearchResults } from "../src/lib/openlibrary";
import { bindingFromFormat, spineGeometry } from "../src/lib/spine";
import { coverColour, FALLBACK_COLOUR } from "../src/lib/colour";

let failures = 0;
function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) console.log(`  ok   ${label}`);
  else { failures += 1; console.log(`  FAIL ${label}`, detail ?? ""); }
}

console.log("\n— parseSearchResults —");

// Shaped after a real openlibrary.org/search.json response.
const payload = {
  numFound: 3,
  docs: [
    {
      key: "/works/OL20933010W",
      title: "Piranesi",
      author_name: ["Susanna Clarke"],
      first_publish_year: 2020,
      cover_i: 10514286,
      number_of_pages_median: 245,
      isbn: ["9781635575637", "1635575630"],
      subject: ["Fantasy fiction", "Amnesia", "Fiction, fantasy, general"],
    },
    // No author, cover or page count — all common in Open Library.
    { key: "/works/OL999W", title: "An Obscure Pamphlet" },
    // No title: unusable, must be dropped rather than rendered blank.
    { key: "/works/OL123W", author_name: ["Nobody"] },
  ],
};

const results = parseSearchResults(payload);

check("drops records with no title", results.length === 2, results.length);
check("reads title", results[0].title === "Piranesi");
check("reads first author", results[0].author === "Susanna Clarke");
check("reads year", results[0].year === 2020);
check("reads page count", results[0].pages === 245);
check("reads cover id", results[0].coverId === 10514286);
check("takes first isbn", results[0].isbn === "9781635575637");
check("guesses fantasy from subjects", results[0].genre === "Fantasy");
check("missing author falls back", results[1].author === "Unknown author");
check("missing pages is null", results[1].pages === null);
check("missing cover is null", results[1].coverId === null);
check("missing subjects default to Fiction", results[1].genre === "Fiction");
check("null payload is empty", parseSearchResults(null).length === 0);
check("garbage payload is empty", parseSearchResults("nope").length === 0);
check("missing docs is empty", parseSearchResults({}).length === 0);
check("docs not an array is empty", parseSearchResults({ docs: "x" }).length === 0);

console.log("\n— guessGenre —");
check("science fiction", guessGenre(["Science fiction, American"]) === "Sci-Fi");
check("thriller", guessGenre(["Suspense fiction", "Murder"]) === "Mystery & Thrillers");
check("memoir", guessGenre(["Biography & Autobiography"]) === "Nonfiction");
check("romance", guessGenre(["Love stories"]) === "Romance");
check("unknown defaults to Fiction", guessGenre(["Widgets"]) === "Fiction");
check(
  "specific beats broad",
  guessGenre(["Fiction", "Fantasy fiction"]) === "Fantasy",
);

console.log("\n— bindingFromFormat —");
check("hardcover", bindingFromFormat("Hardcover") === "hardcover");
check("hardback", bindingFromFormat("hardback") === "hardcover");
check("mass market", bindingFromFormat("Mass Market Paperback") === "massMarket");
check("paperback is trade", bindingFromFormat("Paperback") === "trade");
check("unknown format defaults to trade", bindingFromFormat("pbk.") === "trade");
check("missing format defaults to trade", bindingFromFormat(null) === "trade");

console.log("\n— spineGeometry —");
{
  const thin = spineGeometry(120, "trade", "a");
  const fat = spineGeometry(1000, "trade", "a");
  check("more pages means a wider spine", fat.width > thin.width * 3, { thin: thin.width, fat: fat.width });

  const hard = spineGeometry(300, "hardcover", "same-seed");
  const mass = spineGeometry(300, "massMarket", "same-seed");
  check("hardcovers stand taller than mass market", hard.height > mass.height, { hard: hard.height, mass: mass.height });

  // Individual pairs may round to the same pixel; what matters is that the
  // shelf as a whole has a ragged top edge rather than one flat line.
  const heights = Array.from({ length: 60 }, (_, i) =>
    spineGeometry(300, "trade", `book-${i}`).height,
  );
  const distinct = new Set(heights).size;
  check("same binding still gives a ragged top edge", distinct >= 15, { distinct });

  const min = Math.min(...heights);
  const max = Math.max(...heights);
  check("variation stays within a believable range", max - min <= 40, { min, max });
  check(
    "same book is the same height every time",
    spineGeometry(300, "trade", "book-7").height ===
      spineGeometry(300, "trade", "book-7").height,
  );
}

console.log("\n— coverUrl —");
check(
  "asks for a 404 rather than a blank placeholder",
  coverUrl(12345).includes("default=false"),
);

console.log("\n— coverColour —");

// Minimal truecolour PNG encoder, so the colour pipeline can be exercised
// without reaching the network.
function crc32(buf: Buffer): number {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function solidPng(size: number, r: number, g: number, b: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  const raw = Buffer.concat(
    Array.from({ length: size }, () =>
      Buffer.concat([
        Buffer.from([0]), // filter: none
        Buffer.concat(Array.from({ length: size }, () => Buffer.from([r, g, b]))),
      ]),
    ),
  );
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

async function colourChecks() {
  const dir = mkdtempSync(join(tmpdir(), "bookkeeper-"));
  const swatch = join(dir, "swatch.png");

  // A deep teal cover, like Piranesi.
  writeFileSync(swatch, solidPng(64, 31, 92, 99));
  const teal = await coverColour(swatch);
  console.log(`  extracted: ${teal}`);
  check("returns a hex colour", /^#[0-9a-f]{6}$/i.test(teal), teal);
  check("not the fallback", teal !== FALLBACK_COLOUR, teal);

  const missing = await coverColour(join(dir, "does-not-exist.png"));
  check("unreadable cover falls back instead of throwing", missing === FALLBACK_COLOUR);

  console.log(failures === 0 ? "\nall checks passed\n" : `\n${failures} FAILED\n`);
  process.exit(failures === 0 ? 0 : 1);
}

void colourChecks();
