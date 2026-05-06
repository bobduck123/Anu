# Presence Ecosystem Integration Roadmap

Alpha stores extension-ready fields and module config. It does not perform external sync unless already part of the wider platform.

## First Wave

- Google Calendar links or availability references.
- Calendly booking links.
- Stripe Payment Links.
- Square payment links.
- Xero invoice link/manual export.
- MYOB/manual export.
- Google Maps links and service area data.
- Google Business Profile link.
- Email notification hooks.
- WhatsApp links.
- Zapier/Make webhook config.

## Second Wave

- ServiceM8.
- Tradify.
- Fergus.
- simPRO.
- AroFlo.
- Jobber.
- QuickBooks.
- Deeper Xero/MYOB sync.

## Third Wave

- Google Reviews.
- Trustpilot if useful.
- LinkedIn/professional association proof.
- Licence lookup where legal and technically appropriate.
- Public archive/directory/map surfaces.
- Marketplace/referral surfaces.

## Storage Pattern

Use `theme_config`, `presence_business_function.config`, service CTA URLs, procurement profile fields, and invoice support external URLs for alpha integration references. Add dedicated tables only when an integration has durable workflow state.
