"""Интерактивный подбор юрлиц по брендам через DaData."""
import os, sys, yaml, requests

URL = "https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/party"
HEAD = {"Authorization": f"Token {os.environ['DADATA_TOKEN']}",
        "Content-Type": "application/json"}


def inn_ok(inn: str) -> bool:
    if len(inn) != 10 or not inn.isdigit():
        return False
    k = [2, 4, 10, 3, 5, 9, 4, 6, 8]
    return sum(int(a) * b for a, b in zip(inn, k)) % 11 % 10 == int(inn[9])


def search(brand):
    r = requests.post(URL, headers=HEAD, timeout=15,
                      json={"query": brand, "count": 5,
                            "status": ["ACTIVE"], "type": "LEGAL"})
    r.raise_for_status()
    return [s["data"] for s in r.json()["suggestions"]]


def main(brands_file="data/brands.txt", out="data/companies.yaml"):
    try:
        items = yaml.safe_load(open(out, encoding="utf-8")) or []
    except FileNotFoundError:
        items = []
    known = {a.casefold() for c in items for a in c.get("aliases", [])}

    for brand in (l.strip() for l in open(brands_file, encoding="utf-8")):
        if not brand or brand.casefold() in known:
            continue
        cands = [d for d in search(brand) if inn_ok(d["inn"])]
        print(f"\n== {brand}")
        for i, d in enumerate(cands, 1):
            print(f"{i}. {d['name']['full_with_opf']} | ИНН {d['inn']} | "
                  f"{d['address']['value']}")
        pick = input("номер / Enter пропустить / q выход: ").strip()
        if pick == "q":
            break
        if not pick.isdigit() or not 1 <= int(pick) <= len(cands):
            continue
        d = cands[int(pick) - 1]
        items.append({"inn": d["inn"],
                      "name": d["name"]["full_with_opf"],
                      "address": d["address"]["value"],
                      "aliases": [brand],
                      "status": "draft"})
        with open(out, "w", encoding="utf-8") as f:
            yaml.safe_dump(items, f, allow_unicode=True, sort_keys=False)


if __name__ == "__main__":
    main(*sys.argv[1:])
