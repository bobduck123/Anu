import jwt from 'jsonwebtoken';
import { FastifyRequest } from 'fastify';
import { resolveActorIdentity } from '../../src/falak/auth/actorIdentity';
import { readFalakRuntimeConfig } from '../../src/falak/config/falakRuntimeConfig';
import { createSeededFalakRepository } from '../../src/falak/testing/inMemoryFalakRepository';

function requestWithBearerToken(token: string): FastifyRequest {
  return {
    headers: {
      authorization: `Bearer ${token}`
    }
  } as FastifyRequest;
}

describe('Falak actor identity', () => {
  test('resolves actors from Flask public tokens signed with PUBLIC_JWT_SECRET_KEY', async () => {
    const fixture = createSeededFalakRepository();
    const token = jwt.sign(
      {
        sub: 'anu-admin',
        role: 'operator',
        aud: 'public',
        token_use: 'public'
      },
      process.env.PUBLIC_JWT_SECRET_KEY ?? 'falak-public-test-secret'
    );

    const result = await resolveActorIdentity(
      requestWithBearerToken(token),
      fixture.repository,
      readFalakRuntimeConfig(process.env),
      fixture.adminContext.tenantId
    );

    expect(result).toMatchObject({
      actor: expect.objectContaining({
        externalAuthId: 'anu-admin'
      }),
      actorResolution: expect.objectContaining({
        source: 'verified_auth',
        isVerified: true,
        authenticatedIdentity: 'anu-admin'
      })
    });
  });

  test('resolves sandbox actors from trusted x-actor-id identity values when sandbox mode is enabled', async () => {
    const fixture = createSeededFalakRepository();

    const result = await resolveActorIdentity(
      {
        headers: {
          'x-actor-id': 'anu-admin'
        }
      } as unknown as FastifyRequest,
      fixture.repository,
      readFalakRuntimeConfig({
        NODE_ENV: 'development',
        FALAK_MODE: 'map_sandbox',
      }),
      fixture.adminContext.tenantId
    );

    expect(result).toMatchObject({
      actor: expect.objectContaining({
        externalAuthId: 'anu-admin'
      }),
      actorResolution: expect.objectContaining({
        source: 'trusted_header_override',
        isVerified: false,
        authenticatedIdentity: 'anu-admin',
        requestedActorId: 'anu-admin'
      })
    });
  });
});
