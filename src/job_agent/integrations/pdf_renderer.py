import re
from pathlib import Path
from fpdf import FPDF

from job_agent.config import settings


def _sanitize_latin1(text: str) -> str:
    """Replace common Unicode punctuation with clean ASCII equivalents for built-in PDF fonts."""
    replacements = {
        "\u2022": "-",
        "\u2013": "-",
        "\u2014": "--",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2192": "->",
        "\u2265": ">=",
    }
    for k, v in replacements.items():
        text = text.replace(k, v)
    return text.encode("latin-1", errors="ignore").decode("latin-1")


def render_markdown_to_pdf(markdown_text: str, output_filename: str) -> Path:
    """
    Renders a tailored Markdown resume into a clean, ATS-parseable PDF in `output/resumes/`.
    """
    output_dir = settings.output_resumes_dir
    output_dir.mkdir(parents=True, exist_ok=True)
    safe_name = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", output_filename)
    if not safe_name.endswith(".pdf"):
        safe_name += ".pdf"
    output_path = output_dir / safe_name

    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    for raw_line in markdown_text.splitlines():
        line = _sanitize_latin1(raw_line.strip())
        if not line:
            pdf.ln(3)
            continue

        if line.startswith("# "):
            pdf.set_font("Helvetica", "B", 16)
            pdf.multi_cell(0, 8, re.sub(r"\*\*|\*", "", line[2:]))
            pdf.ln(1)
        elif line.startswith("## "):
            pdf.ln(2)
            pdf.set_font("Helvetica", "B", 12)
            pdf.multi_cell(0, 7, re.sub(r"\*\*|\*", "", line[3:]).upper())
            pdf.line(10, pdf.get_y(), 200, pdf.get_y())
            pdf.ln(2)
        elif line.startswith("### "):
            pdf.set_font("Helvetica", "B", 11)
            pdf.multi_cell(0, 6, re.sub(r"\*\*|\*", "", line[4:]))
        elif line.startswith("---"):
            pdf.ln(1)
            pdf.line(10, pdf.get_y(), 200, pdf.get_y())
            pdf.ln(2)
        elif line.startswith("* ") or line.startswith("- "):
            pdf.set_font("Helvetica", "", 10)
            clean_bullet = re.sub(r"\*\*|\*", "", line[2:])
            pdf.multi_cell(0, 5.5, f"  - {clean_bullet}")
        else:
            pdf.set_font("Helvetica", "", 10)
            clean_text = re.sub(r"\*\*|\*", "", line)
            pdf.multi_cell(0, 5.5, clean_text)

    pdf.output(str(output_path))
    return output_path

