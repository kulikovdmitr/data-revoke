import os
import requests

URL = "https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party"


def lookup(inn: str) -> dict | None:
    """Возвращает наименование и адрес по ИНН либо None."""
    token = os.environ.get("DADATA_TOKEN")
    if not token:
        return None
    r = requests.post(
        URL, timeout=15,
        headers={"Authorization": f"Token {token}", "Content-Type": "application/json"},
        json={"query": inn},
    )
    r.raise_for_status()
    s = r.json().get("suggestions") or []
    if not s:
        return None
    d = s[0]["data"]
    return {
        "inn": d["inn"],
        "name": d["name"]["full_with_opf"],
        "address": d["address"]["value"],
        "state": d.get("state", {}).get("status"),  # ACTIVE / LIQUIDATED ...
    }
