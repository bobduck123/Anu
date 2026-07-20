# Security Checklist

| Requirement | Status | Proof or note |
| --- | --- | --- |
| Draft privacy | Verified in local tests | Public route does not show changed draft title before publish. |
| Owner-only Studio access | Retained and tested | Existing Studio E2E and backend owner editor tests pass. |
| Authenticated full preview only | Retained | Existing preview route/API boundary is unchanged; preview renders draft mode only after owner flow. |
| Preview marked private/noindex | Retained | Preview UI says `Draft preview not public`; route metadata already marks robots noindex. |
| Public renderer published-only | Wired | Default renderer mode is published; E2E publish boundary passes. |
| RoomKey published-only | Wired | RoomKey explicitly calls published resolver; browser and backend pass-path tests pass. |
| No draft or internal metadata shown publicly | Retained | Provenance is Canvas-only context; the public GGM component receives visible model values only. |
| No unsafe image URLs | Retained and tested | Asset validator unit tests pass for blocked local/internal/script/secret forms and signed-CDN warning path. |
| No raw CSS owner control | Verified by implementation | Controls write curated font IDs, palette hex tokens, style tokens, or live packs. |
| No font binary bundling | Verified by implementation/test | Curated loader returns Google stylesheet URL only when selected. |
| Reduced motion respected | Retained | Runtime reduced-motion handling remains in motion context; authored ceiling is resolved before render. |
| No hard-coded owner identity | Retained | No identity/auth change in this pass. |
| No backend schema drift | Verified by scope | No migrations or backend model changes introduced. |
| No unsupported usable widgets/layouts | Guarded and tested | Pilot widgets filter and live option-pack/layout tests pass. |

## Security Decisions

- The deleted public GGM editable adapter is replaced by the shared resolver, reducing the chance of a draft/public mismatch or silent public-only default.
- The resolver selects draft content only when explicitly requested by authenticated editor/preview flows; published mode ignores draft-status configuration.
- Signed CDN assets continue to be warned about rather than indiscriminately blocked, while secret-like query material remains blocked.
