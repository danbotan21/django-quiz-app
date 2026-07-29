#!/usr/bin/env python3
from __future__ import annotations

import base64
import json
import mimetypes
import random
import re
import shutil
import sys
import time
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / ".auto-987-work"
PARTIAL = WORK / "questions.partial.json"
STAGING = WORK / "images"
OUTPUT = ROOT / "export-output"
OUTPUT_IMAGES = OUTPUT / "images"
EXPECTED = 987
BASE_URL = "https://auto-test.online/test/?category=B&country=md&language=ro&qid={qid}"
TICKET_SIZES = [42, 42, 42] + [41] * 21

DISABLE_DIALOGS = r"""
(() => {
  Object.defineProperty(window, 'alert', { configurable: true, writable: true, value: () => undefined });
  Object.defineProperty(window, 'confirm', { configurable: true, writable: true, value: () => true });
  Object.defineProperty(window, 'prompt', { configurable: true, writable: true, value: () => null });
})();
"""


def clean_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def ticket_for(qid: int) -> tuple[int, int]:
    cursor = 0
    for ticket, size in enumerate(TICKET_SIZES, 1):
        if qid <= cursor + size:
            return ticket, qid - cursor
        cursor += size
    raise ValueError(qid)


def load_items() -> dict[int, dict[str, Any]]:
    if not PARTIAL.exists():
        return {}
    try:
        raw = json.loads(PARTIAL.read_text(encoding="utf-8"))
        return {int(item["id"]): item for item in raw if isinstance(item, dict)}
    except Exception:
        return {}


def write_items(items: dict[int, dict[str, Any]]) -> None:
    WORK.mkdir(parents=True, exist_ok=True)
    tmp = PARTIAL.with_suffix(".tmp")
    tmp.write_text(json.dumps([items[k] for k in sorted(items)], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(PARTIAL)


def image_ext(url: str, content_type: str | None) -> str:
    if content_type:
        mime = content_type.split(";", 1)[0].strip().lower()
        ext = mimetypes.guess_extension(mime)
        if ext:
            return ".jpg" if ext in {".jpe", ".jpeg"} else ext
    suffix = Path(urlparse(url).path).suffix.lower()
    if suffix in {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}:
        return ".jpg" if suffix == ".jpeg" else suffix
    return ".png"


def clear_image(qid: int) -> None:
    for path in STAGING.glob(f"b-{qid:04d}.*"):
        path.unlink(missing_ok=True)


def save_image(context, page, src: str, qid: int) -> str | None:
    if not src or "loading" in src.lower():
        return None
    clear_image(qid)
    if src.startswith("data:"):
        match = re.match(r"^data:([^;,]+)?(?:;base64)?,(.*)$", src, re.S)
        if not match:
            return None
        mime = match.group(1) or "image/png"
        body = base64.b64decode(match.group(2))
        ext = image_ext("", mime)
    else:
        absolute = urljoin(page.url, src)
        response = context.request.get(absolute, headers={"Referer": page.url}, timeout=45_000)
        if not response.ok:
            raise RuntimeError(f"image HTTP {response.status}: {absolute}")
        content_type = response.headers.get("content-type")
        if content_type and not content_type.lower().startswith("image/"):
            raise RuntimeError(f"not an image: {content_type}")
        body = response.body()
        ext = image_ext(absolute, content_type)
    if not body:
        raise RuntimeError("empty image")
    filename = f"b-{qid:04d}{ext}"
    (STAGING / filename).write_bytes(body)
    return f"/questions/auto-test-current/{filename}"


def current_correct(page) -> int | None:
    buttons = page.locator("#answers button")
    for index in range(buttons.count()):
        classes = (buttons.nth(index).get_attribute("class") or "").split()
        if "btn-success" in classes:
            return index
    return None


def reveal_correct(page, count: int) -> int:
    existing = current_correct(page)
    if existing is not None:
        return existing
    for index in range(count):
        buttons = page.locator("#answers button")
        if buttons.count() != count:
            raise RuntimeError("answer count changed")
        try:
            buttons.nth(index).click(timeout=8_000)
            page.wait_for_function(
                "() => [...document.querySelectorAll('#answers button')].some(b => b.classList.contains('btn-success'))",
                timeout=5_000,
            )
        except PlaywrightTimeoutError:
            pass
        found = current_correct(page)
        if found is not None:
            return found
    raise RuntimeError("correct answer was not revealed")


def image_source(page) -> str:
    locator = page.locator("#question_img")
    if not locator.count():
        return ""
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        try:
            src = locator.first.get_attribute("src") or ""
            if src and "loading" not in src.lower():
                return src
            if not locator.first.is_visible():
                return ""
        except Exception:
            return ""
        time.sleep(0.15)
    return ""


def scrape(context, page, qid: int) -> dict[str, Any]:
    url = BASE_URL.format(qid=qid)
    response = None
    try:
        response = page.goto(url, wait_until="domcontentloaded", timeout=70_000)
    except PlaywrightError as exc:
        if "ERR_ABORTED" not in str(exc):
            raise
    if response is not None and response.status >= 400:
        raise RuntimeError(f"page HTTP {response.status}")
    page.wait_for_function(
        """() => {
          const q = document.querySelector('#question_text');
          const a = document.querySelectorAll('#answers button');
          return q && q.textContent.trim().length > 0 && a.length >= 2;
        }""",
        timeout=40_000,
    )
    prompt = clean_text(page.locator("#question_text").inner_text())
    answer_buttons = page.locator("#answers button")
    answers = [clean_text(answer_buttons.nth(i).inner_text()) for i in range(answer_buttons.count())]
    if not prompt or len(answers) < 2 or any(not a for a in answers):
        raise RuntimeError("empty question or answers")
    correct_index = reveal_correct(page, len(answers))
    hint = page.locator("#question_hint")
    explanation = ""
    if hint.count():
        try:
            explanation = clean_text(hint.first.inner_text(timeout=7_000))
        except PlaywrightTimeoutError:
            pass
    src = image_source(page)
    image = save_image(context, page, src, qid) if src else None
    ticket, position = ticket_for(qid)
    item: dict[str, Any] = {
        "id": qid,
        "ticket": ticket,
        "position": position,
        "topic": "Categoria AB/B",
        "prompt": prompt,
        "answers": answers,
        "correctIndex": correct_index,
        "explanation": explanation or "Explicația nu a fost disponibilă pe pagina întrebării.",
        "source": {"provider": "auto-test.online", "sourceId": f"B{qid}", "url": url},
    }
    if image:
        item["image"] = image
    return item


def validate(items: dict[int, dict[str, Any]]) -> None:
    if set(items) != set(range(1, EXPECTED + 1)):
        missing = sorted(set(range(1, EXPECTED + 1)) - set(items))
        raise RuntimeError(f"missing IDs: {missing[:30]}")
    for qid in range(1, EXPECTED + 1):
        item = items[qid]
        answers = item.get("answers")
        correct = item.get("correctIndex")
        if not clean_text(item.get("prompt")):
            raise RuntimeError(f"B{qid}: empty prompt")
        if not isinstance(answers, list) or len(answers) < 2 or any(not clean_text(str(x)) for x in answers):
            raise RuntimeError(f"B{qid}: invalid answers")
        if not isinstance(correct, int) or not 0 <= correct < len(answers):
            raise RuntimeError(f"B{qid}: invalid correctIndex")
        image = item.get("image")
        if image and not (STAGING / Path(str(image)).name).exists():
            raise RuntimeError(f"B{qid}: missing image")


def finalize(items: dict[int, dict[str, Any]]) -> None:
    validate(items)
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    OUTPUT.mkdir(parents=True)
    shutil.copytree(STAGING, OUTPUT_IMAGES)
    (OUTPUT / "questions.json").write_text(
        json.dumps([items[k] for k in sorted(items)], ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (OUTPUT / "metadata.json").write_text(
        json.dumps({"count": EXPECTED, "category": "AB/B", "language": "ro", "country": "md"}, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"COMPLETE {EXPECTED}/{EXPECTED}; images={len(list(OUTPUT_IMAGES.glob('*')))}")


def main() -> int:
    WORK.mkdir(parents=True, exist_ok=True)
    STAGING.mkdir(parents=True, exist_ok=True)
    items = load_items()
    started = time.monotonic()
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-background-networking"])
        context = browser.new_context(
            locale="ro-RO",
            viewport={"width": 1440, "height": 1000},
            ignore_https_errors=True,
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36",
        )
        context.add_init_script(DISABLE_DIALOGS)
        for qid in range(1, EXPECTED + 1):
            if qid in items:
                continue
            last: Exception | None = None
            for attempt in range(1, 6):
                page = None
                try:
                    page = context.new_page()
                    page.set_default_timeout(25_000)
                    items[qid] = scrape(context, page, qid)
                    write_items(items)
                    elapsed = max(time.monotonic() - started, 0.01)
                    rate = max((len(items)) / elapsed, 0.001)
                    eta = (EXPECTED - len(items)) / rate / 60
                    print(f"[{qid:03d}/{EXPECTED}] saved; total={len(items)}; eta={eta:.1f}m", flush=True)
                    last = None
                    break
                except Exception as exc:
                    last = exc
                    print(f"[{qid:03d}] attempt {attempt}/5 failed: {exc}", file=sys.stderr, flush=True)
                    time.sleep(min(attempt * 2, 10) + random.random())
                finally:
                    if page is not None:
                        try:
                            page.close(run_before_unload=False)
                        except Exception:
                            pass
            if last is not None:
                raise RuntimeError(f"B{qid} failed after retries: {last}")
            time.sleep(0.12 + random.random() * 0.12)
        context.close()
        browser.close()
    finalize(items)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
