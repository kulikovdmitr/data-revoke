# data-revoke

Сервис формирует PDF-заявление об отзыве согласия на обработку Персональных данных (ст. 9 152-ФЗ).

## Запуск
```
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env        # вписать DADATA_TOKEN
uvicorn revoke.api:app --reload
pytest
```
Запуск в docker-compose

```
make up-local
```

## Словарь компаний
`data/companies.yaml`. Записи со статусом `draft` внесены по памяти и требуют
сверки по ЕГРЮЛ. После сверки: `status: verified` и `checked_at`.
Подбор новых юрлиц: `python scripts/pick_companies.py data/brands.txt data/companies.yaml`

## API
- `GET /companies?q=...` поиск по имени и алиасам
- `GET /companies/{inn}` карточка (если нет в словаре, запрос в DaData)
- `POST /statements` тело: `{"inn": "...", "applicant": {...}}`, ответ: PDF