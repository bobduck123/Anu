# Before and after

## Before

- The owner landed on a utility dashboard and entered a dense editor without a guided mental model.
- Renderer terms and advanced controls dominated the first view.
- Rooms were primarily chamber tabs rather than an understandable overview.
- Style controls were distributed through technical panels.
- Preview and publish were real and safe, but the owner-facing boundary explanation was light.
- Mobile retained functionality but not a strong narrative hierarchy.

See `00-before-owner-studio.png`.

## After

- Home leads with “Your digital home,” status, live link, dates when available, and safe task-based actions.
- A six-step rail makes the whole journey visible: Home, Rooms, Arrange, Style, Preview, Publish.
- Rooms shows purpose, public piece count, entry room context, selection, and direct arrange actions.
- Arrange retains drag, area selection, size/treatment, guardrails, and mobile fallback controls while using owner language and contextual empty-area prompts.
- Look & Feel groups existing controls into Mood, Background, Texture, Motion, Density, and Accent beside a live room preview.
- Visitor Preview says it is not live and removes editor instrumentation from the rendered room.
- Publish Review presents public content, mobile, privacy, link, entry-room, and rollback checks before handing off to the existing confirmation flow.
- Advanced engine controls remain behind an explicit affordance.

See `01-new-studio-home.png` through `10-mobile-owner-studio.png`.

## Unchanged boundaries

- No API, auth, owner binding, tenant isolation, persistence adapter, or control-plane changes.
- No layout-definition or renderer architecture changes.
- No public route or public renderer changes.
- No automatic publish, hosted mutation, deployment, or production-data change.
- BBB public containment is demonstrated by `11-bbb-public-unchanged.png` and focused assertions that owner/editor instrumentation is absent.
