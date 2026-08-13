# Requirements Document

## Introduction

MarketPilot needs public legal and support URLs that social-provider reviewers and users can access without owner authentication. The pages must accurately describe the private Quantify Terminal marketing workspace and must not claim unsupported behavior.

## Glossary

- **MarketPilot:** The private marketing operations workspace used for Quantify Terminal.
- **Provider:** An external social, AI, email, media, hosting, or database service.
- **Owner:** The authorized operator of the private MarketPilot workspace.

## Requirements

### Requirement 1: Public Policy URLs

**User Story:** As a provider reviewer, I want stable public policy URLs, so that I can verify the application before granting OAuth access.

#### Acceptance Criteria

1. WHEN a visitor opens `/privacy`, `/terms`, `/data-deletion`, or `/support`, THE SYSTEM SHALL render the page without owner authentication.
2. THE SYSTEM SHALL expose navigation between all four pages and the public home page.
3. THE SYSTEM SHALL provide page-specific metadata and mobile-readable content.

### Requirement 2: Accurate Privacy Disclosure

**User Story:** As a connected-account owner, I want to understand what MarketPilot processes, so that I can make informed privacy decisions.

#### Acceptance Criteria

1. THE privacy page SHALL describe startup profile, campaign, lead, SEO, audit, OAuth-token, and optional media data.
2. THE privacy page SHALL identify relevant infrastructure, AI, email, social, database, and optional media providers.
3. THE privacy page SHALL describe purpose, retention, security, deletion, and non-sale of personal information.
4. THE privacy page SHALL NOT expose secrets or claim that every optional integration is active.

### Requirement 3: Terms and Owner Responsibility

**User Story:** As the workspace owner, I want clear operating terms, so that I understand my responsibilities for AI and provider publishing.

#### Acceptance Criteria

1. THE terms SHALL explain that AI output requires human review and approval.
2. THE terms SHALL require lawful, consent-based marketing and compliance with connected-provider policies.
3. THE terms SHALL describe availability limitations and prohibit unauthorized access or abuse.

### Requirement 4: Data Deletion and Support

**User Story:** As a connected-account owner, I want practical deletion and support instructions, so that I can revoke access and remove stored data.

#### Acceptance Criteria

1. THE deletion page SHALL explain in-product deletion, provider disconnection, provider-side revocation, and support escalation.
2. THE deletion page SHALL distinguish MarketPilot records from content already published to third-party services.
3. THE support page SHALL provide working links for workspace access, system health, and issue reporting.
4. THE support instructions SHALL warn users not to submit credentials or sensitive personal data publicly.
