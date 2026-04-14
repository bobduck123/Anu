jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import logger from '../../src/utils/logger';
import { RequestContext } from '../../src/falak/domain/types';
import { falakContextFields, logFalak } from '../../src/falak/observability/falakTelemetry';
import { buildPlaneLogEnvelope, normalizePlaneLogPlane } from '../../src/falak/observability/planeLog';

describe('Falak plane-aware log contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects invalid plane values explicitly', () => {
    expect(normalizePlaneLogPlane('impact')).toBe('impact');
    expect(() => normalizePlaneLogPlane('participant')).toThrow(/Unsupported log plane/i);
  });

  test('builds envelope with canonical fields and redacts sensitive context', () => {
    const envelope = buildPlaneLogEnvelope({
      plane: 'impact',
      serviceName: 'impact-service',
      eventName: 'falak.policy_decision',
      level: 'warn',
      requestId: 'req-1',
      correlationId: 'trace-1',
      context: {
        action: 'policy.evaluate',
        access_token: 'secret-token',
        nested: {
          authorization: 'Bearer secret',
          ok: true,
        },
      },
    });

    expect(envelope).toMatchObject({
      plane: 'impact',
      service_name: 'impact-service',
      event_name: 'falak.policy_decision',
      level: 'warn',
      request_id: 'req-1',
      correlation_id: 'trace-1',
    });
    expect(typeof envelope.timestamp).toBe('string');
    expect(envelope.context?.access_token).toBe('[redacted]');
    expect((envelope.context?.nested as { authorization?: string })?.authorization).toBe('[redacted]');
  });

  test('falak telemetry emits impact-plane envelope with execution context', () => {
    const context: RequestContext = {
      traceId: 'trace-falak-1',
      tenantId: 'tenant-1',
      tenantSlug: 'mudyin',
      plane: 'privileged',
      actor: null,
      actorResolution: {
        source: 'none',
        isVerified: false,
        tokenAudience: 'none',
        authenticatedIdentity: null,
        requestedActorId: null,
      },
      routeGuard: {
        applies: true,
        mode: 'enabled',
        access: 'privileged',
      },
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    };

    logFalak('falak.route_guard', {
      ...falakContextFields(context),
      allowed: true,
      auth_token: 'never-log-this',
    });

    expect(logger.info).toHaveBeenCalledTimes(1);
    const [payload, message] = (logger.info as jest.Mock).mock.calls[0];
    expect(message).toBe('falak.route_guard');
    expect(payload).toMatchObject({
      plane: 'impact',
      service_name: 'impact-service',
      event_name: 'falak.route_guard',
      level: 'info',
      correlation_id: 'trace-falak-1',
    });
    expect(payload.context?.falak_execution_plane).toBe('privileged');
    expect(payload.context?.auth_token).toBe('[redacted]');
  });
});
