import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";


const JOURNEY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_ROOT = path.join(JOURNEY_ROOT, "data");
const INTEGRITY_FILE = path.join(DATA_ROOT, "source-integrity.json");
const INTEGRITY_SERIALIZATION = "UTF-8 bytes of JSON.stringify([section.id, section.title, section.source_heading ?? section.title, section.source_url ?? article.source_url, section.paragraphs])";

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
    sourcePageCount: 1,
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
    sourcePageCount: 1,
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
    sourcePageCount: 16,
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
    sourcePageCount: 1,
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

const OVERVIEW_ARTICLES = [
  "daofeng-yifan.html",
  "dao-zhi-zungui-ganying.html",
  "yushi-fenpan.html",
];

const ARTICLE_NAVIGATION = {
  "daofeng-yifan": {
    previous: ["index.html", "修辦歷程"],
    next: ["dao-zhi-zungui-ganying.html", "道之尊貴感應"],
  },
  "dao-zhi-zungui-ganying": {
    previous: ["daofeng-yifan.html", "道風彝範"],
    next: ["yushi-fenpan.html", "玉石分判講解"],
  },
  "yushi-fenpan": {
    previous: ["dao-zhi-zungui-ganying.html", "道之尊貴感應"],
    next: ["index.html", "修辦歷程"],
  },
};

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

const renderImage = (image) => `<figure class="journey-inline-figure"><img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" loading="lazy" decoding="async"><figcaption>${escapeHtml(image.caption)}</figcaption></figure>`;

const renderSection = (section, images = []) => {
  const heading = section.source_heading ?? section.title;
  const sectionImages = images.filter((image) => image.after_section === section.id);
  const inlineLinks = (section.links ?? [])
    .map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>`)
    .join(" ");
  const sourceLinks = inlineLinks
    ? `<aside class="journey-inline-links" aria-label="Source links">Source links: ${inlineLinks}</aside>`
    : "";
  return `<section class="journey-chapter" id="${escapeHtml(section.id)}">`
    + `<h2>${escapeHtml(heading)}</h2>${renderParagraphs(section.paragraphs)}${sourceLinks}${sectionImages.map(renderImage).join("")}</section>`;
};

const renderSourceAttribution = (sourceUrl) => `<p class="journey-source-attribution">Source: <a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener">Google Sites source</a></p>`;

const renderArticlePagination = (article) => {
  const navigation = ARTICLE_NAVIGATION[article.slug];
  return `<nav class="article-pagination" aria-label="文章導覽">`
    + `<a class="article-pagination-previous" href="${navigation.previous[0]}">上一篇：${navigation.previous[1]}</a>`
    + `<a class="article-pagination-overview" href="index.html">返回總覽</a>`
    + `<a class="article-pagination-next" href="${navigation.next[0]}">下一篇：${navigation.next[1]}</a></nav>`;
};

const renderArticle = (article) => {
  const toc = article.sections
    .map((section) => `<li><a href="#${escapeHtml(section.id)}">${escapeHtml(section.title)}</a></li>`)
    .join("");
  const sections = `${renderSourceAttribution(article.source_url)}\n${article.sections.map((section) => renderSection(section, article.images ?? [])).join("\n")}`;
  return `<article class="journey-article"><header class="article-header"><p class="journey-kicker">修辦歷程</p><h1>${escapeHtml(article.title)}</h1>`
    + `<p class="verbatim-notice">以下正文依原站逐字保存</p></header>`
    + `<nav class="article-toc" aria-label="文章目錄"><ol>${toc}</ol></nav>`
    + `${sections}${renderArticlePagination(article)}<a id="back-to-top" class="back-to-top" href="#main-content">回到頁首</a></article>`;
};

const renderOverview = (article) => {
  const hero = article.hero;
  const heroPhoto = hero.photo;
  const timeline = article.timeline.map((era) => `<li class="journey-era"><p class="journey-era-title">${escapeHtml(era.title)}</p>${era.events.map((event) => `<p><time>${escapeHtml(event.year_label)}</time>${escapeHtml(event.text)}</p>`).join("")}</li>`).join("");
  const publications = article.publications.map((item) => `<article class="journey-publication-card"><p>${escapeHtml(item.summary)}</p><h3>${escapeHtml(item.title)}</h3><a href="${escapeHtml(item.href)}">閱讀全文</a></article>`).join("");
  const gallery = article.gallery.map((item) => `<figure><img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt)}" loading="lazy" decoding="async"><figcaption>${escapeHtml(item.caption)}</figcaption></figure>`).join("");
  const sources = `${renderSourceAttribution(article.source_url)}\n${article.sections.map((section) => renderSection(section)).join("\n")}`;
  return `<article class="journey-overview"><section class="journey-hero" aria-labelledby="journey-title"><figure><img src="${escapeHtml(heroPhoto.src)}" alt="${escapeHtml(heroPhoto.alt)}"><figcaption>${escapeHtml(heroPhoto.caption)}</figcaption></figure><div><p class="journey-kicker">${escapeHtml(hero.kicker)}</p><h1 id="journey-title">${escapeHtml(article.title)}</h1><p>${escapeHtml(hero.intro)}</p></div></section><section class="journey-timeline" aria-labelledby="timeline-title"><div class="journey-heading"><p class="journey-kicker">時代軸線</p><h2 id="timeline-title">六個修辦階段</h2></div><ol>${timeline}</ol></section><section class="journey-publications" aria-labelledby="publications-title"><div class="journey-heading"><p class="journey-kicker">延伸閱讀</p><h2 id="publications-title">專文典藏</h2></div><div class="journey-publication-grid">${publications}</div></section><section class="journey-gallery" aria-labelledby="gallery-title"><div class="journey-heading"><p class="journey-kicker">典藏影像</p><h2 id="gallery-title">精選照片</h2></div><div class="journey-gallery-grid">${gallery}</div></section><section class="journey-sources" aria-labelledby="sources-title"><div class="journey-heading"><p class="journey-kicker">原文典藏</p><h2 id="sources-title">修辦歷程</h2></div>${sources}</section></article>`;
};

const renderOverviewWithImageAttributes = (article) => renderOverview(article).replace(
  `<img src="${escapeHtml(article.hero.photo.src)}" alt="${escapeHtml(article.hero.photo.alt)}">`,
  `<img src="${escapeHtml(article.hero.photo.src)}" alt="${escapeHtml(article.hero.photo.alt)}" loading="lazy" decoding="async">`,
);

const extractVerbatimParagraphs = (page) => [...page.matchAll(
  /<p data-verbatim="true">([\s\S]*?)<\/p>/g,
)].map((match) => decodeHtml(match[1]));

const sectionDigest = (article, section) => createHash("sha256")
  .update(JSON.stringify([
    section.id,
    section.title,
    section.source_heading ?? section.title,
    section.source_url ?? article.source_url,
    section.paragraphs,
  ]), "utf8")
  .digest("hex");

export async function verifyJourney() {
  const template = await readFile(path.join(JOURNEY_ROOT, "templates", "base.html"), "utf8");
  const stylesheet = await readFile(path.join(JOURNEY_ROOT, "journey.css"), "utf8");
  const script = await readFile(path.join(JOURNEY_ROOT, "journey.js"), "utf8");
  assert.ok(template.includes('<script src="journey.js" defer>'), "base template: progressive-enhancement script is deferred");
  assert.match(
    stylesheet,
    /\.back-to-top\{[^}]*opacity:1;[^}]*pointer-events:auto;/,
    "back-to-top: usable without JavaScript",
  );
  assert.match(
    stylesheet,
    /\.js-enabled \.back-to-top\{[^}]*opacity:0;[^}]*pointer-events:none;/,
    "back-to-top: JavaScript alone enables hidden-until-scroll behavior",
  );
  assert.match(
    stylesheet,
    /\.js-enabled \.back-to-top\.is-visible\{[^}]*opacity:1;[^}]*pointer-events:auto;/,
    "back-to-top: JavaScript restores the scroll-visible control",
  );
  assert.match(script, /root\.classList\.add\("js-enabled"\);/, "journey.js: marks JavaScript enhancement");
  let integrity;
  try {
    integrity = JSON.parse(await readFile(INTEGRITY_FILE, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") assert.fail("source-integrity.json must exist before source content can be verified");
    throw error;
  }
  assert.deepEqual(
    {
      version: integrity.version,
      algorithm: integrity.algorithm,
      encoding: integrity.encoding,
      serialization: integrity.serialization,
      source_page_count: integrity.source_page_count,
    },
    {
      version: 1,
      algorithm: "SHA-256",
      encoding: "UTF-8",
      serialization: INTEGRITY_SERIALIZATION,
      source_page_count: 19,
    },
    "source-integrity.json metadata and serialization contract",
  );
  assert.deepEqual(
    integrity.sources.map((source) => [
      source.data_file,
      source.source_page_count,
      source.sections.map((section) => section.id),
    ]),
    sources.map((source) => [
      source.dataFile,
      source.sourcePageCount,
      source.sections.map(([id]) => id),
    ]),
    "source-integrity.json must cover every expected source page and section in order, with no extras or omissions",
  );
  let paragraphCount = 0;
  let articleSectionCount = 0;

  for (const [sourceIndex, source] of sources.entries()) {
    const article = JSON.parse(await readFile(path.join(DATA_ROOT, source.dataFile), "utf8"));
    article.slug = source.pageFile.replace(/\.html$/, "");
    const integritySource = integrity.sources[sourceIndex];
    assert.equal(typeof article.title, "string", `${source.dataFile}: title`);
    assert.ok(article.title, `${source.dataFile}: non-empty title`);
    assert.equal(typeof article.source_url, "string", `${source.dataFile}: source_url`);
    assert.ok(article.source_url, `${source.dataFile}: non-empty source_url`);
    assert.equal(article.title, integritySource.title, `${source.dataFile}: frozen source title`);
    assert.equal(article.source_url, integritySource.source_url, `${source.dataFile}: frozen source URL`);
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
    assert.deepEqual(
      integritySource.sections,
      article.sections.map((section) => ({
        id: section.id,
        sha256: sectionDigest(article, section),
      })),
      `${source.dataFile}: frozen source-integrity SHA-256 digests`,
    );

    for (const section of article.sections) {
      assert.ok(section.paragraphs.length, `${source.dataFile}/${section.id}: paragraphs`);
      assert.ok(
        section.paragraphs.every((paragraph) => typeof paragraph === "string" && paragraph.length > 0),
        `${source.dataFile}/${section.id}: non-empty paragraph strings`,
      );
    }

    const images = source.dataFile === "overview.json"
      ? [article.hero.photo, ...article.gallery]
      : article.images;
    assert.ok(Array.isArray(images) && images.length, `${source.dataFile}: requires verified local images`);
    const catalogue = await readFile(path.join(JOURNEY_ROOT, "..", "photos", "catalog.csv"), "utf8");
    for (const image of images) {
      assert.equal(typeof image.src, "string", `${source.dataFile}: image source`);
      assert.ok(image.src.startsWith("../photos/"), `${source.dataFile}: image must use a local photos path`);
      assert.ok(!image.src.includes("googleusercontent.com") && !image.src.includes("sites.google.com"), `${source.dataFile}: Google image sources are prohibited`);
      assert.equal(typeof image.alt, "string", `${source.dataFile}: image alt`);
      assert.ok(image.alt.trim(), `${source.dataFile}: image alt cannot be empty`);
      assert.equal(typeof image.caption, "string", `${source.dataFile}: image caption`);
      assert.ok(image.caption.trim(), `${source.dataFile}: image caption cannot be empty`);
      const catalogPath = image.src.replace("../photos/", "");
      assert.ok(catalogue.split("\n").some((line) => line.startsWith(`${catalogPath},`)), `${source.dataFile}: image must be catalogued (${image.src})`);
      await access(path.resolve(JOURNEY_ROOT, image.src));
      if (source.dataFile !== "overview.json") {
        assert.ok(article.sections.some((section) => section.id === image.after_section), `${source.dataFile}: image after_section must name an existing section`);
      }
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
      .replace("{content}", source.dataFile === "overview.json" ? renderOverviewWithImageAttributes(article) : renderArticle(article));
    assert.equal(page, expectedPage, `${source.pageFile}: deterministic generated output`);
    const imageTags = [...page.matchAll(/<img\b[^>]*>/g)].map((match) => match[0]);
    assert.ok(imageTags.length, `${source.pageFile}: expected generated images`);
    for (const image of imageTags) {
      assert.match(image, /\bloading="lazy"/, `${source.pageFile}: image lazy-loads`);
      assert.match(image, /\bdecoding="async"/, `${source.pageFile}: image decodes asynchronously`);
      assert.match(image, /\balt="[^"\n]+"/, `${source.pageFile}: image has readable alt text`);
    }

    if (source.dataFile === "overview.json") {
      for (const region of ["journey-hero", "journey-timeline", "journey-publications", "journey-gallery"]) {
        assert.match(page, new RegExp(`class="[^"]*${region}[^"]*"`), `index.html: ${region} overview region`);
      }
      assert.equal(
        (page.match(/class="journey-era"/g) ?? []).length,
        6,
        "index.html: six visual journey eras",
      );
      for (const href of OVERVIEW_ARTICLES) {
        assert.ok(page.includes(`href="${href}"`), `index.html: publication link ${href}`);
      }
      const imageSources = [...page.matchAll(/<img[^>]+src="([^"]+)"[^>]*>/g)].map((match) => match[1]);
      assert.ok(imageSources.length >= 4, "index.html: at least four local archive images");
      const catalogue = await readFile(path.join(JOURNEY_ROOT, "..", "photos", "catalog.csv"), "utf8");
      for (const sourcePath of imageSources) {
        assert.ok(!/^https?:\/\//.test(sourcePath), `index.html: image must remain local (${sourcePath})`);
        await access(path.resolve(JOURNEY_ROOT, sourcePath));
        const catalogPath = sourcePath.replace("../photos/", "");
        assert.ok(catalogue.split("\n").some((line) => line.startsWith(`${catalogPath},`)), `index.html: image must be catalogued (${sourcePath})`);
      }
    } else {
      assert.match(page, /class="verbatim-notice"/, `${source.pageFile}: verbatim-source notice`);
      assert.match(page, /class="article-pagination"/, `${source.pageFile}: article pagination`);
      assert.match(page, /id="back-to-top"/, `${source.pageFile}: back-to-top anchor`);
      const tocHrefs = [...page.matchAll(/class="article-toc"[\s\S]*?<ol>([\s\S]*?)<\/ol>/g)]
        .flatMap((match) => [...match[1].matchAll(/href="#([^"]+)"/g)].map((href) => href[1]));
      assert.deepEqual(tocHrefs, article.sections.map((section) => section.id), `${source.pageFile}: TOC anchors match every section in order`);
      const navigation = ARTICLE_NAVIGATION[article.slug];
      assert.ok(page.includes(`href="${navigation.previous[0]}"`), `${source.pageFile}: previous article link`);
      assert.ok(page.includes('href="index.html">返回總覽</a>'), `${source.pageFile}: overview link`);
      assert.ok(page.includes(`href="${navigation.next[0]}"`), `${source.pageFile}: next article link`);
    }

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
