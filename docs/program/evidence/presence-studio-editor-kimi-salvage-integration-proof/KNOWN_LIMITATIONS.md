# Known Limitations

- Hosted owner-auth verification was not run in this pass.
- Screenshots use mock owner auth and mock backend responses, not live hosted GGM owner credentials.
- File upload/crop/focal point editing is not implemented in the editor because the existing media upload endpoint mutates live node/work media rather than draft-scoped editor assets.
- Broken remote asset detection is image-load based in the UI; there is no async server-side link/image checker in this pass.
- Style/motion controls that are not renderer-visible are disabled or labelled coming soon.
- Room DNA presets are limited to GGM renderer-visible tokens and are not a universal preset system for non-GGM rooms.
- Full-screen draft preview renders the owner-authenticated draft in the Studio route; it is not a public preview route and should not be shared with guests.
- Backend and frontend validation still duplicate some rules rather than sharing a generated schema.
- Non-GGM editable renderer mapping remains out of scope.
