# Security Checklist

| Control | Status | Evidence |
| --- | --- | --- |
| Anonymous public HTML omits internal editor field names | Passed locally | `presence-public-payload-hygiene.spec.ts` scans both public aliases |
| Draft configuration not passed into public render payload | Passed locally | Published model mapper plus unit test |
| Owner/auth/internal identifiers excluded from public hydration | Passed locally | Allow-listed public node and restricted term source scan |
| Published alt text and images retained | Passed locally | Payload unit test and V1B publish browser flow |
| Published style and motion model retained | Preserved by construction | Shared published render model is passed unchanged except restricted key guard |
| Public unchanged before explicit publish | Passed locally | V1B browser lifecycle |
| Private preview continues to show draft | Passed locally | V1B and preview/publish browser coverage |
| Publish remains explicit | Passed locally | V1B and preview/publish browser coverage |
| RoomKey remains published-only | Passed locally | RoomKey regression and V1B browser coverage |
| Auth/sign-out stability remains intact | Passed locally | Auth sign-out and auth-gate browser coverage |
| Public backend JSON DTO field-name removal | Not in scope | Existing published API compatibility retained |
| Private draft media storage | Not proven | Existing Media Flow limitation; do not use sensitive uploads |

No public preview token route, schema change, authentication weakening, or publish bypass was introduced.
