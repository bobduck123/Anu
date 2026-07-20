# Standard Editor Proof

## Automated Assertions

The sign-out safety spec verifies that after one owner login:

- `/studio/101/editor` renders Canvas;
- no anchor targets `/auth/sign-out`;
- no request is made to `/auth/sign-out` during a five-second rendered wait;
- the owner session marker remains;
- hard refresh preserves Canvas access;
- `/studio/101/editor?debug=1` renders the same authorised editor without clearing the session.

Existing auth-gate coverage also verifies:

- debug is display-only;
- transient session hydration does not create a sticky gate;
- anonymous and non-owner access are still denied.

## Source Guarantee

The standard editor shell contains an explicit logout button only. Rendering the shell cannot invoke Supabase sign-out.
