# Hosted Diagnostics

## Owner Debug Surface

After deployment, an authenticated owner can open:

`/studio/11/editor?debug=1`

The owner-only editor displays a small runtime diagnostics panel containing:

- build label: `Canvas Builder V2 / hosted-auth-readiness-stabilization`;
- safe service hostname;
- whether editor data is connected;
- owner session transport mode;
- whether safe owner-read recovery is enabled;
- whether the preview repair is present.

The panel is only mounted within the protected owner editor UI and is hidden in normal use.

## Console Recovery Signal

With `?debug=1`, the client logs safe read-attempt diagnostics for recovered or failed owner reads. Capture the browser console if the hosted first-request issue recurs.

## Do Not Capture

Do not include cookies, bearer tokens, private emails, auth subjects, owner identifiers, raw draft room data, or backend secret environment values in screenshots or copied console output.

## Hosted Observation Record

Deployment verification has not been run for this source state. Record the deployed build label, first-load result, preview result, publish result, and any safe retry log during the re-smoke.
