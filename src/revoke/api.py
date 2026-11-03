import logging
from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import FileResponse
from pathlib import Path
from . import companies as db, dadata, pdf
from .models import StatementRequest
from fastapi.staticfiles import StaticFiles

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="data-revoke")
BY_INN, BY_ALIAS = db.load()

WEB_INDEX = Path(__file__).resolve().parents[2] / "web" / "index.html"
app.mount("/static", StaticFiles(directory=WEB_INDEX.parent), name="static")

@app.get("/")
def index():
    return FileResponse(WEB_INDEX)


@app.get("/companies")
def search(q: str):
    return db.find(q, BY_INN, BY_ALIAS)


@app.get("/companies/{inn}")
def card(inn: str):
    if inn in BY_INN:
        return BY_INN[inn]
    if not db.inn_ok(inn):
        raise HTTPException(422, "неверный ИНН")
    found = dadata.lookup(inn)
    if not found:
        raise HTTPException(404, "компания не найдена")
    return {**found, "status": "unverified"}


@app.post("/statements")
def statement(req: StatementRequest):
    c = BY_INN.get(req.inn)
    if c and c.address:
        to = {"name": c.name, "inn": c.inn, "address": c.address,
              "dpo_email": req.addressee_dpo_email or c.dpo_email}
    elif req.addressee_name and req.addressee_address:
        to = {"name": req.addressee_name, "inn": req.inn,
              "address": req.addressee_address,
              "dpo_email": req.addressee_dpo_email}
    else:
        raise HTTPException(422, "адресат не найден: укажите addressee_name и addressee_address")
    data = pdf.render_pdf(to, req.applicant, req.options)
    return Response(data, media_type="application/pdf",
                    headers={"Content-Disposition": 'attachment; filename="statement.pdf"'})
