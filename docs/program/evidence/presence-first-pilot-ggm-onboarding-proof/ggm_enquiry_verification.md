# GGM Enquiry Verification

- Generated: `2026-05-22T06:50:18Z`
- Result: `pass`
- Summary: `{"pass": 4}`
- Secret values printed: `false`

| Step | Status | Route | HTTP | Latency ms | Shape | Reason |
|---|---|---|---:|---:|---|---|
| `public_room_for_enquiry` | `pass` | `/api/presence/public/ggm-christina-goddard` | 200 | 1628 | True | Public GGM Room exists before enquiry verification. |
| `safe_enquiry_submit` | `pass` | `/api/presence/public/ggm-christina-goddard/enquiries` | 201 | 1573 | True | Enquiry accepted into capture-only fallback handling. |
| `honeypot_validation` | `pass` | `/api/presence/public/ggm-christina-goddard/enquiries` | 400 | 1103 | True | Honeypot payload was rejected safely. |
| `owner_enquiry_storage` | `pass` | `/api/presence/owner/nodes/11/enquiries` | 200 | 1155 | True | Owner inbox includes the durable safe enquiry row. |

## Notes

- Forwarding is proven only when the API reports `sent`; `logged_fallback` proves durable capture with fallback handling.
- This smoke stores a clearly labelled safe enquiry row and avoids visitor PII beyond an example.test smoke address.
