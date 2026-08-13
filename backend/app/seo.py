import ipaddress
import socket
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup
from fastapi import HTTPException


def validate_public_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise HTTPException(400, "A valid public HTTP(S) URL is required")
    try:
        addresses = socket.getaddrinfo(parsed.hostname, None)
        for address in addresses:
            ip = ipaddress.ip_address(address[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
                raise HTTPException(400, "Private or local network URLs are not allowed")
    except socket.gaierror as exc:
        raise HTTPException(400, "Website hostname could not be resolved") from exc
    return url


async def audit_url(url: str) -> dict:
    url = validate_public_url(url)
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=15) as client:
            response = await client.get(url, headers={"User-Agent": "MarketPilotSEO/1.0"})
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(502, f"Website could not be audited: {exc}") from exc

    if "text/html" not in response.headers.get("content-type", ""):
        raise HTTPException(400, "The URL must return an HTML page")
    soup = BeautifulSoup(response.text[:2_000_000], "html.parser")
    issues: list[dict] = []
    score = 100

    def add(issue: str, impact: str, points: int, fix: str) -> None:
        nonlocal score
        score -= points
        issues.append({"issue": issue, "impact": impact, "fix": fix})

    title = soup.title.get_text(strip=True) if soup.title else ""
    description_tag = soup.find("meta", attrs={"name": "description"})
    description = str(description_tag.get("content", "")).strip() if description_tag else ""
    h1_count = len(soup.find_all("h1"))
    canonical = soup.find("link", attrs={"rel": "canonical"})
    viewport = soup.find("meta", attrs={"name": "viewport"})
    images = soup.find_all("img")
    missing_alt = sum(1 for image in images if not image.get("alt"))
    internal_links = 0
    host = urlparse(str(response.url)).hostname
    for anchor in soup.find_all("a", href=True):
        target = urlparse(urljoin(str(response.url), str(anchor["href"])))
        if target.hostname == host:
            internal_links += 1

    if not title:
        add("Page title is missing", "High impact", 15, "Add a unique, descriptive title under 60 characters.")
    elif len(title) > 60:
        add("Page title is longer than 60 characters", "Medium impact", 5, "Rewrite the title so its value is clear before truncation.")
    if not description:
        add("Meta description is missing", "Medium impact", 8, "Add a useful description that earns the click without keyword stuffing.")
    elif len(description) > 160:
        add("Meta description is longer than 160 characters", "Low impact", 3, "Lead with the page benefit and shorten the description.")
    if h1_count != 1:
        add(f"Page has {h1_count} H1 headings", "Medium impact", 8, "Use one clear H1 that matches the primary page purpose.")
    if not canonical:
        add("Canonical URL is missing", "Medium impact", 6, "Add a self-referencing canonical URL.")
    if not viewport:
        add("Mobile viewport declaration is missing", "High impact", 12, "Add a responsive viewport meta tag.")
    if missing_alt:
        add(f"{missing_alt} images are missing alternative text", "Medium impact", min(10, missing_alt * 2), "Add concise alternative text to meaningful images.")
    if internal_links < 3:
        add("Page has very few internal links", "Medium impact", 7, "Link naturally to relevant product and educational pages.")
    if not soup.find("script", attrs={"type": "application/ld+json"}):
        add("No structured data was detected", "Opportunity", 4, "Add valid schema only for entities visible on the page.")

    return {
        "url": str(response.url),
        "score": max(0, score),
        "issues": issues,
        "details": {
            "title": title,
            "description": description,
            "h1_count": h1_count,
            "images": len(images),
            "missing_alt": missing_alt,
            "internal_links": internal_links,
            "status_code": response.status_code,
        },
    }
