# 仁義大仙修辦歷程四頁 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將舊 Google Sites 的修辦歷程及三篇專文逐字移轉成四個可閱讀、可驗證、方便日後製作電子書的靜態網頁。

**Architecture:** 以 `journey/data/*.json` 保存逐字原文及時間軸資料，由 Python 建置器產生四個獨立 HTML，避免人工維護時讓資料檔與頁面內容不同步。四頁共用 `journey/journey.css` 與 `journey/journey.js`，並沿用網站既有共用頁尾；Python 驗證程式負責來源完整度、章節順序、生成頁面、內部連結及本機圖片路徑檢查。

**Tech Stack:** HTML5、CSS3、原生 JavaScript、Python 3 標準函式庫、GitHub Pages

## Global Constraints

- 舊站正文逐字保留；不得修正錯字、潤飾、統一標點或年代寫法。
- 新增的導讀、時間軸、圖片說明及來源標示必須與原文清楚區隔。
- 「道之尊貴感應」十五個項目必須依舊站目錄順序整合於單一頁面。
- 圖片只使用專案內既有檔案，不依賴 Google Sites 圖片網址。
- 無法確認的人物、時間或地點不得自行推測。
- 本階段不製作 PDF，也不修改藏經閣電子書內容。
- 所有文字與檔案使用 UTF-8。
- 保留工作樹中既有且無關的 `fortune/README.md` 修改，不納入任何提交。

---

## File Structure

- Create: `journey/data/overview.json` — 總覽導讀、時間軸與三篇專文卡片資料。
- Create: `journey/data/daofeng-yifan.json` — 「道風彝範」逐字原文與原始來源網址。
- Create: `journey/data/dao-zhi-zungui-ganying.json` — 「道之尊貴感應」十五章逐字原文與來源網址。
- Create: `journey/data/yushi-fenpan.json` — 「玉石分判講解」逐字原文與原始來源網址。
- Create: `journey/build_pages.py` — 驗證資料結構、跳脫文字並生成四頁 HTML。
- Create: `journey/templates/base.html` — 共用頁首、導覽、主內容插槽及頁尾資源。
- Create: `journey/index.html` — 生成的修辦歷程總覽。
- Create: `journey/daofeng-yifan.html` — 生成的「道風彝範」長文頁。
- Create: `journey/dao-zhi-zungui-ganying.html` — 生成的「道之尊貴感應」單一長頁。
- Create: `journey/yushi-fenpan.html` — 生成的「玉石分判講解」長文頁。
- Create: `journey/journey.css` — 四頁專用的典藏版面、時間軸、長文目錄與響應式樣式。
- Create: `journey/journey.js` — 行動導覽、返回頁首及目前章節提示。
- Create: `journey/tests/test_journey.py` — 資料、生成頁、文字順序、連結、圖片與編碼測試。
- Modify: `index.html` — 主導覽新增「修辦歷程」入口，首頁既有時間軸增加完整頁入口。
- Modify: `photos/index.html` — 主導覽新增「修辦歷程」入口。
- Modify: `library/index.html` — 主導覽新增「修辦歷程」入口。
- Modify: `fortune/index.html` — 主導覽新增「修辦歷程」入口。
- Modify: `blessing/index.html` — 主導覽新增「修辦歷程」入口。

---

### Task 1: 建立可驗證的逐字資料模型與建置器

**Files:**
- Create: `journey/data/overview.json`
- Create: `journey/data/daofeng-yifan.json`
- Create: `journey/data/dao-zhi-zungui-ganying.json`
- Create: `journey/data/yushi-fenpan.json`
- Create: `journey/build_pages.py`
- Create: `journey/templates/base.html`
- Create: `journey/tests/test_journey.py`

**Interfaces:**
- Consumes: 四個已核准的 Google Sites 來源頁，以及「道之尊貴感應」目錄所列的全部子頁。
- Produces: 每個專文 JSON 均提供 `title: str`、`source_url: str`、`sections: list[{id: str, title: str, paragraphs: list[str]}]`；`build_pages.py` 提供 `load_article(path)`、`render_article(article)`、`build_all(root)`。

- [ ] **Step 1: 寫入資料結構的失敗測試**

在 `journey/tests/test_journey.py` 建立 `unittest.TestCase`，載入三個專文 JSON，斷言必備欄位存在、段落均為非空字串、章節 ID 唯一，並精確斷言「道之尊貴感應」章名依序為：序文、至孝感天為母添壽、母償債冤魂討命、捨己救人冤鬼退、閻王命案法會審判、開台尊王顯化事蹟、業債附身功德解、人鬼打架功德和息、誠感仙翁顯顏容、佛字墨寶驅邪、古佛騎龍，神鳥引路，暹羅王感恩、蛇精纒身點傳師勸解、佛法奇蹟不可思議、天主教徒求道耶稣顯化、後記。

```python
def test_ganying_has_all_sections_in_source_order(self):
    data = self.load_json("dao-zhi-zungui-ganying.json")
    self.assertEqual(
        [section["title"] for section in data["sections"]],
        EXPECTED_GANYING_TITLES,
    )
    self.assertTrue(all(section["paragraphs"] for section in data["sections"]))
```

- [ ] **Step 2: 執行測試並確認因檔案尚未建立而失敗**

Run: `python -m unittest journey.tests.test_journey -v`

Expected: FAIL，錯誤指出 `journey/data/*.json` 不存在。

- [ ] **Step 3: 逐頁擷取並保存原文**

使用瀏覽器讀取四個使用者指定頁面及「道之尊貴感應」目錄中的每個子頁。將可見正文依原標題、原段落、原標點逐字寫入相應 JSON；不要帶入 Google Sites 導覽列、Skip links、Report abuse 或網站共用頁尾。每個 JSON 的 `source_url` 保存其主來源網址；「道之尊貴感應」各 section 另保存該子頁 `source_url`。

`overview.json` 的時間軸固定採六組：`早年與渡臺`、`聞道與領命`、`建壇與建廟`、`道務拓展`、`海外開荒`、`德範長存`；每筆事件包含 `year_label`、`text`、`source_article`，文字只使用來源已明載的年代與事件。

- [ ] **Step 4: 實作最小建置器與共用模板**

`build_pages.py` 使用 `json`、`html.escape`、`pathlib.Path`。`load_article()` 驗證欄位，`render_article()` 產生頁內目錄與帶 `data-verbatim="true"` 的 section，`build_all()` 生成四頁。模板必須包含 UTF-8 meta、skip link、共用主導覽、`/shared/site-footer.css?v=1` 與 `/shared/site-footer.js?v=1`。

```python
def render_paragraphs(paragraphs):
    return "\n".join(
        f'<p data-verbatim="true">{html.escape(text)}</p>'
        for text in paragraphs
    )

def render_section(section):
    return (
        f'<section class="journey-chapter" id="{html.escape(section["id"])}">'
        f'<h2>{html.escape(section["title"])}</h2>'
        f'{render_paragraphs(section["paragraphs"])}</section>'
    )
```

- [ ] **Step 5: 生成頁面並執行資料測試**

Run: `python journey/build_pages.py`

Expected: 產生四個 HTML，命令退出碼為 0。

Run: `python -m unittest journey.tests.test_journey -v`

Expected: 資料結構及十五章順序測試 PASS。

- [ ] **Step 6: 提交逐字資料與建置基礎**

```powershell
git add -- journey/data journey/templates journey/build_pages.py journey/tests/test_journey.py journey/*.html
git commit -m "feat: archive verbatim journey sources"
```

---

### Task 2: 完成總覽頁與年代時間軸

**Files:**
- Modify: `journey/data/overview.json`
- Modify: `journey/build_pages.py`
- Create: `journey/journey.css`
- Modify: `journey/index.html`
- Modify: `journey/tests/test_journey.py`

**Interfaces:**
- Consumes: Task 1 的 `overview.json` 及 `build_all(root)`。
- Produces: `.journey-hero`、`.journey-timeline`、`.journey-publications`、`.journey-gallery` 四個可獨立驗證的總覽區塊。

- [ ] **Step 1: 寫入總覽頁失敗測試**

測試生成的 `journey/index.html` 含六個時間軸階段、三個正確專文連結、至少四張本機圖片，且所有圖片路徑在專案中存在。

```python
def test_overview_links_to_all_three_articles(self):
    page = (ROOT / "journey/index.html").read_text(encoding="utf-8")
    for href in (
        "daofeng-yifan.html",
        "dao-zhi-zungui-ganying.html",
        "yushi-fenpan.html",
    ):
        self.assertIn(f'href="{href}"', page)
```

- [ ] **Step 2: 執行測試並確認缺少版面區塊而失敗**

Run: `python -m unittest journey.tests.test_journey.JourneyPageTests.test_overview_links_to_all_three_articles -v`

Expected: FAIL，總覽尚未具備完整入口與圖片。

- [ ] **Step 3: 實作總覽生成與典藏樣式**

總覽頁首選用照片目錄中已有明確說明的代表照片；時間軸桌面版左右交錯、760px 以下單欄。專文卡顯示文章名稱、內容定位及「閱讀全文」。精選照片只使用 `photos/catalog.csv` 中已確認的 title/alt，不新增人物推測。

`journey.css` 定義與現有 `styles.css` 相容的色彩變數，並包含 `:focus-visible`、`prefers-reduced-motion`、圖片 `object-fit`、長文最大行寬與響應式規則。

- [ ] **Step 4: 重新生成並執行總覽測試**

Run: `python journey/build_pages.py`

Run: `python -m unittest journey.tests.test_journey -v`

Expected: 全部 PASS。

- [ ] **Step 5: 提交總覽頁**

```powershell
git add -- journey/data/overview.json journey/build_pages.py journey/journey.css journey/index.html journey/tests/test_journey.py
git commit -m "feat: add journey overview timeline"
```

---

### Task 3: 完成三個單頁長文與閱讀導覽

**Files:**
- Modify: `journey/build_pages.py`
- Modify: `journey/templates/base.html`
- Modify: `journey/journey.css`
- Create: `journey/journey.js`
- Modify: `journey/daofeng-yifan.html`
- Modify: `journey/dao-zhi-zungui-ganying.html`
- Modify: `journey/yushi-fenpan.html`
- Modify: `journey/tests/test_journey.py`

**Interfaces:**
- Consumes: Task 1 三個專文 JSON。
- Produces: 每頁 `.article-toc`、`.verbatim-notice`、`.journey-chapter`、`.article-pagination`；`journey.js` 管理 `#back-to-top`、行動選單與目錄目前章節狀態。

- [ ] **Step 1: 寫入長文完整性失敗測試**

使用 `html.parser.HTMLParser` 收集每個 `data-verbatim="true"` 節點文字，依序與 JSON 的全部 paragraphs 做完全相等比較；同時斷言「道之尊貴感應」只有一個 HTML 檔，十五個章節皆在同頁，且目錄 href 與 section id 一一對應。

```python
def test_generated_verbatim_paragraphs_equal_source_json(self):
    for slug, filename in ARTICLE_FILES.items():
        source = self.load_json(filename)
        expected = [p for section in source["sections"] for p in section["paragraphs"]]
        actual = collect_verbatim_text(ROOT / "journey" / f"{slug}.html")
        self.assertEqual(actual, expected)
```

- [ ] **Step 2: 執行測試並確認導覽或逐字比對尚未通過**

Run: `python -m unittest journey.tests.test_journey.JourneyPageTests.test_generated_verbatim_paragraphs_equal_source_json -v`

Expected: FAIL，指出未生成的導覽／正文結構。

- [ ] **Step 3: 實作單欄長文、頁內目錄與文章前後導覽**

每頁顯示「以下正文依原站逐字保存」提示。目錄只使用原標題，不改寫正文。文章順序固定為道風彝範 → 道之尊貴感應 → 玉石分判講解；頁尾提供上一篇、返回總覽、下一篇。`journey.js` 只做漸進增強，停用 JavaScript 時原文與錨點仍可閱讀。

- [ ] **Step 4: 重新生成並執行逐字及導覽測試**

Run: `python journey/build_pages.py`

Run: `python -m unittest journey.tests.test_journey -v`

Expected: 全部 PASS，逐字段落比較無差異。

- [ ] **Step 5: 提交三篇完整專文**

```powershell
git add -- journey/build_pages.py journey/templates/base.html journey/journey.css journey/journey.js journey/*.html journey/tests/test_journey.py
git commit -m "feat: add complete journey articles"
```

---

### Task 4: 加入本機歷史圖片與容錯

**Files:**
- Modify: `journey/data/overview.json`
- Modify: `journey/data/daofeng-yifan.json`
- Modify: `journey/data/dao-zhi-zungui-ganying.json`
- Modify: `journey/data/yushi-fenpan.json`
- Modify: `journey/build_pages.py`
- Modify: `journey/journey.css`
- Modify: `journey/*.html`
- Modify: `journey/tests/test_journey.py`

**Interfaces:**
- Consumes: `photos/catalog.csv` 的 `file`、`title`、`alt` 欄位。
- Produces: JSON 可選 `images: list[{src: str, alt: str, caption: str, after_section: str}]`；生成的 `<img loading="lazy" decoding="async">`。

- [ ] **Step 1: 寫入圖片安全性失敗測試**

斷言所有 `src` 皆以 `../photos/` 開頭、不含 `googleusercontent.com` 或 `sites.google.com`、對應檔案存在、`alt` 非空，且每張長文圖片的 `after_section` 指向現存章節。

- [ ] **Step 2: 執行測試並確認圖片資料尚未完整而失敗**

Run: `python -m unittest journey.tests.test_journey.JourneyImageTests -v`

Expected: FAIL，指出尚未加入或未驗證的圖片資料。

- [ ] **Step 3: 選取並接入已確認圖片**

從 catalog 優先選用天佑宮動土、天佑宮中叩拜、傳題、日本、泰國、印尼正德佛院動土、大陸辦道及人物獨照。caption 只能沿用 catalog 已確認的 title/description；不使用含「待確定」的人物判定作為敘事證據。

- [ ] **Step 4: 實作圖片容錯樣式並重新生成**

圖片容器保留固定比例與背景色；圖片載入失敗不遮蔽正文。所有圖片使用 `loading="lazy"`、`decoding="async"` 與可讀 alt。

Run: `python journey/build_pages.py`

Run: `python -m unittest journey.tests.test_journey -v`

Expected: 全部 PASS。

- [ ] **Step 5: 提交圖片整合**

```powershell
git add -- journey
git commit -m "feat: add verified journey photographs"
```

---

### Task 5: 整合全站導覽

**Files:**
- Modify: `index.html`
- Modify: `photos/index.html`
- Modify: `library/index.html`
- Modify: `fortune/index.html`
- Modify: `blessing/index.html`
- Modify: `journey/tests/test_journey.py`

**Interfaces:**
- Consumes: `/journey/` 公開路徑。
- Produces: 五個主要頁面均有可見且可鍵盤操作的「修辦歷程」連結；首頁既有時間軸提供「閱讀完整修辦歷程」入口。

- [ ] **Step 1: 寫入全站導覽失敗測試**

```python
def test_primary_pages_link_to_journey(self):
    for relative in PRIMARY_PAGES:
        page = (ROOT / relative).read_text(encoding="utf-8")
        self.assertRegex(page, r'href="(?:/journey/|journey/)"[^>]*>修辦歷程</a>')
```

- [ ] **Step 2: 執行測試並確認現有頁面缺少入口**

Run: `python -m unittest journey.tests.test_journey.SiteNavigationTests -v`

Expected: FAIL，列出尚未含修辦歷程入口的頁面。

- [ ] **Step 3: 依各頁現有導覽模式加入入口**

不重構各子站導覽；只在現有 nav 中加入 `/journey/`，並在首頁既有 `#journey` 區塊加入指向完整總覽的文字連結。保持行動選單原有開關行為。

- [ ] **Step 4: 執行全站導覽與完整測試**

Run: `python -m unittest journey.tests.test_journey -v`

Expected: 全部 PASS。

- [ ] **Step 5: 提交全站導覽**

```powershell
git add -- index.html photos/index.html library/index.html fortune/index.html blessing/index.html journey/tests/test_journey.py
git commit -m "feat: link journey pages across site"
```

---

### Task 6: 瀏覽器視覺、響應式與最終驗收

**Files:**
- Modify if required: `journey/journey.css`
- Modify if required: `journey/journey.js`
- Regenerate if required: `journey/*.html`
- Modify: `journey/tests/test_journey.py`

**Interfaces:**
- Consumes: 完成的四頁與全站入口。
- Produces: 桌面與手機均可閱讀的最終頁面，以及可重複執行的驗收結果。

- [ ] **Step 1: 啟動本機靜態伺服器**

Run: `python -m http.server 8000 --directory .`

Expected: `http://localhost:8000/journey/` 可開啟，無 404。

- [ ] **Step 2: 桌面版逐頁驗收**

以 1440×900 檢查四頁：黏性導覽不遮住錨點、時間軸左右交錯、正文行寬舒適、目錄可跳轉、上一篇／下一篇正確、圖片不變形、瀏覽器主控台無錯誤。

- [ ] **Step 3: 手機版逐頁驗收**

以 390×844 檢查四頁：時間軸為單欄、選單可開關、目錄不造成水平捲動、正文不被裁切、返回頁首可鍵盤操作。另啟用 reduced motion，確認無必要動畫。

- [ ] **Step 4: 執行最終自動驗證**

Run: `python journey/build_pages.py`

Run: `python -m unittest journey.tests.test_journey -v`

Run: `git diff --check`

Expected: 建置成功、全部測試 PASS、`git diff --check` 無輸出。確認 `git status --short` 中仍只有本功能檔案與使用者原有的 `fortune/README.md` 修改。

- [ ] **Step 5: 提交驗收修正**

```powershell
git add -- journey
git commit -m "fix: polish journey reading experience"
```

若視覺驗收未產生任何修正，略過此空提交。

