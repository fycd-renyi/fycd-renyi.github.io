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
        content=render_article(overview),
    )
    (journey / "index.html").write_text(page, encoding="utf-8", newline="\n")


if __name__ == "__main__":
    build_all(Path(__file__).resolve().parents[1])
