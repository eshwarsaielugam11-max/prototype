#!/usr/bin/env python3
"""Convert Markdown documentation files to clean, professionally-styled PDF documents."""

import os
import re
import markdown
from xhtml2pdf import pisa

DOCS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs")

DOC_FILES = [
    ("PROJECT_WALKTHROUGH.md", "PROJECT_WALKTHROUGH.pdf", "Parkinson's Voice Screening — Technical Project Walkthrough"),
    ("VIVA_PREP.md", "VIVA_PREP.pdf", "Parkinson's Voice Screening — Viva Defense & Technical Q&A Guide"),
    ("ONE_PAGE_SUMMARY.md", "ONE_PAGE_SUMMARY.pdf", "Parkinson's Voice Screening — Executive One-Page Summary"),
]

PDF_CSS = """
@page {
    size: a4 portrait;
    margin: 1.6cm 1.4cm 1.8cm 1.4cm;
}

body {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 9pt;
    line-height: 1.45;
    color: #2d3748;
}

h1 {
    font-size: 16pt;
    font-weight: bold;
    color: #1a202c;
    border-bottom: 2px solid #3182ce;
    padding-bottom: 3pt;
    margin-top: 0pt;
    margin-bottom: 6pt;
}

h2 {
    font-size: 12pt;
    font-weight: bold;
    color: #2b6cb0;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 2pt;
    margin-top: 12pt;
    margin-bottom: 5pt;
}

h3 {
    font-size: 10.5pt;
    font-weight: bold;
    color: #2d3748;
    margin-top: 9pt;
    margin-bottom: 3pt;
}

h4 {
    font-size: 9.5pt;
    font-weight: bold;
    color: #2c5282;
    margin-top: 7pt;
    margin-bottom: 2pt;
}

p {
    margin-top: 2pt;
    margin-bottom: 4pt;
}

ul, ol {
    margin-top: 2pt;
    margin-bottom: 5pt;
    padding-left: 15pt;
}

li {
    margin-bottom: 2pt;
}

strong {
    color: #1a202c;
    font-weight: bold;
}

code {
    font-family: Courier, "Courier New", monospace;
    font-size: 8pt;
    background-color: #edf2f7;
    color: #805ad5;
    padding: 1pt 2pt;
}

pre {
    font-family: Courier, "Courier New", monospace;
    font-size: 7.5pt;
    line-height: 1.2;
    background-color: #f7fafc;
    border: 1px solid #e2e8f0;
    border-left: 3px solid #4299e1;
    padding: 5pt;
    margin-top: 3pt;
    margin-bottom: 5pt;
}

blockquote {
    border-left: 3px solid #dd6b20;
    background-color: #fffaf0;
    padding: 5pt 7pt;
    margin-top: 4pt;
    margin-bottom: 6pt;
    font-size: 8.5pt;
    color: #744210;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 5pt;
    margin-bottom: 7pt;
    font-size: 8pt;
}

th {
    background-color: #ebf8ff;
    color: #2b6cb0;
    font-weight: bold;
    text-align: left;
    padding: 3pt 5pt;
    border: 1px solid #cbd5e0;
}

td {
    padding: 3pt 5pt;
    border: 1px solid #e2e8f0;
}

tr:nth-child(even) td {
    background-color: #f7fafc;
}

hr {
    border: 0;
    border-top: 1px solid #e2e8f0;
    margin-top: 8pt;
    margin-bottom: 8pt;
}
"""


def sanitize_math_for_pdf(text: str) -> str:
    """Replace common LaTeX / KaTeX math notation with readable clean symbols for HTML/PDF rendering."""
    replacements = [
        (r"\\mathbb\{R\}\^\{?B \\times T \\times F\}?", "R^(B x T x F)"),
        (r"\\mathbb\{R\}\^\{?1 \\times 199 \\times 768\}?", "R^(1 x 199 x 768)"),
        (r"\\mathbb\{R\}\^\{?B \\times T' \\times F'\}?", "R^(B x T' x F')"),
        (r"\\mathbb\{R\}\^\{?1 \\times 192 \\times 50 \\times 48\}?", "R^(1 x 192 x 50 x 48)"),
        (r"\\mathbb\{R\}\^\{?1 \\times 50 \\times 256\}?", "R^(1 x 50 x 256)"),
        (r"\\mathbb\{R\}\^\{?1 \\times 256\}?", "R^(1 x 256)"),
        (r"\\mathbb\{R\}\^\{?1 \\times 50\}?", "R^(1 x 50)"),
        (r"\\mathbb\{R\}\^\{?50 \\times 256\}?", "R^(50 x 256)"),
        (r"\\mathbb\{R\}\^\{?9216\}?", "R^9216"),
        (r"\\mathbb\{R\}\^\{?256\}?", "R^256"),
        (r"\\mathbb\{R\}\^\{?50\}?", "R^50"),
        (r"\\mathbb\{R\}\^1", "R^1"),
        (r"\\mathbb\{R\}", "R"),
        (r"\\xrightarrow\{([^\}]+)\}", r" --[\1]--> "),
        (r"\\to", "->"),
        (r"\\approx", "~"),
        (r"\\times", "x"),
        (r"\\le", "<="),
        (r"\\ge", ">="),
        (r"\\pm", "+/-"),
        (r"\\alpha", "alpha"),
        (r"\\sigma", "sigma"),
        (r"\\tilde\{\\alpha\}", "alpha_tilde"),
        (r"\\max", "max"),
        (r"\\min", "min"),
        (r"\\arg\\max", "argmax"),
        (r"\\text\{([^\}]+)\}", r"\1"),
        (r"\\frac\{([^\}]+)\}\{([^\}]+)\}", r"(\1 / \2)"),
        (r"\\sqrt\{([^\}]+)\}", r"sqrt(\1)"),
        (r"\\in", "in"),
        (r"\$([^\$]+)\$", r"\1"),  # Remove remaining single dollar signs
        ("│", "|"),
        ("▼", "v"),
        ("─", "-"),
        ("►", "->"),
        ("┌", "+"),
        ("┐", "+"),
        ("└", "+"),
        ("┘", "+"),
        ("├", "+"),
        ("┤", "+"),
        ("┬", "+"),
        ("┴", "+"),
        ("┼", "+"),
    ]
    for pattern, repl in replacements:
        text = re.sub(pattern, repl, text)
    return text


def convert_md_to_pdf(md_filename: str, pdf_filename: str, doc_title: str):
    md_path = os.path.join(DOCS_DIR, md_filename)
    pdf_path = os.path.join(DOCS_DIR, pdf_filename)

    with open(md_path, "r", encoding="utf-8") as f:
        md_content = f.read()

    sanitized_md = sanitize_math_for_pdf(md_content)
    html_body = markdown.markdown(
        sanitized_md,
        extensions=["tables", "fenced_code", "nl2br", "sane_lists"],
    )

    full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{doc_title}</title>
<style>
{PDF_CSS}
</style>
</head>
<body>
{html_body}
</body>
</html>
"""

    with open(pdf_path, "wb") as pdf_file:
        pisa_status = pisa.CreatePDF(full_html, dest=pdf_file)

    if pisa_status.err:
        print(f"[ERROR] Failed to convert {md_filename} to PDF (code {pisa_status.err})")
    else:
        file_size_kb = os.path.getsize(pdf_path) / 1024
        print(f"[SUCCESS] Generated: {pdf_filename} ({file_size_kb:.1f} KB) at {pdf_path}")


def main():
    print("=" * 80)
    print("Converting Markdown Documentation to PDF Format")
    print("=" * 80)
    for md_file, pdf_file, title in DOC_FILES:
        convert_md_to_pdf(md_file, pdf_file, title)
    print("=" * 80)
    print("All documentation successfully compiled into PDFs!")


if __name__ == "__main__":
    main()
