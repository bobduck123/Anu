# Focal Point And Crop Status

## Status

- Focal point: **deferred / not exposed as an active control**.
- Crop: **deferred / not exposed as an active control**.

The render model contains a possible focal-point shape, but the current GGM
view adapter and public image components do not apply that value throughout
Canvas, private preview and public output. Exposing a focal control now would
be a false control and would violate Canvas/public parity.

## Required Next Implementation

- Carry focal coordinates through the selected image usage object.
- Map focal coordinates into the shared render model.
- Apply identical `object-position` behavior to hero and supported work images.
- Add mobile/render parity tests before enabling the control.
- Only consider crop after derivative/image-processing support exists.
