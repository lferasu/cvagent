# Export Pagination QA Checklist

## Pipeline Confirmation
- PDF export uses Puppeteer HTML print path: `renderCvHtml(...)` -> `page.pdf(...)`.
- DOCX export uses `docx` npm library and programmatic paragraph construction.

## What To Verify Manually
1. Generate a Modern variant and download PDF.
2. Check there is no paragraph cut mid-line across page breaks.
3. Check section headers are not stranded at page bottom (header stays with first content line).
4. Check skills bullets and experience bullets break only between bullets (not inside one bullet line).
5. Download DOCX and open in Word.
6. Turn on paragraph marks and verify heading/paragraph blocks respect keep-with-next behavior.
7. Scroll page boundaries and confirm job heading + first bullet stays together where possible.

## Automated Checks
Run:
- `npm run verify:exports`

Expected:
- Generates artifacts under `server/tmp/export-check/`:
  - `verify-modern.html`
  - `verify-modern.pdf`
  - `verify-modern.docx`
- Verifies HTML includes pagination classes/CSS rules (`break-inside`, `page-break-inside`, `widows/orphans`, semantic block classes).
- Verifies DOCX XML contains `w:keepLines` and `w:keepNext` tags.
