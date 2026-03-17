import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  WorldSnapshotPayload,
  verifyWorldSnapshotIntegrity,
  verifyWorldSnapshotSignature,
} from '@/lib/api/culturalIntelligence';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      sorted[key] = canonicalize(record[key]);
    }
    return sorted;
  }
  return value;
}

function bytesToBase64(input: Uint8Array): string {
  if (typeof btoa === 'function') {
    let binary = '';
    for (const value of input) {
      binary += String.fromCharCode(value);
    }
    return btoa(binary);
  }
  throw new Error('Base64 encoder unavailable in test runtime');
}

async function sha256Hex(input: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', Uint8Array.from(input));
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

async function createSignedSnapshot(
  patch?: Partial<WorldSnapshotPayload['manifest']>,
): Promise<WorldSnapshotPayload> {
  const manifest: WorldSnapshotPayload['manifest'] = {
    world_id: 'sydney-alpha',
    version: 7,
    asset_list: [{ path: 'tiles/0_0/terrain.glb', checksum: 'b'.repeat(64) }],
    scene_graph: { nodes: [{ id: 'node_1', label: 'Node 1' }] },
    semantic_map: { entities: [] },
    layers: { terrain: true },
    permissions_manifest: { public: true },
    education_links: { modules: [] },
    meta: { profile: 'alpha' },
    ...patch,
  };

  const keyPair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const message = new TextEncoder().encode(JSON.stringify(canonicalize(manifest)));
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'Ed25519' }, keyPair.privateKey, message));
  const publicKeyRaw = new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey));
  const manifestHash = await sha256Hex(message);

  return {
    world_id: manifest.world_id,
    version: manifest.version,
    manifest,
    manifest_hash: manifestHash,
    signature: bytesToBase64(signature),
    signature_key_id: 'trusted-alpha-key',
    public_key_raw_b64: bytesToBase64(publicKeyRaw),
    verified: true,
    verification: {
      signature_valid: true,
      manifest_hash_valid: true,
      artifact_valid: true,
      reasons: [],
    },
    created_at: '2026-03-10T00:00:00.000Z',
  };
}

const ENV_KEYS = [
  'NEXT_PUBLIC_WORLD_TRUSTED_KEYS_JSON',
  'NEXT_PUBLIC_WORLD_REQUIRE_SERVER_VERIFIED',
  'NEXT_PUBLIC_WORLD_REQUIRE_MANIFEST_HASH',
] as const;

const envBackup: Record<string, string | undefined> = {};

describe('world snapshot integrity', () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) {
      envBackup[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = envBackup[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('accepts a valid signed snapshot with matching manifest hash and server verification', async () => {
    const snapshot = await createSignedSnapshot();
    const result = await verifyWorldSnapshotIntegrity(snapshot);

    expect(result.ok).toBe(true);
    expect(result.signatureValid).toBe(true);
    expect(result.manifestHashValid).toBe(true);
    expect(result.serverVerified).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('rejects snapshot when manifest hash does not match canonical manifest payload', async () => {
    const snapshot = await createSignedSnapshot();
    snapshot.manifest_hash = '0'.repeat(64);

    const result = await verifyWorldSnapshotIntegrity(snapshot);
    expect(result.ok).toBe(false);
    expect(result.manifestHashValid).toBe(false);
    expect(result.reasons).toContain('manifest_hash_mismatch');
  });

  it('enforces configured trusted world signing key mapping', async () => {
    const snapshot = await createSignedSnapshot();
    process.env.NEXT_PUBLIC_WORLD_TRUSTED_KEYS_JSON = JSON.stringify({
      [snapshot.signature_key_id]: 'A'.repeat(44),
    });

    const result = await verifyWorldSnapshotIntegrity(snapshot);
    expect(result.ok).toBe(false);
    expect(result.trustedKeyValid).toBe(false);
    expect(result.reasons).toContain('signature_key_material_mismatch');
  });

  it('keeps legacy signature-only verification compatible when strict server verification fails', async () => {
    const snapshot = await createSignedSnapshot();
    snapshot.verified = false;
    snapshot.verification = {
      signature_valid: true,
      manifest_hash_valid: true,
      artifact_valid: false,
      reasons: ['artifact_missing'],
    };

    const strictResult = await verifyWorldSnapshotIntegrity(snapshot);
    expect(strictResult.ok).toBe(false);
    expect(strictResult.reasons).toContain('server_verification_failed');

    const signatureOnly = await verifyWorldSnapshotSignature(snapshot);
    expect(signatureOnly).toBe(true);
  });
});
