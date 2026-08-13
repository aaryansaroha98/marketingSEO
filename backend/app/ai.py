import json
from typing import Any

import httpx

from .config import get_settings
from .models import BrandProfile


CHANNEL_RULES = {
    "x": "Concise, high-signal post under 280 characters with no invented claims.",
    "linkedin": "Insight-led professional post with a clear hook and practical takeaway.",
    "instagram": "Visual-first caption with a short hook, useful body, CTA, and 3-5 relevant hashtags.",
    "reddit": "Community-first, non-promotional discussion that provides value before mentioning the product.",
    "email": "Permission-based helpful email with one clear CTA and no exaggerated claims.",
}


def fallback_plan(name: str, objective: str, channels: list[str], brand: BrandProfile) -> dict[str, Any]:
    audience = brand.audience or "the startup's ideal early customers"
    offer = brand.offer or "a clear, low-friction next step"
    return {
        "summary": f"A focused campaign for {audience} designed to {objective.lower()}.",
        "audience": audience,
        "offer": offer,
        "message": f"Show the practical outcome {brand.startup_name} creates, supported by proof and useful education.",
        "channels": channels,
        "content_pillars": ["Customer problem", "Practical education", "Proof and product", "Founder perspective"],
        "measurement": ["Qualified conversations", "Landing-page conversion", "Email replies", "Attributed pipeline"],
        "campaign_name": name,
    }


def fallback_content(channel: str, plan: dict[str, Any], brand: BrandProfile) -> dict[str, str]:
    audience = plan["audience"]
    offer = plan["offer"]
    title = f"A better way for {audience}"
    body = (
        f"Most {audience} do not need more noise—they need a clearer path to results. "
        f"{brand.startup_name} is building that path around practical value, trustworthy execution, and measurable progress. "
        f"We are sharing what works as we build. If this problem sounds familiar, {offer}."
    )
    if channel == "x":
        body = body[:276]
    if channel == "reddit":
        title = f"What are teams getting wrong about {plan['campaign_name']}?"
    return {"title": title, "body": body}


async def _complete_json(system: str, prompt: str) -> dict[str, Any]:
    settings = get_settings()
    if not settings.ai_api_key:
        raise RuntimeError("AI_API_KEY is not configured")
    payload = {
        "model": settings.ai_model,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        "response_format": {"type": "json_object"},
        "temperature": 0.5,
    }
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{settings.ai_base_url.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {settings.ai_api_key}"},
            json=payload,
        )
        response.raise_for_status()
    content = response.json()["choices"][0]["message"]["content"]
    return json.loads(content)


async def build_campaign_plan(name: str, objective: str, channels: list[str], brand: BrandProfile) -> dict[str, Any]:
    fallback = fallback_plan(name, objective, channels, brand)
    system = (
        "You are a careful startup marketing strategist. Return only valid JSON. "
        "Never invent proof, customers, metrics, or product capabilities. Prefer useful, permission-based marketing."
    )
    prompt = json.dumps({
        "task": "Create a focused campaign strategy",
        "required_keys": ["summary", "audience", "offer", "message", "channels", "content_pillars", "measurement"],
        "campaign": {"name": name, "objective": objective, "channels": channels},
        "brand": {"name": brand.startup_name, "description": brand.description, "audience": brand.audience, "offer": brand.offer, "voice": brand.voice},
    })
    try:
        plan = await _complete_json(system, prompt)
        return {**fallback, **plan, "generated_by": "ai"}
    except (httpx.HTTPError, KeyError, ValueError, RuntimeError, json.JSONDecodeError):
        return {**fallback, "generated_by": "rules"}


async def build_channel_content(channel: str, plan: dict[str, Any], brand: BrandProfile) -> dict[str, str]:
    fallback = fallback_content(channel, plan, brand)
    system = (
        "You write truthful startup marketing. Return JSON with title and body. "
        "Do not invent facts, results, testimonials, scarcity, or claims. " + CHANNEL_RULES[channel]
    )
    prompt = json.dumps({"strategy": plan, "brand": {"name": brand.startup_name, "voice": brand.voice}})
    try:
        content = await _complete_json(system, prompt)
        title = str(content.get("title", fallback["title"]))[:300]
        body = str(content.get("body", fallback["body"]))
        if channel == "x":
            body = body[:280]
        return {"title": title, "body": body}
    except (httpx.HTTPError, KeyError, ValueError, RuntimeError, json.JSONDecodeError):
        return fallback


async def build_follow_up(lead_name: str, company: str, brand: BrandProfile) -> dict[str, str]:
    subject = f"A useful next step from {brand.startup_name}"
    body = (
        f"Hi {lead_name},\n\nThanks for your interest in {brand.startup_name}. "
        f"Based on what you explored, I thought this might be useful: {brand.offer or 'a short conversation about your goals'}.\n\n"
        "If that is relevant, just reply and I will help personally.\n\nBest"
    )
    try:
        result = await _complete_json(
            "Write a concise, permission-based follow-up. Return JSON with subject and body. Never invent facts.",
            json.dumps({"lead": {"name": lead_name, "company": company}, "brand": {"name": brand.startup_name, "offer": brand.offer, "voice": brand.voice}}),
        )
        return {"subject": str(result.get("subject", subject))[:200], "body": str(result.get("body", body))}
    except (httpx.HTTPError, KeyError, ValueError, RuntimeError, json.JSONDecodeError):
        return {"subject": subject, "body": body}
