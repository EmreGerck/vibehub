# VibeHub Documentation — PDF Distribution

Branded PDF versions of the docs/*.md files, suitable for handing to
executives, investors, partners, and new hires.

## What's in here

| PDF | Audience | Pages | When to share |
|---|---|---|---|
| `EXECUTIVE_BRIEF.pdf` | Board, investors, partners, key hires | 22 | First contact with any executive audience |
| `WORKFLOWS.pdf` | PMs, designers, support, QA, exec deep-dives | 26 | When the reader needs every state + every screen |
| `ARCHITECTURE.pdf` | Engineering team, technical advisors | 26 | Technical due diligence, new engineering hires |
| `RUNBOOKS.pdf` | Operations, DevOps, on-call rotation | 14 | Anyone who needs to act on the production system |

**Not exported to PDF (intentional):** `INFRASTRUCTURE.md` — contains
VPS credentials and real secrets. Stays gitignored, local-only.

## How they're built

```bash
cd docs
python3 pdf/_build.py
```

Pipeline:
1. `pdf/_build.py` reads each source `.md`
2. Strips the source's first H1 + lead blockquote (cover page provides them)
3. `pandoc` converts MD → HTML5 with TOC
4. Cover page HTML is injected after `<body>`
5. `weasyprint` renders HTML + `_style.css` → PDF

**Requirements** (installed via `brew`):
- `pandoc` (markdown → HTML)
- `weasyprint` (HTML → PDF)
- `poppler` (provides `pdfinfo` for page counts — auto-pulled by weasyprint)

## Styling

`_style.css` — single brand-aligned stylesheet:
- Dark purple gradient cover with VibeHub wordmark
- Page headers: section title (left), "VibeHub" (right, accent purple)
- Page footers: "Confidential — VibeHub", page X/N, vibehub.com.tr
- Tables: purple header, zebra stripes, page-break-inside avoid
- Code blocks: dark theme, monospace
- Tasteful typography (Inter / system fonts)
- A4 paper size, 22mm top/bottom margins, 18mm left/right

## Updating the PDFs

After any change to the source `.md` files in `docs/`, regenerate the PDFs:

```bash
cd docs && python3 pdf/_build.py
```

Commit the regenerated PDFs alongside the MD changes so the distribution
copies stay in sync with the source of truth.

## File sizes

| File | Size |
|---|---|
| EXECUTIVE_BRIEF.pdf | ~590 KB |
| WORKFLOWS.pdf | ~940 KB |
| ARCHITECTURE.pdf | ~680 KB |
| RUNBOOKS.pdf | ~340 KB |
| **Total bundle** | **~2.6 MB** |

Easy to email or share via Slack/Drive.
