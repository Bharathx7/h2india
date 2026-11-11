# ADR 0006: Hosting

Status: **Amended** (founder, 11 Nov 2026). Option 2 (the existing server) was chosen instead of AWS. Batch 1 is built and tested locally first; the move to the server comes later.

## Context

Data should stay in India. The product needs a database, Redis, file storage, a search engine, a CDN and logs kept 180 days (CERT-In). The old demo runs on a shared server with an out-of-support operating system.

## Options

1. **AWS Mumbai (ap-south-1)**: ECS Fargate for web, worker and search, RDS PostgreSQL, ElastiCache Redis, S3, CloudFront with WAF, Secrets Manager, CloudWatch, all built with Terraform. GitHub Actions deploys with OIDC (no long-lived keys).
2. One virtual server with Docker Compose (like hy-gen). Cheaper at first, but no managed backups or failover and more manual work.

## Decision

**Founder, 11 Nov 2026: option 2, the existing server**, using Docker Compose as the hy-gen demo does. Before anything goes live, the server must move to a supported operating system (Ubuntu 25.04 no longer gets security updates; Ubuntu 24.04 LTS is suggested). Hosting will be reviewed again before Launch 2, when payments go live.

Originally proposed: option 1 (Doc 2). Staging starts with the smallest sizes and can stop outside working hours. Production sizes come from **M13** (traffic, uptime, budget). The monthly cost is estimated in step 1.7 once M13 is answered.

## Consequences

- An AWS account and a domain are needed for Batch 1 (`docs/vendors.md`).
- Everything is reproducible from `infra/`, and production changes go through the pipeline with your approval.

## How to reverse

Everything runs in standard containers, so moving to another provider means rewriting `infra/`, not the app.

## What changes in the playbook

- Step 1.7 (walking skeleton on staging) waits until the move to the server. It will use Docker Compose and the server's reverse proxy instead of Terraform and AWS.
- Steps 13.1 to 13.3 (production, domain, monitoring) are rewritten for the server when we get there. The rules stay the same: backups with a tested restore, logs kept 180 days in India, a firewall, and deploys only through the pipeline.
- Local development and CI do not change.
