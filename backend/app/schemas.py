from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ApiModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class BrandInput(ApiModel):
    startup_name: str = Field(min_length=2, max_length=160)
    website: str = Field(default="", max_length=500)
    description: str = Field(default="", max_length=5000)
    audience: str = Field(default="", max_length=3000)
    offer: str = Field(default="", max_length=3000)
    voice: str = Field(default="Clear, credible, useful", max_length=300)


class BrandOut(BrandInput):
    id: str
    updated_at: datetime


class CampaignInput(ApiModel):
    name: str = Field(min_length=2, max_length=200)
    objective: str = Field(default="Generate qualified demand", max_length=3000)
    channels: list[Literal["x", "linkedin", "instagram", "reddit", "email"]] = Field(
        default_factory=lambda: ["linkedin", "x", "instagram", "reddit"]
    )


class CampaignOut(ApiModel):
    id: str
    name: str
    objective: str
    channel: str
    channels: list[str]
    status: str
    progress: int
    leads: int
    accent: str
    strategy: dict[str, Any]
    created_at: datetime


class ContentOut(ApiModel):
    id: str
    campaign_id: str | None
    type: str
    title: str
    body: str
    time: str
    state: str
    media_url: str
    external_id: str


class PublishInput(ApiModel):
    media_url: str = Field(default="", max_length=1000)
    subreddit: str = Field(default="", max_length=100)


class LeadInput(ApiModel):
    name: str = Field(min_length=2, max_length=160)
    email: str = Field(min_length=5, max_length=320)
    company: str = Field(default="", max_length=200)
    source: str = Field(default="Direct", max_length=100)
    consent: bool = False

    @field_validator("email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        value = value.strip().lower()
        if "@" not in value or value.startswith("@") or value.endswith("@"):
            raise ValueError("A valid email address is required")
        return value


class LeadOut(LeadInput):
    id: str
    score: int
    stage: str
    initials: str
    created_at: datetime


class IntegrationOut(ApiModel):
    provider: str
    status: str
    configured: bool
    account_name: str


class SeoInput(ApiModel):
    url: str = Field(min_length=8, max_length=1000)


class SeoOut(ApiModel):
    id: str
    url: str
    score: int
    issues: list[dict[str, Any]]
    details: dict[str, Any]
    created_at: datetime


class DashboardOut(ApiModel):
    campaigns: list[CampaignOut]
    content: list[ContentOut]
    leads: list[LeadOut]
    integrations: list[IntegrationOut]
    metrics: dict[str, int | float]
