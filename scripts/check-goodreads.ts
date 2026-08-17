import {
  isLikelyUsername,
  parseShelfFeed,
  resolveProfileId,
  resolveProfileIdFromClipboard,
  feedUrl,
  toPlainText,
  SHELF_STATUS,
} from "../src/lib/goodreads";

let failures = 0;
function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) console.log(`  ok   ${label}`);
  else { failures += 1; console.log(`  FAIL ${label}`, detail ?? ""); }
}

console.log("\n— resolveProfileId —");
check("bare id", resolveProfileId("12345678") === "12345678");
check(
  "profile url",
  resolveProfileId("https://www.goodreads.com/user/show/12345678-fiona") === "12345678",
);
check(
  "rss url with key",
  resolveProfileId(
    "https://www.goodreads.com/review/list_rss/12345678?key=abc123&shelf=read",
  ) === "12345678",
);
check("whitespace tolerated", resolveProfileId("  12345678  ") === "12345678");
check("nonsense rejected", resolveProfileId("my goodreads") === null);
check("empty rejected", resolveProfileId("") === null);

console.log("\n— what the Goodreads app actually puts on the clipboard —");
// The mobile app's share sheet copies a sentence plus a slugless URL.
check(
  "app share text, exactly as pasted",
  resolveProfileId(
    "Check out my profile on Goodreads!\nhttps://www.goodreads.com/user/show/184463528",
  ) === "184463528",
);
check(
  "same thing on one line",
  resolveProfileId(
    "Check out my profile on Goodreads! https://www.goodreads.com/user/show/184463528",
  ) === "184463528",
);
check(
  "slugless url on its own",
  resolveProfileId("https://www.goodreads.com/user/show/184463528") === "184463528",
);
check(
  "share link carrying tracking parameters",
  resolveProfileId(
    "https://www.goodreads.com/user/show/184463528?utm_medium=api&utm_source=user_share",
  ) === "184463528",
);
check(
  "no scheme, as some apps paste it",
  resolveProfileId("goodreads.com/user/show/184463528") === "184463528",
);
check(
  "trailing whitespace and newlines",
  resolveProfileId("  https://www.goodreads.com/user/show/184463528  \n") === "184463528",
);
check(
  "prose alone, with no link, is rejected",
  resolveProfileId("Check out my profile on Goodreads!") === null,
);
check(
  "iOS rich text keeps the hidden profile link",
  resolveProfileIdFromClipboard([
    "",
    '<a href="https://www.goodreads.com/user/show/184463528-fiona?ref=share">Check out my profile on Goodreads!</a>',
    "Check out my profile on Goodreads!",
  ]) === "184463528",
);

console.log("\n— usernames —");
check("a plain handle looks like a username", isLikelyUsername("fionashand"));
check("dots and dashes allowed", isLikelyUsername("fiona.shand-1"));
check("a bare id is not a username", isLikelyUsername("184463528") === false);
check("pasted share text is not a username", isLikelyUsername("Check out my profile!") === false);
check("a url is not a username", isLikelyUsername("https://www.goodreads.com/x") === false);

console.log("\n— feedUrl —");
check(
  "builds a shelf feed url",
  feedUrl("12345678", "currently-reading") ===
    "https://www.goodreads.com/review/list_rss/12345678?shelf=currently-reading",
  feedUrl("12345678", "currently-reading"),
);

console.log("\n— toPlainText —");
check("strips tags", toPlainText("<b>Bold</b> text") === "Bold text");
check("br becomes newline", toPlainText("one<br />two") === "one\ntwo");
check("decodes ampersand", toPlainText("Salt &amp; Pepper") === "Salt & Pepper");
check(
  "does not double-decode",
  toPlainText("&amp;lt;tag&amp;gt;") === "&lt;tag&gt;",
  toPlainText("&amp;lt;tag&amp;gt;"),
);

console.log("\n— parseShelfFeed —");

// Shaped after a real goodreads.com/review/list_rss response.
const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><![CDATA[Fiona's bookshelf: read]]></title>
    <link><![CDATA[https://www.goodreads.com/review/list_rss/12345678?shelf=read]]></link>
    <description><![CDATA[Fiona's bookshelf: read]]></description>
    <item>
      <guid><![CDATA[https://www.goodreads.com/review/show/111]]></guid>
      <pubDate><![CDATA[Mon, 03 Feb 2026 09:12:00 -0800]]></pubDate>
      <title><![CDATA[Piranesi]]></title>
      <book_id>50202953</book_id>
      <book_image_url><![CDATA[https://i.gr-assets.com/books/1609095173l/50202953._SY75_.jpg]]></book_image_url>
      <book_large_image_url><![CDATA[https://i.gr-assets.com/books/1609095173l/50202953.jpg]]></book_large_image_url>
      <book_description><![CDATA[<b>Piranesi's house</b> is no ordinary building.]]></book_description>
      <book id="50202953">
        <num_pages>245</num_pages>
      </book>
      <author_name>Susanna Clarke</author_name>
      <isbn>1526622424</isbn>
      <user_rating>5</user_rating>
      <user_read_at><![CDATA[Mon, 03 Feb 2026 00:00:00 -0800]]></user_read_at>
      <user_shelves></user_shelves>
      <user_review><![CDATA[Beautiful &amp; strange.<br />Read it twice.]]></user_review>
      <average_rating>4.26</average_rating>
      <book_published>2020</book_published>
    </item>
    <item>
      <guid><![CDATA[https://www.goodreads.com/review/show/222]]></guid>
      <title><![CDATA[An Unrated Book]]></title>
      <book_id>999</book_id>
      <book id="999">
        <num_pages></num_pages>
      </book>
      <author_name>Someone Else</author_name>
      <isbn></isbn>
      <user_rating>0</user_rating>
      <user_review></user_review>
      <book_published>1999</book_published>
    </item>
    <item>
      <guid><![CDATA[https://www.goodreads.com/review/show/333]]></guid>
      <book_id>777</book_id>
      <author_name>No Title Here</author_name>
    </item>
  </channel>
</rss>`;

const books = parseShelfFeed(feed, "read");

check("drops items with no title", books.length === 2, books.length);
check("reads title", books[0].title === "Piranesi", books[0].title);
check("reads goodreads id", books[0].goodreadsId === "50202953", books[0].goodreadsId);
check("reads author", books[0].author === "Susanna Clarke", books[0].author);
check("keeps isbn as a string", books[0].isbn === "1526622424", books[0].isbn);
check("reads nested num_pages", books[0].pages === 245, books[0].pages);
check("reads year", books[0].year === 2020, books[0].year);
check("reads rating", books[0].rating === 5, books[0].rating);
check(
  "review is plain text with entities decoded",
  books[0].review === "Beautiful & strange.\nRead it twice.",
  JSON.stringify(books[0].review),
);
check("prefers the large cover", books[0].imageUrl?.endsWith("50202953.jpg") === true, books[0].imageUrl);
check("tags the shelf it came from", books[0].shelf === "read", books[0].shelf);

check("rating 0 becomes null (unrated)", books[1].rating === null, books[1].rating);
check("blank num_pages becomes null", books[1].pages === null, books[1].pages);
check("blank isbn becomes null", books[1].isbn === null, books[1].isbn);
check("blank review becomes null", books[1].review === null, books[1].review);
check("missing cover becomes null", books[1].imageUrl === null, books[1].imageUrl);

console.log("\n— single-item and malformed feeds —");
const single = `<?xml version="1.0"?><rss><channel><item>
  <title><![CDATA[Only Book]]></title><book_id>1</book_id><author_name>A</author_name>
</item></channel></rss>`;
check("one item parses to an array of one", parseShelfFeed(single, "read").length === 1);

const empty = `<?xml version="1.0"?><rss><channel><title>empty</title></channel></rss>`;
check("shelf with no items is empty", parseShelfFeed(empty, "read").length === 0);
check("garbage is empty, not a throw", parseShelfFeed("not xml at all", "read").length === 0);
check("html error page is empty", parseShelfFeed("<html><body>404</body></html>", "read").length === 0);

console.log("\n— shelf mapping —");
check("read → read", SHELF_STATUS.read === "read");
check("currently-reading → reading", SHELF_STATUS["currently-reading"] === "reading");
check("to-read → want", SHELF_STATUS["to-read"] === "want");

console.log(failures === 0 ? "\nall checks passed\n" : `\n${failures} FAILED\n`);
process.exit(failures === 0 ? 0 : 1);
