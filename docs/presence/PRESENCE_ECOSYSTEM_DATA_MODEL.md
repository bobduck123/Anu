# Presence Ecosystem Data Model

Migration: `flora-fauna/backend/migrations/versions/20260505_presence_nodes_alpha.sql`.

## Core Tables

- `presence_node`: public identity object with tenant, organisation, owner, slug, status, visibility, type, display mode, plan type, theme, imagery, statements, readiness flags, public contact fields, timestamps.
- `presence_template`: template metadata, display mode, schemas, premium flags, landing/collections/business/professional/tradie support flags.
- `presence_node_section`: reusable content sections.
- `presence_link`: public links/socials.
- `presence_service`: services/offers with problem solved, audience, format, deliverables, pricing, CTA, enquiry type.
- `presence_collection`: work/project collections.
- `presence_work`: selected works with collection linkage, slug, metadata, images, availability, price label.
- `presence_portfolio_item`: simpler portfolio/media blocks.
- `presence_availability_chip`: availability/service chips.
- `presence_business_function`: enabled module flags and extension config.
- `presence_enquiry`: enquiry/deal/quote request intake, source tracking, status, assigned user, privacy hashes.
- `presence_analytics_event`: lightweight privacy-conscious analytics.

## Professional Foundations

- `presence_proof_item`: proof ledger/case study records.
- `presence_credential`: licences, certifications, insurance, public credentials.
- `presence_procurement_profile`: procurement-ready business fields, contract types, regions, insurance, NDA readiness, payment terms.

## Tradie / Field-Service Foundations

- `presence_nfc_tag`: NFC/QR source tags such as business card, van sticker, site sign, service tag.
- `presence_connection`: named relationship ledger records created only after submitted details or admin entry.
- `presence_interaction`: anonymous or named timeline events: NFC scan, QR scan, quote request, quote sent, variation approved, invoice link added, handover created.
- `presence_quote` and `presence_quote_line_item`: quote records and line items.
- `presence_variation`: variation approval foundation.
- `presence_invoice_support`: external invoice link/manual accounting support.
- `presence_work_handover`: before/after, notes, materials, warranty, acceptance foundation.

## Tenancy

`tenant_id` links to existing `node.id`. `organisation_id` is nullable and used as an organisation boundary/readiness linkage. Control API tenant scope uses existing control-plane managed node resolution and owner fallback.
