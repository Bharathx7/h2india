# ADR 0005: Search

Status: **Accepted** at Gate 0 (founder, 11 Nov 2026).

## Context

One search box finds products, companies, news, schemes and tenders with typo tolerance. Listings need fast filters with counts. The design rule is that **search never shows a price**.

## Options

1. **Meilisearch**, self-hosted in Mumbai. Typo tolerance and facets are built in, and it is simple to run.
2. Typesense. Similar, and also named in Doc 2.
3. PostgreSQL full-text (the hy-gen choice). No typo tolerance, and facets are harder.
4. Amazon OpenSearch. Powerful, but heavier and more expensive to run.

## Decision (proposed)

Option 1. The JavaScript client is 0.63. The engine version is fixed in step 5.2 and must match the client. The index is a copy: changes reach it through an outbox processed by the worker, and the database stays the source of truth.

## Consequences

- The engine needs a persistent volume on AWS (set up in step 1.7).
- Private data (drafts, RFQs, company documents) never goes into the public indexes.

## How to reverse

Indexing goes through one module, so another engine can be swapped in by rewriting that module and re-indexing.
