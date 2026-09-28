# PEACH Gate 12 Screenshot Evidence

Date: 2026-07-31

## Target

Local Next server:

`http://localhost:3333`

## Captured screenshots

- `C:\tmp\peach_gate12_peach.png`
- `C:\tmp\peach_gate12_field.png`
- `C:\tmp\peach_gate12_contribute.png`
- `C:\tmp\peach_gate12_consent_request.png`
- `C:\tmp\peach_gate12_support.png`
- `C:\tmp\peach_gate12_control_peach.png`

## Commands

- `npx playwright screenshot http://localhost:3333/peach C:\tmp\peach_gate12_peach.png`
- `npx playwright screenshot http://localhost:3333/peach/fields/studying-ourselves C:\tmp\peach_gate12_field.png`
- `npx playwright screenshot http://localhost:3333/peach/fields/studying-ourselves/contribute C:\tmp\peach_gate12_contribute.png`
- `npx playwright screenshot http://localhost:3333/peach/consent/request C:\tmp\peach_gate12_consent_request.png`
- `npx playwright screenshot http://localhost:3333/peach/support C:\tmp\peach_gate12_support.png`
- `npx playwright screenshot http://localhost:3333/control/peach C:\tmp\peach_gate12_control_peach.png`

All screenshot commands exited successfully.

## Observed surfaces

Captured surfaces cover:

- public PEACH orchard landing;
- Field page;
- participant contribution page;
- consent request page;
- support intent page;
- steward control workspace shell.

## Boundary

Screenshots were captured against the local Gate 12 route/API target, not hosted private staging.
