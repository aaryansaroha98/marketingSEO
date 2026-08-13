# Implementation Plan: Public Legal Pages

## Overview

Implement and validate provider-review-ready legal and support URLs for the public MarketPilot frontend.

## Tasks

- [x] 1. Define requirements and provider-review URL scope
  - Document stable routes, accurate disclosures, owner responsibilities, deletion, and support.
- [x] 2. Design a shared static legal-page layout
  - Keep all routes public and independent from backend availability.
- [x] 3. Implement Privacy Policy and Terms pages
  - Include AI, OAuth, provider, retention, security, and owner-review disclosures.
- [x] 4. Implement Data Deletion and Support pages
  - Include revocation, published-content, safe escalation, health, and OAuth guidance.
- [x] 5. Add public footer navigation and responsive styling
  - Link all policy routes from the public landing page.
- [x] 6. Validate TypeScript and the production Next.js build
  - Confirm all required pages are emitted as static routes.
- [x] 7. Commit and push the completed implementation
  - Push only after all validation succeeds.

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2"] },
    { "wave": 3, "tasks": ["3", "4"] },
    { "wave": 4, "tasks": ["5"] },
    { "wave": 5, "tasks": ["6"] },
    { "wave": 6, "tasks": ["7"] }
  ]
}
```

## Notes

The policy pages support provider application review but do not replace correct OAuth configuration. Provider callbacks must be reached through the MarketPilot Connect flow with a valid temporary state.
