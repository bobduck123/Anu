import { buildFalakUnavailableResponse } from '../../src/falak/vercelUnavailable';

const missingDatabaseReason = {
  code: 'FALAK_DATABASE_UNAVAILABLE',
  message: 'Falak requires DATABASE_URL with PostgreSQL + PostGIS configured',
  statusCode: 503,
  healthStatusCode: 200,
} as const;

describe('Falak Vercel unavailable responses', () => {
  test('keeps health visible when the database is missing', () => {
    const response = buildFalakUnavailableResponse('/v1/falak/health', missingDatabaseReason);

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      status: 'degraded',
      service: 'impact-service',
      protocol: 'Falak Protocol',
      dependencies: {
        database: 'missing',
      },
      error: {
        code: 'FALAK_DATABASE_UNAVAILABLE',
      },
    });
  });

  test('returns structured readiness failure payloads', () => {
    const response = buildFalakUnavailableResponse('/v1/falak/readiness', missingDatabaseReason);

    expect(response.statusCode).toBe(503);
    expect(response.body).toEqual({
      status: 'error',
      error: {
        code: 'FALAK_DATABASE_UNAVAILABLE',
        message: 'Falak requires DATABASE_URL with PostgreSQL + PostGIS configured',
      },
    });
  });

  test('returns structured JSON for education maps while Falak is unavailable', () => {
    const response = buildFalakUnavailableResponse('/v1/education/maps', missingDatabaseReason);

    expect(response.statusCode).toBe(503);
    expect(response.body).toEqual({
      error: {
        code: 'FALAK_DATABASE_UNAVAILABLE',
        message: 'Falak requires DATABASE_URL with PostgreSQL + PostGIS configured',
      },
    });
  });
});
