# Design Document: Public Legal Pages

## Overview

Implement four static Next.js App Router pages backed by one reusable presentation component. Static rendering keeps the URLs fast, indexable, provider-review friendly, and independent from the protected workspace and Render backend.

## Architecture

The public pages remain in the existing Next.js application. They use the root layout and shared stylesheet but do not call the backend. The authentication proxy continues to protect only `/app/**` and `/api/backend/**`.

## Components and Interfaces

- `LegalPage`: accepts `title`, `summary`, and React `children`; renders shared public navigation and legal footer links.
- `/privacy`: renders privacy disclosures and links to deletion/support.
- `/terms`: renders owner, AI-review, provider, and availability responsibilities.
- `/data-deletion`: renders record removal, provider revocation, and escalation instructions.
- `/support`: renders workspace, health, issue-tracker, security, and OAuth guidance.
- Public landing footer: exposes all four stable policy URLs.

## Data Models

No application data model is required. All legal content is static and contains no provider credentials, account identifiers, database values, or user-specific records.

## Correctness Properties

### Property 1: Public accessibility

**Validates: Requirements 1.1, 1.2**

Each required URL renders without an authenticated owner session.

### Property 2: Complete navigation

**Validates: Requirements 1.2**

Every legal page links to the other policy resources and the public home page.

### Property 3: Accurate conditional disclosure

**Validates: Requirements 2.1, 2.4**

Optional media behavior is described conditionally rather than as active functionality.

### Property 4: Safe OAuth guidance

**Validates: Requirements 4.3, 4.4**

OAuth callback instructions never direct users to open callback URLs manually.

## Error Handling

The pages have no network dependency. Standard Next.js not-found behavior handles unknown routes. The system-health link reports its own HTTP status, and the support page offers a separate issue-reporting path.

## Testing Strategy

Run editor diagnostics, TypeScript checking, and a full production build. Confirm the build lists `/privacy`, `/terms`, `/data-deletion`, and `/support` as statically rendered routes.

## Security and Privacy

All content is public and intentionally contains no secrets. External issue links use `rel="noreferrer"`, and the support copy warns against submitting credentials or sensitive personal data.
