# Known Limitations

- **Upload:** No draft-scoped device upload endpoint is available in this pass. Canvas offers existing room, attached, and live-room image choices; advanced safe image links remain secondary. The UI states the limitation honestly.
- **Crop:** No crop control exists. It is not simulated.
- **Focal point:** No focal-point positioning exists. It is not simulated.
- **Mobile drag:** Mobile editing and move-up/move-down reorder are implemented with touch-sized controls. Free touch dragging is not claimed complete; HTML drag remains a desktop convenience.
- **Advanced editor remainder:** Asset attachment administration, detailed RoomKey/enquiry posture, history/restore, broad scene metadata, and staff/power-user settings remain in Advanced controls.
- **GGM specificity:** Enabled text-style, palette, and motion presets are wired to the GGM faithful renderer. Other room types show those renderer-specific options as unavailable rather than pretending they work.
- **Hosted proof:** Build, fixture-backed browser proof, and backend contract tests ran locally. No hosted deployment, hosted database migration, or production-domain verification was run in this pass.
- **Paid pilots:** This is not ready for paid self-serve pilots until draft-scoped upload/crop/focal workflows, hosted proof, and the required renderer coverage for the paid cohort are complete.

Additional boundaries:

- The image link option warns and requires confirmation for expiring signed CDN links; new image upload should replace this as the normal expansion path.
- Work edits that begin from renderer/live fallback imagery require bringing those images into the draft room first, preserving explicit owner control.
- Contextual chips cover directly repairable Canvas surfaces; staff-only routing and history concerns continue to be handled in Advanced controls.
