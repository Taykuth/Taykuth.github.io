"""Renders the social preview images (assets/img/og-en.png, og-tr.png) from tools/og.html.

Needs Playwright with Chromium and a local server at the repository root:
    python -m http.server 8765 &
    python tools/make_og.py
"""

import asyncio
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent


async def main() -> None:
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx = await browser.new_context(viewport={"width": 1200, "height": 630}, reduced_motion="reduce", color_scheme="light")
        page = await ctx.new_page()
        for lang in ("en", "tr"):
            await page.goto(f"http://127.0.0.1:8765/tools/og.html?lang={lang}", wait_until="networkidle")
            await page.wait_for_timeout(500)
            await page.screenshot(path=str(ROOT / "assets" / "img" / f"og-{lang}.png"))
            print(f"wrote assets/img/og-{lang}.png")
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
