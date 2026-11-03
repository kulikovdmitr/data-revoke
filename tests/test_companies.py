from pathlib import Path
import pytest
from revoke import companies as db

FIX = Path(__file__).parent / "fixtures" / "companies.yaml"


def test_inn_checksum():
    assert db.inn_ok("7707083893")
    assert not db.inn_ok("7707083894")
    assert not db.inn_ok("123")


def test_load_and_find_alias():
    by_inn, by_alias = db.load(FIX)
    assert db.find("Сбер", by_inn, by_alias)[0].inn == "7707083893"
    assert db.find("7707083893", by_inn, by_alias)[0].name == "ПАО Сбербанк"


def test_find_dedup():
    by_inn, by_alias = db.load(FIX)
    res = db.find("банк", by_inn, by_alias)
    assert len({c.inn for c in res}) == len(res)


def test_invalid_inn_rejected(tmp_path):
    p = tmp_path / "c.yaml"
    p.write_text('- inn: "1234567890"\n  name: X\n  address: Y\n', encoding="utf-8")
    with pytest.raises(ValueError):
        db.load(p)
