from datetime import date
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape

TPL_DIR = Path(__file__).parent / "templates"
_env = Environment(loader=FileSystemLoader(TPL_DIR),
                   autoescape=select_autoescape(["html"]))


def render_html(to: dict, applicant, options, today: str | None = None) -> str:
    return _env.get_template("revoke_consent.html").render(
        to=to, a=applicant, o=options, today=today)


def render_pdf(to: dict, applicant, options, today: str | None = None) -> bytes:
    from weasyprint import HTML
    html = render_html(to, applicant, options, today)
    return HTML(string=html, base_url=str(TPL_DIR)).write_pdf()
