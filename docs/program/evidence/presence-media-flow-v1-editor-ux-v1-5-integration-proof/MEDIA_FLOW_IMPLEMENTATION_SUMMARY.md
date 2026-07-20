# Media Flow Implementation Summary

## V1A Live Capability

`MediaDrawer` is the primary normal-owner image workflow. It opens from Images mode and from the Canvas selected-image action.

It supports:

- choosing a target role in owner language, including Cover image and Work in the wall,
- choosing supported existing room images,
- viewing additional Live room images where available,
- replacing the selected draft image,
- editing and saving alt text,
- bringing live-room images into an empty draft where the existing canonical sync is available.

All mutations use the same Canvas draft commit function already used by the shared-render-model editor. The live room is unchanged until explicit publish.

## Not Implemented

- Device upload is displayed as `Upload coming soon`.
- Crop is not available.
- Focal point is not available.
- Raw public URL input is not part of the normal owner flow.

The Kimi candidate's simulated uploader and proposed API handlers were rejected because they do not prove compatibility with the existing draft save/publish boundary.

