# Known Limitations

- This fix removes internal editor/control field names from anonymous Next.js public page HTML and hydration payloads. It does not migrate the existing backend published JSON response to a newly named DTO.
- RoomKey remains published-only and uses the clean published render model for display, but its existing client-fetched published endpoint contract is unchanged.
- Hosted verification of the new HTML mapping is not run locally; deployment and hosted source re-smoke are required.
- Draft image storage privacy was not changed or proven by this pass. Existing Media Flow evidence identifies the current draft object posture as public-unlisted rather than private storage.
- Uploads must remain non-sensitive during operator-led pilots.
- Crop and focal point remain outside this public payload hardening scope.
- This is not clearance for paid self-serve or public onboarding.
