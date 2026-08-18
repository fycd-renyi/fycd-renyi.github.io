import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";


const JOURNEY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_ROOT = path.join(JOURNEY_ROOT, "data");

const GANYING_TITLES = [
  "序文", "至孝感天為母添壽", "母償債冤魂討命", "捨己救人冤鬼退",
  "閻王命案法會審判", "開台尊王顯化事蹟", "業債附身功德解",
  "人鬼打架功德和息", "誠感仙翁顯顏容", "佛字墨寶驅邪",
  "古佛騎龍，神鳥引路，暹羅王感恩", "蛇精纒身點傳師勸解",
  "佛法奇蹟不可思議", "天主教徒求道耶稣顯化", "後記",
];

const GANYING_SOURCE_HEADINGS = [
  "序文", "至孝感天 為母添壽", "為母償債 冤魂討命", "捨己救人 冤魂退",
  "閻王命案 法會審判", "開台尊王 顯化事蹟", "業障附身 功德解",
  "人鬼打架 功德和息", "誠感仙翁 顯顔容", "佛字墨寶驅邪",
  "古佛騎龍，神鳥引路，暹邏王感恩", "蛇精纏身 點傳師勸解",
  "佛法奇蹟 不可思議", "天主教徒求道耶穌顯化", "後記",
];

const sources = [
  {
    dataFile: "overview.json",
    pageFile: "index.html",
    sections: [
      ["journey", "修辦歷程", "修辦歷程", 4],
      ["filial-piety", "至孝感天　為母添壽", "至孝感天　為母添壽", 2],
      ["embody-the-way", "以身示道  代天宣化 一表誠心以對天", "以身示道  代天宣化 一表誠心以對天", 3],
      ["heaven-and-humanity", "虔心恆誠 天人共辦", "虔心恆誠 天人共辦", 3],
    ],
  },
  {
    dataFile: "daofeng-yifan.json",
    pageFile: "daofeng-yifan.html",
    sections: [
      ["preface", "前言", "前言", 1],
      ["great-cause", "一大事因緣在人間", "一大事因緣在人間", 4],
      ["journey-review", "開道歷程之回顧", "開道歷程之回顧", 9],
      ["daofeng-yifan", "道風彝範", "道風彝範", 9],
      ["conclusion", "結語", "結語", 2],
    ],
  },
  {
    dataFile: "dao-zhi-zungui-ganying.json",
    pageFile: "dao-zhi-zungui-ganying.html",
    sections: GANYING_TITLES.map((title, index) => [
      [
        "preface", "filial-piety", "mother-debt", "self-sacrifice", "court",
        "kaotai", "merit-debt", "human-ghost", "immortal", "calligraphy",
        "siam", "snake", "miracle", "catholic", "afterword",
      ][index],
      title,
      GANYING_SOURCE_HEADINGS[index],
      [4, 6, 12, 9, 85, 9, 8, 9, 7, 7, 9, 27, 8, 8, 1][index],
    ]),
  },
  {
    dataFile: "yushi-fenpan.json",
    pageFile: "yushi-fenpan.html",
    sections: [
      ["xunzhongxun", "玉石分判 訓中訓", "玉石分判 訓中訓", 13],
      ["cibei-jianghua", "玉石分判–辛已年冬季大典慈悲講話", "玉石分判–辛已年冬季大典慈悲講話", 4],
      ["yu", "『玉』的訓文", "『玉』的訓文", 1],
      ["shi", "『石』的訓文", "『石』的訓文", 1],
      ["fen", "『分』的訓文", "『分』的訓文", 1],
      ["pan", "『判』的訓文", "『判』的訓文", 1],
    ],
  },
];

const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#x27;");

const decodeHtml = (value) => value
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">")
  .replaceAll("&quot;", '"')
  .replaceAll("&#x27;", "'")
  .replaceAll("&amp;", "&");

const renderParagraphs = (paragraphs) => paragraphs
  .map((text) => `<p data-verbatim="true">${escapeHtml(text)}</p>`)
  .join("\n");

const renderSection = (section) => {
  const heading = section.source_heading ?? section.title;
  return `<section class="journey-chapter" id="${escapeHtml(section.id)}">`
    + `<h2>${escapeHtml(heading)}</h2>${renderParagraphs(section.paragraphs)}</section>`;
};

const renderArticle = (article) => {
  const toc = article.sections
    .map((section) => `<li><a href="#${escapeHtml(section.id)}">${escapeHtml(section.title)}</a></li>`)
    .join("");
  const sections = article.sections.map(renderSection).join("\n");
  return `<article><h1>${escapeHtml(article.title)}</h1>`
    + `<nav class="article-toc" aria-label="文章目錄"><ol>${toc}</ol></nav>`
    + `${sections}</article>`;
};

const extractVerbatimParagraphs = (page) => [...page.matchAll(
  /<p data-verbatim="true">([\s\S]*?)<\/p>/g,
)].map((match) => decodeHtml(match[1]));

export async function verifyJourney() {
  const template = await readFile(path.join(JOURNEY_ROOT, "templates", "base.html"), "utf8");
  let paragraphCount = 0;
  let articleSectionCount = 0;

  for (const source of sources) {
    const article = JSON.parse(await readFile(path.join(DATA_ROOT, source.dataFile), "utf8"));
    assert.equal(typeof article.title, "string", `${source.dataFile}: title`);
    assert.ok(article.title, `${source.dataFile}: non-empty title`);
    assert.equal(typeof article.source_url, "string", `${source.dataFile}: source_url`);
    assert.ok(article.source_url, `${source.dataFile}: non-empty source_url`);
    assert.ok(Array.isArray(article.sections), `${source.dataFile}: sections`);

    const ids = article.sections.map((section) => section.id);
    assert.equal(new Set(ids).size, ids.length, `${source.dataFile}: unique section IDs`);
    assert.deepEqual(
      article.sections.map((section) => [
        section.id,
        section.title,
        section.source_heading ?? section.title,
        section.paragraphs.length,
      ]),
      source.sections,
      `${source.dataFile}: required section structure`,
    );

    for (const section of article.sections) {
      assert.ok(section.paragraphs.length, `${source.dataFile}/${section.id}: paragraphs`);
      assert.ok(
        section.paragraphs.every((paragraph) => typeof paragraph === "string" && paragraph.length > 0),
        `${source.dataFile}/${section.id}: non-empty paragraph strings`,
      );
    }

    const expectedParagraphs = article.sections.flatMap((section) => section.paragraphs);
    const page = await readFile(path.join(JOURNEY_ROOT, source.pageFile), "utf8");
    assert.ok(!page.includes("\r"), `${source.pageFile}: committed output must use LF`);
    assert.deepEqual(
      extractVerbatimParagraphs(page),
      expectedParagraphs,
      `${source.pageFile}: data-verbatim paragraphs must match JSON character-for-character and in order`,
    );

    const expectedPage = template
      .replace("{title}", escapeHtml(article.title))
      .replace("{content}", renderArticle(article));
    assert.equal(page, expectedPage, `${source.pageFile}: deterministic generated output`);

    paragraphCount += expectedParagraphs.length;
    if (source.dataFile !== "overview.json") articleSectionCount += article.sections.length;
  }

  const builder = await readFile(path.join(JOURNEY_ROOT, "build_pages.py"), "utf8");
  assert.equal(
    [...builder.matchAll(/write_text\(page, encoding="utf-8", newline="\\n"\)/g)].length,
    2,
    "build_pages.py must force LF for both article and overview writes",
  );

  const attributes = await readFile(path.join(JOURNEY_ROOT, ".gitattributes"), "utf8");
  for (const pattern of [".gitattributes text eol=lf", "*.html text eol=lf", "*.json text eol=lf", "*.mjs text eol=lf", "*.py text eol=lf"]) {
    assert.ok(attributes.split("\n").includes(pattern), `.gitattributes must preserve ${pattern}`);
  }

  assert.equal(articleSectionCount, 26, "long-form article section count");
  assert.equal(paragraphCount, 267, "verbatim paragraph count");
  return `PASS verify-journey: 19 source pages, ${articleSectionCount} article sections (+4 overview sections), ${paragraphCount} verbatim paragraphs, 4 deterministic pages`;
}

const summary = await verifyJourney();
console.log(summary);
