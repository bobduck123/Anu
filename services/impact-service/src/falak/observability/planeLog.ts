import logger from '../../utils/logger';

export type PlaneLogPlane = 'public' | 'control' | 'impact';
export type PlaneLogLevel = 'debug' | 'info' | 'warn' | 'error';

const ALLOWED_PLANES: readonly PlaneLogPlane[] = ['public', 'control', 'impact'] as const;
const SENSITIVE_KEYS = ['authorization', 'token', 'secret', 'session', 'cookie', 'password', 'api_key', 'apikey'] as const;

export interface PlaneLogEnvelope {
  plane: PlaneLogPlane;
  service_name: string;
  event_name: string;
  level: PlaneLogLevel;
  timestamp: string;
  request_id: string | null;
  correlation_id: string | null;
  context?: Record<string, unknown>;
}

export interface EmitPlaneLogInput {
  plane: string;
  serviceName: string;
  eventName: string;
  level?: PlaneLogLevel;
  requestId?: string | null;
  correlationId?: string | null;
  context?: Record<string, unknown>;
}

export function normalizePlaneLogPlane(value: string): PlaneLogPlane {
  const normalized = String(value || '').trim().toLowerCase();
  if (!ALLOWED_PLANES.includes(normalized as PlaneLogPlane)) {
    throw new Error(`Unsupported log plane: ${value}`);
  }
  return normalized as PlaneLogPlane;
}

function looksSensitiveKey(key: string): boolean {
  const normalized = key.trim().toLowerCase();
  return SENSITIVE_KEYS.some((needle) => normalized.includes(needle));
}

function looksSensitiveString(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith('bearer ') || normalized.startsWith('eyj');
}

function sanitizeContextValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeContextValue(entry));
  }
  if (value && typeof value === 'object') {
    return sanitizeLogContext(value as Record<string, unknown>);
  }
  if (typeof value === 'string' && looksSensitiveString(value)) {
    return '[redacted]';
  }
  return value;
}

export function sanitizeLogContext(input: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    output[key] = looksSensitiveKey(key) ? '[redacted]' : sanitizeContextValue(value);
  }
  return output;
}

export function buildPlaneLogEnvelope(input: EmitPlaneLogInput): PlaneLogEnvelope {
  const level = input.level ?? 'info';
  const envelope: PlaneLogEnvelope = {
    plane: normalizePlaneLogPlane(input.plane),
    service_name: String(input.serviceName || 'impact-service'),
    event_name: String(input.eventName || 'unspecified_event'),
    level,
    timestamp: new Date().toISOString(),
    request_id: input.requestId ?? null,
    correlation_id: input.correlationId ?? null,
  };
  if (input.context) {
    envelope.context = sanitizeLogContext(input.context);
  }
  return envelope;
}

export function emitPlaneLog(input: EmitPlaneLogInput): PlaneLogEnvelope {
  const envelope = buildPlaneLogEnvelope(input);
  const logMethod = envelope.level === 'warn' ? logger.warn.bind(logger) : (logger[envelope.level] ?? logger.info).bind(logger);
  logMethod(envelope, envelope.event_name);
  return envelope;
}
