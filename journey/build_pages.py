"""Build static journey pages from the verbatim archive data."""

import html
import json
from pathlib import Path


ARTICLE_FILES = {
    "daofeng-yifan": "daofeng-yifan.json",
    "dao-zhi-zungui-ganying": "dao-zhi-zungui-ganying.json",
    "yushi-fenpan": "yushi-fenpan.json",
}


def load_article(path):
    article = json.loads(Path(path).read_text(encoding="utf-8"))
    for field in ("title", "source_url", "sections"):
        if not article.get(field):
            raise ValueError(f"missing {field}: {path}")
    ids = set()
    for section in article["sections"]:
        if not all(section.get(field) for field in ("id", "title", "paragraphs")):
            raise ValueError(f"invalid section: {path}")
        if section["id"] in ids or not all(isinstance(p, str) and p for p in section["paragraphs"]):
            raise ValueError(f"invalid section data: {path}")
        ids.add(section["id"])
    return article


def render_paragraphs(paragraphs):
    return "\n".join(f'<p data-verbatim="true">{html.escape(text)}</p>' for text in paragraphs)


def render_section(section):
    heading = section.get("source_heading", section["title"])
    return (f'<section class="journey-chapter" id="{html.escape(section["id"])}">'
            f'<h2>{html.escape(heading)}</h2>{render_paragraphs(section["paragraphs"])}</section>')


def render_article(article):
    toc = "".join(f'<li><a href="#{html.escape(section["id"])}">{html.escape(section["title"])}</a></li>' for section in article["sections"])
    sections = "\n".join(render_section(section) for section in article["sections"])
    return f'<article><h1>{html.escape(article["title"])}</h1><nav class="article-toc" aria-label="文章目錄"><ol>{toc}</ol></nav>{sections}</article>'


def render_overview(article):
    hero = article["hero"]
    hero_photo = hero["photo"]
    timeline = "".join(
        f'<li class="journey-era"><p class="journey-era-title">{html.escape(era["title"])}</p>'
        + "".join(
            f'<p><time>{html.escape(event["year_label"])}</time>{html.escape(event["text"])}</p>'
            for event in era["events"]
        )
        + "</li>"
        for era in article["timeline"]
    )
    publications = "".join(
        f'<article class="journey-publication-card"><p>{html.escape(item["summary"])}</p>'
        f'<h3>{html.escape(item["title"])}</h3><a href="{html.escape(item["href"])}">閱讀全文</a></article>'
        for item in article["publications"]
    )
    gallery = "".join(
        f'<figure><img src="{html.escape(item["src"])}" alt="{html.escape(item["alt"])}">'
        f'<figcaption>{html.escape(item["caption"])}</figcaption></figure>'
        for item in article["gallery"]
    )
    sources = "\n".join(render_section(section) for section in article["sections"])
    return (
        '<article class="journey-overview">'
        '<section class="journey-hero" aria-labelledby="journey-title">'
        f'<figure><img src="{html.escape(hero_photo["src"])}" alt="{html.escape(hero_photo["alt"])}"><figcaption>{html.escape(hero_photo["caption"])}</figcaption></figure>'
        f'<div><p class="journey-kicker">{html.escape(hero["kicker"])}</p><h1 id="journey-title">{html.escape(article["title"])}</h1><p>{html.escape(hero["intro"])}</p></div>'
        '</section>'
        '<section class="journey-timeline" aria-labelledby="timeline-title"><div class="journey-heading"><p class="journey-kicker">時代軸線</p><h2 id="timeline-title">六個修辦階段</h2></div><ol>'
        f'{timeline}</ol></section>'
        '<section class="journey-publications" aria-labelledby="publications-title"><div class="journey-heading"><p class="journey-kicker">延伸閱讀</p><h2 id="publications-title">專文典藏</h2></div><div class="journey-publication-grid">'
        f'{publications}</div></section>'
        '<section class="journey-gallery" aria-labelledby="gallery-title"><div class="journey-heading"><p class="journey-kicker">典藏影像</p><h2 id="gallery-title">精選照片</h2></div><div class="journey-gallery-grid">'
        f'{gallery}</div></section>'
        '<section class="journey-sources" aria-labelledby="sources-title"><div class="journey-heading"><p class="journey-kicker">原文典藏</p><h2 id="sources-title">修辦歷程</h2></div>'
        f'{sources}</section></article>'
    )


def build_all(root):
    root = Path(root)
    journey = root / "journey"
    template = (journey / "templates" / "base.html").read_text(encoding="utf-8")
    for slug, filename in ARTICLE_FILES.items():
        article = load_article(journey / "data" / filename)
        page = template.format(title=html.escape(article["title"]), content=render_article(article))
        (journey / f"{slug}.html").write_text(page, encoding="utf-8", newline="\n")
    overview = load_article(journey / "data" / "overview.json")
    page = template.format(
        title=html.escape(overview["title"]),
        content=render_overview(overview),
    )
    (journey / "index.html").write_text(page, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    build_all(Path(__file__).resolve().parents[1])
