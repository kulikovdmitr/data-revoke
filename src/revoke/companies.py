from pathlib import Path
import yaml
from .models import Company

DEFAULT_PATH = Path(__file__).resolve().parents[2] / "data" / "companies.yaml"


def inn_ok(inn: str) -> bool:
    """Контрольная сумма ИНН юрлица (10 цифр)."""
    if len(inn) != 10 or not inn.isdigit():
        return False
    k = [2, 4, 10, 3, 5, 9, 4, 6, 8]
    return sum(int(a) * b for a, b in zip(inn, k)) % 11 % 10 == int(inn[9])


def load(path=DEFAULT_PATH):
    raw = yaml.safe_load(Path(path).read_text(encoding="utf-8")) or []
    items = [Company(**r) for r in raw]
    by_inn: dict[str, Company] = {}
    for c in items:
        if c.inn in by_inn:
            raise ValueError(f"дубль ИНН {c.inn}")
        if not inn_ok(c.inn):
            raise ValueError(f"неверная контрольная сумма ИНН {c.inn} ({c.name})")
        if c.status == "verified" and not c.address:
            raise ValueError(f"verified без адреса: {c.inn}")
        by_inn[c.inn] = c
    by_alias: dict[str, list[Company]] = {}
    for c in items:
        for k in [c.name, *c.aliases]:
            by_alias.setdefault(k.casefold(), []).append(c)
    return by_inn, by_alias


def find(query: str, by_inn, by_alias) -> list[Company]:
    q = query.strip().casefold()
    if not q:
        return []
    if q.isdigit() and q in by_inn:
        return [by_inn[q]]
    if q in by_alias:
        return list({c.inn: c for c in by_alias[q]}.values())
    found = {c.inn: c for k, cs in by_alias.items() if q in k for c in cs}
    return list(found.values())
