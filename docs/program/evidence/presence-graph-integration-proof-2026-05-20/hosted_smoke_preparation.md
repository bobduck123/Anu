# Hosted Smoke Preparation

Date: 2026-05-20

Script:

`scripts/presence_graph_hosted_smoke.py`

## Purpose

The hosted smoke is prepared as a separate proof layer for production/staging once stable hosted graph seed data and real test/operator auth tokens are available. It does not weaken production auth and does not rely on the frontend E2E auth mock.

## Default Behaviour

Without seeded hosted IDs/tokens, the script still checks:

- backend `/health`
- protected observer passport fails cleanly without auth
- protected owner analytics fails cleanly without auth when `PRESENCE_GRAPH_HOSTED_ROOM_ID` is provided
- admin world readiness fails cleanly without control-plane auth

It marks auth-dependent branches as `blocked`, not passed.

## Required Environment Variables

Public graph proof:

- `PRESENCE_GRAPH_HOSTED_API_BASE`, default `https://anu-back-end.vercel.app`
- `PRESENCE_GRAPH_HOSTED_ROOM_KEY_TOKEN`
- `PRESENCE_GRAPH_HOSTED_ROOM_ID`
- `PRESENCE_GRAPH_HOSTED_MOOD_BOARD_ID`

Observer proof:

- `PRESENCE_GRAPH_HOSTED_OBSERVER_TOKEN`

Owner proof:

- `PRESENCE_GRAPH_HOSTED_OWNER_TOKEN`

Control-plane/admin proof:

- `PRESENCE_GRAPH_HOSTED_CONTROL_TOKEN`
- `PRESENCE_GRAPH_HOSTED_CONTROL_SECRET`
- `PRESENCE_GRAPH_HOSTED_CONTROL_HOST`, only if the hosted control-plane gate requires a specific Host header

Optional:

- `PRESENCE_GRAPH_HOSTED_TIMEOUT`

## Command

```powershell
python scripts\presence_graph_hosted_smoke.py
```

Exit codes:

- `0`: all configured checks passed
- `1`: at least one configured check failed
- `2`: no configured checks failed, but one or more proof branches were blocked by missing seed data/auth env

## Checks

The script checks:

- public RoomKey resolve returns a Room entry payload and one encounter
- no follow-up encounter capture is sent by the smoke after RoomKey resolve, preserving the frontend duplicate-capture contract
- observer routes fail cleanly without auth
- observer passport and mood board routes pass with supplied observer token
- owner analytics fails cleanly without auth
- owner passes, keys, and analytics pass with supplied owner token
- public Path from Room returns waypoints and choices
- public Path from Mood Board returns waypoints and choices
- admin world readiness fails cleanly without control auth
- admin world readiness passes with supplied control token/secret

## Secret Handling

The script reads token/secret values from the environment but never prints them. Output includes only env variable names and safe response summaries.

## Current Hosted Status

Prepared, not fully proven in this pass. Hosted auth-dependent proof remains blocked until a stable hosted RoomKey token, room id, mood board id, observer token, owner token, and control-plane credentials are provided.
