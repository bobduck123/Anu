# ANU Staging Stack (M0)

Open-source staging baseline for integrated runtime and resilience testing.

## Services

- Postgres + PostGIS (`postgres`)
- Redis (`redis`)
- MinIO object storage (`minio`)
- Grafana LGTM all-in-one observability (`lgtm`)

## Start

```bash
cd infra/staging
docker compose up -d
```

## Stop

```bash
docker compose down
```

## Endpoints

- Postgres: `localhost:5432`
- Redis: `localhost:6379`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`
- Grafana (LGTM): `http://localhost:3001`

## Notes

- This stack is intended for **staging and adversarial validation**, not production.
- Credentials are development defaults; replace for shared environments.
