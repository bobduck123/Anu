export type PlaneLogLevel = 'debug' | 'info' | 'warn' | 'error';
export type PlaneLogPlane = 'public' | 'control' | 'impact';

const ALLOWED_PLANES: readonly PlaneLogPlane[] = ['public', 'control', 'impact'] as const;
const SENSITIVE_CONTEXT_KEYS = ['authorization', 'token', 'secret', 'session', 'cookie', 'password', 'api_key', 'apikey'] as const;

export interface PlaneLogEnvelope {
  plane: PlaneLogPlane;
  serviceName: string;
  eventName: string;
  level: PlaneLogLevel;
  timestamp: string;
  requestId: string | null;
  correlationId: string | null;
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
  return SENSITIVE_CONTEXT_KEYS.some((needle) => normalized.includes(needle));
}

function looksSensitiveString(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith('bearer ') || normalized.startsWith('eyj');
}

function sanitizeLogValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeLogValue(entry));
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
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (looksSensitiveKey(key)) {
      result[key] = '[redacted]';
      continue;
    }
    result[key] = sanitizeLogValue(value);
  }
  return result;
}

export function buildPlaneLogEnvelope(input: EmitPlaneLogInput): PlaneLogEnvelope {
  const level = input.level ?? 'info';
  const envelope: PlaneLogEnvelope = {
    plane: normalizePlaneLogPlane(input.plane),
    serviceName: String(input.serviceName || 'frontend-next'),
    eventName: String(input.eventName || 'unspecified_event'),
    level,
    timestamp: new Date().toISOString(),
    requestId: input.requestId ?? null,
    correlationId: input.correlationId ?? null,
  };
  if (input.context) {
    envelope.context = sanitizeLogContext(input.context);
  }
  return envelope;
}

export function emitPlaneLog(input: EmitPlaneLogInput): PlaneLogEnvelope {
  const envelope = buildPlaneLogEnvelope(input);
  const method: PlaneLogLevel = envelope.level === 'warn' ? 'warn' : envelope.level;
  const sink = typeof console[method] === 'function' ? console[method] : console.info;
  sink('[plane_log_event]', envelope);
  return envelope;
}
