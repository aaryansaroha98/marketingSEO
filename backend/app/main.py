import hmac
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from . import ai, integrations, models, schemas, seo
from .config import get_settings
from .db import Base, engine, get_db

settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    with Session(engine) as db:
        for provider in integrations.PROVIDERS:
            integrations.get_integration(db, provider)
    yield


app = FastAPI(
    title="MarketPilot API",
    version="1.0.0",
    docs_url="/docs" if not settings.production else None,
    redoc_url=None,
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "X-App-Secret"],
)


def authorize(x_app_secret: str = Header(default="")) -> None:
    if not hmac.compare_digest(x_app_secret, settings.app_secret):
        raise HTTPException(401, "Unauthorized")


Auth = Depends(authorize)
Db = Depends(get_db)


@app.get("/health")
def health() -> dict:
    return {"service": "marketpilot-api", "status": "ok", "timestamp": datetime.now(timezone.utc)}


def brand_or_create(db: Session) -> models.BrandProfile:
    brand = db.scalar(select(models.BrandProfile).limit(1))
    if brand is None:
        brand = models.BrandProfile()
        db.add(brand)
        db.commit()
        db.refresh(brand)
    return brand


def content_out(item: models.ContentItem) -> schemas.ContentOut:
    return schemas.ContentOut(
        id=item.id, campaign_id=item.campaign_id, type=item.platform.title(), title=item.title,
        body=item.body, time=item.scheduled_at.isoformat() if item.scheduled_at else "Not scheduled",
        state=item.status, media_url=item.media_url, external_id=item.external_id,
    )


def lead_out(item: models.Lead) -> schemas.LeadOut:
    initials = "".join(part[0].upper() for part in item.name.split()[:2])
    return schemas.LeadOut(**{column: getattr(item, column) for column in ("id", "name", "email", "company", "source", "score", "stage", "consent", "created_at")}, initials=initials)


def integration_out(item: models.Integration) -> schemas.IntegrationOut:
    status = "ready" if item.provider == "brevo" and integrations.configured("brevo", settings) else item.status
    return schemas.IntegrationOut(provider=item.provider, status=status, configured=integrations.configured(item.provider, settings), account_name=item.account_name)


@app.get("/v1/profile", response_model=schemas.BrandOut, dependencies=[Auth])
def get_profile(db: Session = Db):
    return brand_or_create(db)


@app.put("/v1/profile", response_model=schemas.BrandOut, dependencies=[Auth])
def update_profile(payload: schemas.BrandInput, db: Session = Db):
    brand = brand_or_create(db)
    for key, value in payload.model_dump().items():
        setattr(brand, key, value)
    db.add(models.AuditLog(action="profile.updated", entity_type="brand", entity_id=brand.id))
    db.commit()
    db.refresh(brand)
    return brand


@app.get("/v1/dashboard", response_model=schemas.DashboardOut, dependencies=[Auth])
def dashboard(db: Session = Db):
    campaigns = list(db.scalars(select(models.Campaign).order_by(desc(models.Campaign.created_at)).limit(50)))
    content = list(db.scalars(select(models.ContentItem).order_by(desc(models.ContentItem.created_at)).limit(50)))
    leads = list(db.scalars(select(models.Lead).order_by(desc(models.Lead.score), desc(models.Lead.created_at)).limit(100)))
    provider_items = list(db.scalars(select(models.Integration).order_by(models.Integration.provider)))
    return schemas.DashboardOut(
        campaigns=campaigns,
        content=[content_out(item) for item in content],
        leads=[lead_out(item) for item in leads],
        integrations=[integration_out(item) for item in provider_items],
        metrics={
            "campaigns": len(campaigns),
            "qualified_leads": sum(lead.score >= 80 for lead in leads),
            "approved_content": sum(item.status in {"Approved", "Published"} for item in content),
            "connected_channels": sum(integration_out(item).status in {"connected", "ready"} for item in provider_items),
        },
    )


@app.get("/v1/campaigns", response_model=list[schemas.CampaignOut], dependencies=[Auth])
def list_campaigns(db: Session = Db):
    return list(db.scalars(select(models.Campaign).order_by(desc(models.Campaign.created_at))))


@app.post("/v1/campaigns", response_model=schemas.CampaignOut, status_code=201, dependencies=[Auth])
async def create_campaign(payload: schemas.CampaignInput, db: Session = Db):
    brand = brand_or_create(db)
    plan = await ai.build_campaign_plan(payload.name, payload.objective, payload.channels, brand)
    campaign = models.Campaign(name=payload.name, objective=payload.objective, channels=payload.channels, channel="Multi-channel", strategy=plan)
    db.add(campaign)
    db.flush()
    for channel in payload.channels:
        draft = await ai.build_channel_content(channel, plan, brand)
        db.add(models.ContentItem(campaign_id=campaign.id, platform=channel, title=draft["title"], body=draft["body"]))
    db.add(models.AuditLog(action="campaign.created", entity_type="campaign", entity_id=campaign.id, detail={"channels": payload.channels, "generator": plan.get("generated_by")}))
    db.commit()
    db.refresh(campaign)
    return campaign


@app.get("/v1/content", response_model=list[schemas.ContentOut], dependencies=[Auth])
def list_content(db: Session = Db):
    return [content_out(item) for item in db.scalars(select(models.ContentItem).order_by(desc(models.ContentItem.created_at)))]


@app.patch("/v1/content/{content_id}/approve", response_model=schemas.ContentOut, dependencies=[Auth])
def approve_content(content_id: str, db: Session = Db):
    item = db.get(models.ContentItem, content_id)
    if item is None:
        raise HTTPException(404, "Content item not found")
    if item.status == "Published":
        raise HTTPException(409, "Published content cannot be changed back to approved")
    item.status = "Approved"
    db.add(models.AuditLog(action="content.approved", entity_type="content", entity_id=item.id))
    db.commit()
    db.refresh(item)
    return content_out(item)


@app.get("/v1/leads", response_model=list[schemas.LeadOut], dependencies=[Auth])
def list_leads(db: Session = Db):
    return [lead_out(item) for item in db.scalars(select(models.Lead).order_by(desc(models.Lead.score)))]


@app.post("/v1/leads", response_model=schemas.LeadOut, status_code=201, dependencies=[Auth])
def create_lead(payload: schemas.LeadInput, db: Session = Db):
    if db.scalar(select(models.Lead).where(models.Lead.email == payload.email)):
        raise HTTPException(409, "A lead with this email already exists")
    score = 55 + (10 if payload.company else 0) + (10 if payload.consent else 0)
    lead = models.Lead(**payload.model_dump(), score=min(score, 100))
    db.add(lead)
    db.add(models.AuditLog(action="lead.created", entity_type="lead", entity_id=lead.id, detail={"source": lead.source, "consent": lead.consent}))
    db.commit()
    db.refresh(lead)
    return lead_out(lead)


@app.get("/v1/integrations", response_model=list[schemas.IntegrationOut], dependencies=[Auth])
def list_integrations(db: Session = Db):
    return [integration_out(item) for item in db.scalars(select(models.Integration).order_by(models.Integration.provider))]


@app.post("/v1/integrations/{provider}/connect", dependencies=[Auth])
def connect_integration(provider: str, db: Session = Db):
    if provider == "brevo":
        if not integrations.configured("brevo", settings):
            raise HTTPException(409, "BREVO_API_KEY is not configured")
        return {"authorization_url": settings.frontend_url + "/app?connected=brevo"}
    return {"authorization_url": integrations.create_authorization_url(provider, db)}


@app.get("/v1/integrations/{provider}/callback", include_in_schema=False)
async def integration_callback(provider: str, code: str = Query(default=""), state: str = Query(default=""), error: str = Query(default=""), db: Session = Db):
    if error:
        return RedirectResponse(f"{settings.frontend_url}/app?integration_error={provider}")
    await integrations.complete_oauth(provider, code, state, db)
    return RedirectResponse(f"{settings.frontend_url}/app?connected={provider}")


@app.post("/v1/content/{content_id}/publish", response_model=schemas.ContentOut, dependencies=[Auth])
async def publish_content(content_id: str, payload: schemas.PublishInput, db: Session = Db):
    item = db.get(models.ContentItem, content_id)
    if item is None:
        raise HTTPException(404, "Content item not found")
    if item.status != "Approved":
        raise HTTPException(409, "Content must be manually approved before publishing")
    provider = item.platform.lower()
    if provider not in {"x", "linkedin", "instagram", "reddit"}:
        raise HTTPException(400, "This content type cannot be published through a social connector")
    external_id = await integrations.publish_content(provider, item.title, item.body, payload.media_url or item.media_url, payload.subreddit, db)
    item.external_id = external_id
    item.media_url = payload.media_url or item.media_url
    item.status = "Published"
    db.add(models.AuditLog(action="content.published", entity_type="content", entity_id=item.id, detail={"provider": provider, "external_id": external_id}))
    db.commit()
    db.refresh(item)
    return content_out(item)


@app.post("/v1/leads/{lead_id}/follow-up", dependencies=[Auth])
async def follow_up_lead(lead_id: str, db: Session = Db):
    lead = db.get(models.Lead, lead_id)
    if lead is None:
        raise HTTPException(404, "Lead not found")
    if not lead.consent:
        raise HTTPException(409, "This lead has not consented to email communication")
    brand = brand_or_create(db)
    draft = await ai.build_follow_up(lead.name, lead.company, brand)
    message_id = await integrations.send_brevo_email(lead.email, lead.name, draft["subject"], draft["body"])
    lead.last_contacted_at = datetime.now(timezone.utc)
    db.add(models.AuditLog(action="lead.emailed", entity_type="lead", entity_id=lead.id, detail={"provider": "brevo", "message_id": message_id}))
    db.commit()
    return {"status": "sent", "message_id": message_id, "subject": draft["subject"]}


@app.post("/v1/seo/audit", response_model=schemas.SeoOut, dependencies=[Auth])
async def run_seo_audit(payload: schemas.SeoInput, db: Session = Db):
    result = await seo.audit_url(payload.url)
    audit = models.SeoAudit(**result)
    db.add(audit)
    db.add(models.AuditLog(action="seo.audited", entity_type="seo_audit", entity_id=audit.id, detail={"url": result["url"], "score": result["score"]}))
    db.commit()
    db.refresh(audit)
    return audit


@app.get("/v1/seo/latest", response_model=schemas.SeoOut | None, dependencies=[Auth])
def latest_seo_audit(db: Session = Db):
    return db.scalar(select(models.SeoAudit).order_by(desc(models.SeoAudit.created_at)).limit(1))
