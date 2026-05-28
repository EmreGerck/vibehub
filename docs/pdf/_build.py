#!/usr/bin/env python3
"""Build branded PDFs from each docs/*.md file using pandoc → weasyprint."""

import re
import subprocess
import sys
from datetime import date
from pathlib import Path

HERE = Path(__file__).resolve().parent
DOCS = HERE.parent
CSS = HERE / "_style.css"

# (source.md, Title, Subtitle, Audience)
ENTRIES = [
    (
        "EXECUTIVE_BRIEF.md",
        "Executive Brief",
        "Business strategy, market positioning, and roadmap",
        "Board, investors, partners, key hires",
    ),
    (
        "WORKFLOWS.md",
        "Workflow Reference",
        "Every user-facing flow, screen, and state transition",
        "Product managers, designers, support, QA",
    ),
    (
        "ARCHITECTURE.md",
        "Platform Architecture",
        "Engineering reference for the VibeHub platform",
        "Engineering team, technical advisors",
    ),
    (
        "RUNBOOKS.md",
        "Operator Runbooks",
        "Step-by-step procedures for operational tasks",
        "Operations, DevOps, on-call rotation",
    ),
]

TODAY = date.today().isoformat()


def cover_html(title: str, subtitle: str, audience: str, source: str) -> str:
    return f"""<div class="cover">
  <div class="cover-brand-row">
    <span class="cover-brand-dot"></span>
    <span class="cover-brand">VibeHub</span>
  </div>
  <div class="cover-accent-bar"></div>
  <div class="cover-tagline">Türkiye'nin sanatçı odaklı merch pazaryeri</div>

  <div class="cover-mid">
    <div class="cover-title">{title}</div>
    <div class="cover-subtitle">{subtitle}</div>
    <div class="cover-meta">
      <div><strong>Audience</strong> &nbsp;·&nbsp; {audience}</div>
      <div><strong>Date</strong> &nbsp;·&nbsp; {TODAY}</div>
      <div><strong>Source</strong> &nbsp;·&nbsp; docs/{source}</div>
    </div>
  </div>

  <div class="cover-footer">
    Confidential — VibeHub. Do not distribute without permission.<br/>
    vibehub.com.tr &nbsp;·&nbsp; api.vibehub.com.tr
  </div>
</div>
"""


def build(src: str, title: str, subtitle: str, audience: str) -> Path | None:
    src_path = DOCS / src
    out_pdf = HERE / src.replace(".md", ".pdf")
    tmp_html = HERE / f"_{src.replace('.md', '.html')}"

    if not src_path.exists():
        print(f"   ✗ source not found: {src_path}")
        return None

    # 1. Preprocess MD: strip the source's first H1 + its lead blockquote.
    #    The cover page already serves as the title; the blockquote with
    #    "Document audience / Last updated / Companion documents" is replaced
    #    by the same info on the cover page metadata. Result: TOC + content
    #    start cleanly with the first H2 section.
    md = src_path.read_text(encoding="utf-8")
    md = re.sub(r'^# .+?\n', '', md, count=1, flags=re.MULTILINE)
    # Drop the immediately-following lead blockquote (if present)
    md = re.sub(r'\A\s*(>.*\n)+\s*', '', md, count=1)

    # 2. pandoc: md → html5 (standalone, with TOC)
    pandoc_html = subprocess.run(
        [
            "pandoc",
            "--from", "gfm",
            "--to", "html5",
            "--standalone",
            "--metadata", f"title={title}",
            "--css", "_style.css",
            "--table-of-contents",
            "--toc-depth=2",
            "-V", "lang=en",
        ],
        input=md,
        check=True, capture_output=True, text=True,
    ).stdout

    # 3. Strip pandoc's auto-generated title H1 (cover page provides title)
    pandoc_html = re.sub(
        r'<header[^>]*id="title-block-header"[^>]*>.*?</header>',
        '',
        pandoc_html,
        count=1,
        flags=re.DOTALL,
    )
    pandoc_html = re.sub(
        r'<h1 class="title"[^>]*>.*?</h1>',
        '',
        pandoc_html,
        count=1,
        flags=re.DOTALL,
    )

    # 4. Add a "Contents" heading before the TOC + force page break after
    pandoc_html = pandoc_html.replace(
        '<nav id="TOC"',
        '<h1 class="toc-heading">Contents</h1><nav id="TOC"',
        1,
    )

    # 5. Inject cover page right after <body>
    cover = cover_html(title, subtitle, audience, src)
    pandoc_html = pandoc_html.replace("<body>", f"<body>{cover}", 1)
    tmp_html.write_text(pandoc_html, encoding="utf-8")

    # 3. weasyprint: html → pdf
    subprocess.run(
        [
            "weasyprint",
            str(tmp_html), str(out_pdf),
            "--stylesheet", str(CSS),
            "--base-url", str(HERE),
        ],
        check=True, capture_output=True, text=True,
    )

    tmp_html.unlink()
    return out_pdf


def page_count(pdf: Path) -> str:
    """Use pdfinfo (from poppler — pulled in by weasyprint)."""
    try:
        out = subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True, check=True).stdout
        for line in out.splitlines():
            if line.startswith("Pages:"):
                return line.split(":", 1)[1].strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass
    return "?"


def size_human(path: Path) -> str:
    n = path.stat().st_size
    for unit in ("B", "KB", "MB"):
        if n < 1024:
            return f"{n:.1f}{unit}"
        n /= 1024
    return f"{n:.1f}GB"


def main() -> int:
    rc = 0
    print(f"Building PDFs in {HERE}\n")
    for src, title, subtitle, audience in ENTRIES:
        print(f"→ {src}")
        try:
            pdf = build(src, title, subtitle, audience)
            if pdf and pdf.exists():
                print(f"   ✓ {pdf.name}  ·  {size_human(pdf)}  ·  {page_count(pdf)} pages")
            else:
                print(f"   ✗ failed")
                rc = 1
        except subprocess.CalledProcessError as e:
            print(f"   ✗ exit {e.returncode}")
            if e.stderr:
                print("   stderr:", e.stderr[:500])
            rc = 1
    print()
    pdfs = sorted(HERE.glob("*.pdf"))
    if pdfs:
        print("PDFs ready:")
        for p in pdfs:
            print(f"  {p}")
    return rc


if __name__ == "__main__":
    sys.exit(main())
