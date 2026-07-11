#!/usr/bin/env python3
"""Print the commit date (YYYY-MM-DD) of the last change to the homepage
"Right now" section text. Used at deploy time to stamp data-updated onto
the section without touching the source file."""
import re
import subprocess
import sys


def show(commit):
    result = subprocess.run(
        ["git", "show", f"{commit}:index.html"],
        capture_output=True, text=True,
    )
    return result.stdout if result.returncode == 0 else None


def right_now_text(html):
    if not html:
        return None
    match = re.search(r'<div class="right-now"[^>]*>(.*?)</div>', html, re.S)
    if not match:
        return None
    text = re.sub(r"<[^>]+>", " ", match.group(1))
    return re.sub(r"\s+", " ", text).strip()


def main():
    log = subprocess.run(
        ["git", "log", "--format=%H %cs", "--", "index.html"],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    commits = [line.split(" ", 1) for line in log.split("\n") if line]
    if not commits:
        sys.exit("no history for index.html")

    current = right_now_text(show(commits[0][0]))
    if current is None:
        sys.exit("right-now section not found at HEAD")

    last_change_date = commits[0][1]
    for sha, date in commits[1:]:
        if right_now_text(show(sha)) != current:
            break
        last_change_date = date
    print(last_change_date)


if __name__ == "__main__":
    main()
