import { describe, expect, it, vi } from 'vitest';
import { buildPlaneLogEnvelope, emitPlaneLog, normalizePlaneLogPlane } from '@/lib/observability/planeLog';

describe('plane log contract', () => {
  it('normalizes supported planes and rejects unsupported values', () => {
    expect(normalizePlaneLogPlane('Public')).toBe('public');
    expect(normalizePlaneLogPlane('control')).toBe('control');
    expect(() => normalizePlaneLogPlane('participant')).toThrow(/Unsupported log plane/i);
  });

  it('builds canonical envelope and redacts sensitive context values', () => {
    const envelope = buildPlaneLogEnvelope({
      plane: 'public',
      serviceName: 'frontend-next',
      eventName: 'public_archive_fetch_failed',
      level: 'warn',
      correlationId: 'trace-1',
      context: {
        reason: 'upstream_error',
        auth_token: 'secret-token',
        nested: {
          authorization: 'Bearer abc123',
          ok: true,
        },
      },
    });

    expect(envelope).toMatchObject({
      plane: 'public',
      serviceName: 'frontend-next',
      eventName: 'public_archive_fetch_failed',
      level: 'warn',
      correlationId: 'trace-1',
    });
    expect(typeof envelope.timestamp).toBe('string');
    expect(envelope.context?.auth_token).toBe('[redacted]');
    expect((envelope.context?.nested as { authorization?: string })?.authorization).toBe('[redacted]');
  });

  it('emits logs through the configured level sink', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const envelope = emitPlaneLog({
      plane: 'control',
      serviceName: 'frontend-next',
      eventName: 'control_proxy_host_rejected',
      level: 'warn',
      requestId: 'req-1',
      correlationId: 'trace-1',
    });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(envelope.plane).toBe('control');
    expect(envelope.requestId).toBe('req-1');
    warnSpy.mockRestore();
  });
});
