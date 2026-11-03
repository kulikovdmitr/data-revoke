from datetime import date
from typing import Literal, Optional
from pydantic import BaseModel, Field


class Company(BaseModel):
    inn: str
    name: str
    address: Optional[str] = None
    aliases: list[str] = Field(default_factory=list)
    dpo_email: Optional[str] = None
    slug: Optional[str] = None
    web_site: Optional[str] = None
    revoke_article: Optional[str] = None
    revoke_email: Optional[str] = None
    status: Literal["draft", "verified"] = "draft"
    checked_at: Optional[date] = None


class Applicant(BaseModel):
    full_name: str
    address: str
    email: Optional[str] = None
    phone: Optional[str] = None
    passport: Optional[str] = None  # серия, номер, кем и когда выдан
    relation: Optional[str] = None  # как подтверждается участие в отношениях с оператором
    full_name_gen: Optional[str] = None
    short_name: Optional[str] = None

class Options(BaseModel):
    consents: list[str] = Field(default_factory=list)
    data_text: Optional[str] = None
    # reason_text: Optional[str] = None
    demand_stop: bool = True
    demand_destroy: bool = True
    demand_info: bool = True
    demand_confirmation: bool = True
    reply_by_email: bool = True

class StatementRequest(BaseModel):
    inn: str
    applicant: Applicant
    # если компании нет в словаре, адресат подтверждён пользователем
    # после подсказки из DaData
    addressee_name: Optional[str] = None
    addressee_address: Optional[str] = None
    options: Options = Field(default_factory=Options)
    addressee_dpo_email: Optional[str] = None
