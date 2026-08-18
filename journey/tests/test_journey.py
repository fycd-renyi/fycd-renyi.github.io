"""Python reference tests for the journey data and renderer.

The dependency-free executable verifier is ``verify-journey.mjs``.
"""

import csv
import json
import re
from html.parser import HTMLParser
from pathlib import Path
import unittest

from journey.build_pages import render_article


ROOT = Path(__file__).parents[2]
ARTICLE_FILES = {
    "daofeng-yifan": "daofeng-yifan.json",
    "dao-zhi-zungui-ganying": "dao-zhi-zungui-ganying.json",
    "yushi-fenpan": "yushi-fenpan.json",
}
PRIMARY_PAGES = (
    "index.html",
    "photos/index.html",
    "library/index.html",
    "fortune/index.html",
    "blessing/index.html",
)


class JourneyPageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.verbatim_paragraphs = []
        self.section_ids = []
        self.toc_hrefs = []
        self._paragraph = None
        self._toc_depth = 0

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "p" and attributes.get("data-verbatim") == "true":
            self._paragraph = []
        if tag == "section" and "journey-chapter" in attributes.get("class", ""):
            self.section_ids.append(attributes["id"])
        if tag == "nav" and "article-toc" in attributes.get("class", ""):
            self._toc_depth += 1
        if tag == "a" and self._toc_depth and attributes.get("href", "").startswith("#"):
            self.toc_hrefs.append(attributes["href"][1:])

    def handle_endtag(self, tag):
        if tag == "p" and self._paragraph is not None:
            self.verbatim_paragraphs.append("".join(self._paragraph))
            self._paragraph = None
        if tag == "nav" and self._toc_depth:
            self._toc_depth -= 1

    def handle_data(self, data):
        if self._paragraph is not None:
            self._paragraph.append(data)


class FortuneHeaderParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.children = []
        self._in_header = False
        self._depth = 0

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "header" and attributes.get("class") == "site-header":
            self._in_header = True
            self._depth = 0
            return
        if self._in_header:
            if self._depth == 0:
                self.children.append((tag, attributes))
            self._depth += 1

    def handle_endtag(self, tag):
        if not self._in_header:
            return
        if tag == "header" and self._depth == 0:
            self._in_header = False
        elif self._depth:
            self._depth -= 1


def parse_page(path):
    parser = JourneyPageParser()
    parser.feed(path.read_text(encoding="utf-8"))
    return parser


EXPECTED_GANYING_TITLES = [
    "序文", "至孝感天為母添壽", "母償債冤魂討命", "捨己救人冤鬼退",
    "閻王命案法會審判", "開台尊王顯化事蹟", "業債附身功德解", "人鬼打架功德和息",
    "誠感仙翁顯顏容", "佛字墨寶驅邪", "古佛騎龍，神鳥引路，暹羅王感恩",
    "蛇精纒身點傳師勸解", "佛法奇蹟不可思議", "天主教徒求道耶稣顯化", "後記",
]

EXPECTED_GANYING_SOURCE_HEADINGS = [
    "序文", "至孝感天 為母添壽", "為母償債 冤魂討命", "捨己救人 冤魂退",
    "閻王命案 法會審判", "開台尊王 顯化事蹟", "業障附身 功德解",
    "人鬼打架 功德和息", "誠感仙翁 顯顔容", "佛字墨寶驅邪",
    "古佛騎龍，神鳥引路，暹邏王感恩", "蛇精纏身 點傳師勸解",
    "佛法奇蹟 不可思議", "天主教徒求道耶穌顯化", "後記",
]

EXPECTED_SOURCE_LAYOUT = {
    "daofeng-yifan.json": [
        ("前言", 1),
        ("一大事因緣在人間", 4),
        ("開道歷程之回顧", 9),
        ("道風彝範", 9),
        ("結語", 2),
    ],
    "dao-zhi-zungui-ganying.json": list(zip(EXPECTED_GANYING_TITLES, [
        4, 6, 12, 9, 85, 9, 8, 9, 7, 7, 9, 27, 8, 8, 1,
    ])),
    "yushi-fenpan.json": [
        ("玉石分判 訓中訓", 13),
        ("玉石分判–辛已年冬季大典慈悲講話", 4),
        ("『玉』的訓文", 1),
        ("『石』的訓文", 1),
        ("『分』的訓文", 1),
        ("『判』的訓文", 1),
    ],
}

EXPECTED_OVERVIEW_LAYOUT = [
    ("修辦歷程", 4),
    ("至孝感天　為母添壽", 2),
    ("以身示道  代天宣化 一表誠心以對天", 3),
    ("虔心恆誠 天人共辦", 3),
]


class JourneyDataTests(unittest.TestCase):
    data_dir = Path(__file__).parents[1] / "data"

    def load_json(self, filename):
        return json.loads((self.data_dir / filename).read_text(encoding="utf-8"))

    def test_articles_have_verbatim_data_contract(self):
        for filename in ("daofeng-yifan.json", "dao-zhi-zungui-ganying.json", "yushi-fenpan.json"):
            data = self.load_json(filename)
            self.assertIsInstance(data["title"], str)
            self.assertTrue(data["title"])
            self.assertIsInstance(data["source_url"], str)
            self.assertTrue(data["source_url"])
            ids = [section["id"] for section in data["sections"]]
            self.assertEqual(len(ids), len(set(ids)))
            for section in data["sections"]:
                self.assertTrue(section["title"])
                self.assertTrue(section["paragraphs"])
                self.assertTrue(all(isinstance(paragraph, str) and paragraph for paragraph in section["paragraphs"]))

    def test_ganying_has_all_sections_in_source_order(self):
        data = self.load_json("dao-zhi-zungui-ganying.json")
        self.assertEqual([section["title"] for section in data["sections"]], EXPECTED_GANYING_TITLES)
        self.assertTrue(all(section["paragraphs"] for section in data["sections"]))

    def test_ganying_preserves_page_headings_separately_from_directory_titles(self):
        data = self.load_json("dao-zhi-zungui-ganying.json")
        self.assertEqual(
            [section["source_heading"] for section in data["sections"]],
            EXPECTED_GANYING_SOURCE_HEADINGS,
        )

    def test_kaotai_preserves_inline_source_links_as_metadata(self):
        data = self.load_json("dao-zhi-zungui-ganying.json")
        section = next(item for item in data["sections"] if item["id"] == "kaotai")
        self.assertEqual(section["links"], [
            {
                "label": "勸化鸞音",
                "url": "https://sites.google.com/view/fycd-renyidaxian/%E8%A8%93%E6%96%87/%E7%9B%B8%E9%97%9C%E8%A8%93%E6%96%87/%E5%8B%B8%E5%8C%96%E9%B8%9E%E9%9F%B3?authuser=0",
            },
            {
                "label": "回天有見面",
                "url": "https://sites.google.com/view/fycd-renyidaxian/%E5%A2%A8%E5%AF%B6/%E9%96%8B%E5%8F%B0%E5%B0%8A%E7%8E%8B%E5%80%9F%E7%AB%85%E6%9B%B8?authuser=0",
            },
        ])

    def test_articles_have_every_source_paragraph(self):
        for filename, expected_layout in EXPECTED_SOURCE_LAYOUT.items():
            data = self.load_json(filename)
            actual_layout = [
                (section["title"], len(section["paragraphs"]))
                for section in data["sections"]
            ]
            self.assertEqual(actual_layout, expected_layout, filename)

    def test_overview_preserves_the_complete_source_article(self):
        data = self.load_json("overview.json")
        actual_layout = [
            (section["title"], len(section["paragraphs"]))
            for section in data["sections"]
        ]
        self.assertEqual(actual_layout, EXPECTED_OVERVIEW_LAYOUT)

    def test_render_article_keeps_directory_and_page_headings_distinct(self):
        article = {
            "title": "文章",
            "source_url": "https://example.test/source",
            "sections": [{
                "id": "chapter",
                "title": "目錄章名",
                "source_heading": "原頁標題",
                "paragraphs": ["原文"],
            }],
        }
        rendered = render_article(article)
        self.assertIn('<a href="#chapter">目錄章名</a>', rendered)
        self.assertIn("<h2>原頁標題</h2>", rendered)


class JourneyPageTests(unittest.TestCase):
    data_dir = ROOT / "journey" / "data"

    def load_json(self, filename):
        return json.loads((self.data_dir / filename).read_text(encoding="utf-8"))

    def test_generated_verbatim_paragraphs_equal_source_json(self):
        for slug, filename in ARTICLE_FILES.items():
            source = self.load_json(filename)
            expected = [paragraph for section in source["sections"] for paragraph in section["paragraphs"]]
            actual = parse_page(ROOT / "journey" / f"{slug}.html").verbatim_paragraphs
            self.assertEqual(actual, expected)

    def test_ganying_is_a_single_ordered_page_with_matching_toc_anchors(self):
        self.assertEqual(
            [path.name for path in (ROOT / "journey").glob("*ganying*.html")],
            ["dao-zhi-zungui-ganying.html"],
        )
        source = self.load_json("dao-zhi-zungui-ganying.json")
        page = parse_page(ROOT / "journey" / "dao-zhi-zungui-ganying.html")
        expected_ids = [section["id"] for section in source["sections"]]
        self.assertEqual(len(expected_ids), 15)
        self.assertEqual(page.section_ids, expected_ids)
        self.assertEqual(page.toc_hrefs, expected_ids)

    def test_skip_link_is_hidden_until_keyboard_focus(self):
        """Removing either the off-screen default or focus recovery must expose or lose the skip link."""
        stylesheet = (ROOT / "journey" / "journey.css").read_text(encoding="utf-8")
        hidden_rule = re.search(r"\.skip-link\{([^}]*)\}", stylesheet)
        focused_rule = re.search(r"\.skip-link:focus,\.skip-link:focus-visible\{([^}]*)\}", stylesheet)
        self.assertIsNotNone(hidden_rule)
        self.assertIsNotNone(focused_rule)

        declarations = lambda rule: dict(
            declaration.split(":", 1)
            for declaration in rule.group(1).split(";")
            if declaration
        )
        hidden = declarations(hidden_rule)
        focused = declarations(focused_rule)
        self.assertEqual(
            {name: hidden.get(name) for name in ("position", "left", "width", "height", "overflow")},
            {"position": "absolute", "left": "-10000px", "width": "1px", "height": "1px", "overflow": "hidden"},
        )
        self.assertNotEqual(focused.get("left"), hidden["left"])
        self.assertEqual({name: focused.get(name) for name in ("width", "height")}, {"width": "auto", "height": "auto"})


class JourneyImageTests(unittest.TestCase):
    data_dir = ROOT / "journey" / "data"
    article_data_files = (
        "daofeng-yifan.json",
        "dao-zhi-zungui-ganying.json",
        "yushi-fenpan.json",
    )

    def load_json(self, filename):
        return json.loads((self.data_dir / filename).read_text(encoding="utf-8"))

    def catalog(self):
        with (ROOT / "photos" / "catalog.csv").open(encoding="utf-8", newline="") as source:
            return {row["file"]: row for row in csv.DictReader(source)}

    def test_article_images_are_catalogued_and_anchored_to_sections(self):
        """Removing a local, verified, or valid anchor should reject the article image."""
        catalogue = self.catalog()
        for filename in self.article_data_files:
            article = self.load_json(filename)
            self.assertTrue(article.get("images"), f"{filename}: requires at least one verified image")
            section_ids = {section["id"] for section in article["sections"]}
            for image in article["images"]:
                src = image["src"]
                self.assertTrue(src.startswith("../photos/"), f"{filename}: image must be local ({src})")
                self.assertNotIn("googleusercontent.com", src, f"{filename}: Google image is not permitted")
                self.assertNotIn("sites.google.com", src, f"{filename}: Google Sites image is not permitted")
                catalog_path = src.removeprefix("../photos/")
                self.assertIn(catalog_path, catalogue, f"{filename}: image must be catalogued ({src})")
                self.assertTrue((ROOT / "photos" / catalog_path).is_file(), f"{filename}: image must exist ({src})")
                self.assertEqual(image["alt"], catalogue[catalog_path]["alt"], f"{filename}: catalog alt must be retained")
                self.assertIn(image["caption"], (catalogue[catalog_path]["title"], catalogue[catalog_path]["description"]), f"{filename}: caption must come from the catalog")
                self.assertIn(image["after_section"], section_ids, f"{filename}: image anchor must name an existing section")

    def test_generated_images_are_lazy_asynchronous_and_have_alt_text(self):
        """Dropping an image performance or accessibility attribute should fail page generation checks."""
        for page_name in ("index.html", "daofeng-yifan.html", "dao-zhi-zungui-ganying.html", "yushi-fenpan.html"):
            page = (ROOT / "journey" / page_name).read_text(encoding="utf-8")
            images = re.findall(r"<img\b[^>]*>", page)
            self.assertTrue(images, f"{page_name}: expected generated images")
            for image in images:
                self.assertRegex(image, r'\bloading="lazy"', f"{page_name}: images must lazy-load")
                self.assertRegex(image, r'\bdecoding="async"', f"{page_name}: images must decode asynchronously")
                self.assertRegex(image, r'\balt="[^"\n]+"', f"{page_name}: images need readable alt text")


class SiteNavigationTests(unittest.TestCase):
    def test_primary_pages_link_to_journey(self):
        for relative in PRIMARY_PAGES:
            page = (ROOT / relative).read_text(encoding="utf-8")
            self.assertRegex(page, r'href="(?:/journey/|journey/)"[^>]*>修辦歷程</a>')

    def test_homepage_timeline_links_to_complete_journey(self):
        homepage = (ROOT / "index.html").read_text(encoding="utf-8")
        timeline = re.search(r'<section class="life-section" id="journey">([\s\S]*?)</section>', homepage)
        self.assertIsNotNone(timeline)
        self.assertRegex(timeline.group(1), r'href="/journey/"[^>]*>閱讀完整修辦歷程</a>')

    def test_fortune_header_keeps_navigation_brand_and_language_in_stable_grid_columns(self):
        parser = FortuneHeaderParser()
        parser.feed((ROOT / "fortune/index.html").read_text(encoding="utf-8"))
        self.assertEqual([tag for tag, _ in parser.children], ["nav", "div", "button"])
        self.assertEqual(parser.children[0][1].get("class"), "site-nav-links")
        self.assertEqual(parser.children[1][1].get("class"), "brand")
        self.assertEqual(parser.children[2][1].get("class"), "lang-toggle")

        stylesheet = (ROOT / "fortune/style.css").read_text(encoding="utf-8")
        self.assertRegex(stylesheet, r'\.site-nav-links\s*\{[^}]*display:\s*flex;[^}]*justify-self:\s*start;')
        self.assertRegex(stylesheet, r'\.brand\s*\{[^}]*grid-column:\s*2;[^}]*justify-self:\s*center;')
        self.assertRegex(stylesheet, r'\.lang-toggle\s*\{[^}]*grid-column:\s*3;[^}]*justify-self:\s*end;')
