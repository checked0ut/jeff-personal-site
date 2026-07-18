#!/usr/bin/env python3
"""Render-text diff between HEAD and a base commit for every HTML page.

Informational guard: surfaces any change to the site's visible copy in the
CI job summary so presentation-only changes can never silently eat content.
Exits 0 regardless; the diff is the deliverable."""
import difflib
import os
import re
import subprocess
import sys
from html.parser import HTMLParser

PAGES = [
    "index.html",
    "404.html",
    "projects/ai-for-pms/index.html",
    "projects/squiz/index.html",
    "projects/board-of-advisors/index.html",
    "projects/dumbledore/index.html",
    "projects/this-site/index.html",
]


class TextExtract(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.skip += 1

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self.skip -= 1

    def handle_data(self, data):
        if self.skip == 0:
            self.parts.append(data)


def text_of(html):
    parser = TextExtract()
    parser.feed(html)
    return re.sub(r"\s+", " ", " ".join(parser.parts)).strip()


def show(ref, path):
    result = subprocess.run(
        ["git", "show", f"{ref}:{path}"], capture_output=True, text=True
    )
    return result.stdout if result.returncode == 0 else None


def main():
    base_ref = os.environ.get("BASE_REF", "origin/master")
    merge_base = subprocess.run(
        ["git", "merge-base", base_ref, "HEAD"], capture_output=True, text=True
    )
    base = merge_base.stdout.strip() if merge_base.returncode == 0 else "HEAD~1"

    print(f"## Copy guard\n\nRendered-text diff vs `{base[:12]}`.\n")
    any_change = False
    for page in PAGES:
        new_html = show("HEAD", page)
        old_html = show(base, page)
        if new_html is None:
            print(f"- `{page}`: removed :warning:")
            any_change = True
            continue
        old_words = text_of(old_html).split(" ") if old_html else []
        new_words = text_of(new_html).split(" ")
        if old_words == new_words:
            continue
        any_change = True
        label = "new page" if old_html is None else "copy changed"
        print(f"### `{page}` — {label}\n\n```diff")
        for line in difflib.unified_diff(old_words, new_words, lineterm="", n=3):
            if line.startswith(("---", "+++", "@@")):
                continue
            print(line)
        print("```\n")
    if not any_change:
        print("No visible copy changed. :white_check_mark:")


if __name__ == "__main__":
    main()
