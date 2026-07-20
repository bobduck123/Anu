# Root Cause

## Editor API Server Error

V1C introduced `PresenceMediaAsset` as an additive model. The deployed editor
path called `collect_room_assets()` and media hydration helpers on every owner
editor read. Those helpers queried `presence_media_asset` unconditionally.

Production does not automatically create database tables at runtime. If
`20260526_presence_media_flow_v1c_private_draft.sql` has not been applied,
the editor endpoint attempts to read a missing table and returns a server
error before the established V1B room data can render.

The corrective rule is: private-media lifecycle storage is optional until
verified. Its absence may disable V1C, but it must not disable Studio.

## Room Entry 404

The current app retained the token RoomKey route at `/r/[token]`, but it did
not include a frontend route for `/room/[id]/key`. The reported URL therefore
matched no App Router page.

The repair adds a direct published-room entry alias. It resolves published
room content only and supplies no RoomKey token or key attribution.

