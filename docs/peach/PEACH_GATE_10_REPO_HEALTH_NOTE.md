# PEACH Gate 10 Repo Health Note

Date: 2026-07-31

## PEACH-specific status

Focused PEACH backend tests pass:

`python -m pytest tests\test_peach_gate9.py tests\test_peach_gate10.py -q` -> `7 passed in 4.47s`.

Frontend typecheck passes:

`npm run typecheck` -> `tsc --noEmit` completed successfully.

Targeted control proxy test passes:

`npm run test -- src\test\controlProxyRoute.test.ts --run` -> `5 tests passed`.

## Broader backend suite status

The broader backend suite was last run during Gate 9 and is not green:

`3 failed, 334 passed, 953 warnings, 5 errors in 113.39s`.

Known non-PEACH failures/errors:

- `tests/test_presence_setup_request_lifecycle.py::test_create_preview_uses_customisation_snapshot_and_does_not_publish`
- `tests/test_presence_setup_request_lifecycle.py::test_publish_requires_preview_then_makes_public_presence_qr_and_vcard_work`
- `tests/test_presence_setup_request_lifecycle.py::test_archive_preserves_setup_request_and_unpublishes_associated_presence`
- `tests/test_presence_studio_editor_foundation.py` setup errors from `PermissionError: [WinError 5] Access is denied: C:\Users\emadh\AppData\Local\Temp\pytest-of-emadh`
- `tests/test_presence_studio_v3_backend_foundation.py` setup errors from the same temp-directory permission issue

## Release impact

These failures do not block a controlled PEACH internal pilot rehearsal because the focused PEACH mutation, consent, support, steward, and public-read checks pass.

They do block public release because the ANU release train is not broadly green and because some failures involve Presence lifecycle behavior that could affect adjacent launch confidence.

## Recommended owner/gate

Resolve the Presence lifecycle failures in the Presence gate stream before any public PEACH deployment. Resolve the temp-directory permission issue as an environment/test-infra task before relying on full-suite status for release evidence.