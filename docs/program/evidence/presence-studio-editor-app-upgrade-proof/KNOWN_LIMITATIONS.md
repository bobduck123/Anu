# Known Limitations

- Hosted migration readiness is not proven in this pass. `backend/migrations/versions/20260523_presence_editable_config.sql` exists locally, but hosted infrastructure still needs migration application verification.
- The editor has an authenticated inline draft preview, but not a full-screen draft renderer route yet.
- The editor works with safe public asset URLs and existing asset selection. It does not yet provide a full upload/crop/transform media workflow.
- Frontend validation mirrors the backend guardrails pragmatically, but it is not generated from a shared schema yet.
- Some GGM style and motion tokens are stored and surfaced before every token is functionally wired in the renderer. Parallax is explicitly disabled/marked not wired.
- The Playwright screenshot proof uses the mock backend and mock auth, not live owner auth.
- The public renderer now consumes published editable config for GGM, but non-GGM renderer-specific config mapping is intentionally out of scope.
- Publish and rollback are explicit and confirmed, but no visual before/after diff is included yet.
