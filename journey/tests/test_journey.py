"""Data-contract reference tests for environments that provide Python.

The executable test is journey-data.browser-test.html because the active shell
does not provide a Python runtime.
"""

import json
from pathlib import Path
import unittest

from journey.build_pages import render_article


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
    "daofeng-yifan.json": [("道風彝範", 25)],
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
