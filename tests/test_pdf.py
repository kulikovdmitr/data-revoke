from revoke.models import Applicant
from revoke import pdf


def test_html_contains_fields():
    a = Applicant(full_name="Иванов Иван Иванович", address="г. Москва, ул. Тестовая, 1")
    html = pdf.render_html("ООО «Тест»", "г. Москва", a)
    assert "Иванов Иван Иванович" in html
    assert "ООО «Тест»" in html
    assert "ст. 9" in html
