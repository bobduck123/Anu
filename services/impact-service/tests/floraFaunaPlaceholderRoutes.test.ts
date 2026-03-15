import { AddressInfo } from 'net';
import { Server } from 'http';
import { buildServerApp } from '../src/bootstrapApp';

async function withServer<T>(callback: (baseUrl: string) => Promise<T>): Promise<T> {
  const app = buildServerApp(null);
  const server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  try {
    const { port } = server.address() as AddressInfo;
    return await callback(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
}

describe('floraFauna placeholder routes', () => {
  it('serves public Manara preview data when database infrastructure is unavailable', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/manara/feed`);
      expect(response.status).toBe(200);

      const payload = (await response.json()) as {
        feed: Array<{ id: string; title: string }>;
        placeholder?: boolean;
      };

      expect(payload.placeholder).toBe(true);
      expect(payload.feed.length).toBeGreaterThan(0);
      expect(payload.feed[0]).toMatchObject({
        id: 'seed-the-canopy',
        title: 'Seed the Canopy',
      });
    });
  });

  it('serves placeholder channel and pool detail routes for public preview flows', async () => {
    await withServer(async (baseUrl) => {
      const channelsResponse = await fetch(`${baseUrl}/api/manara/channels?limit=1`);
      expect(channelsResponse.status).toBe(200);
      const channelsPayload = (await channelsResponse.json()) as {
        channels: Array<{ id: string; ecology?: { ecologyIdentity?: string } }>;
      };

      expect(channelsPayload.channels[0]).toMatchObject({
        id: 'manara-origami',
        ecology: {
          ecologyIdentity: 'estuary commons',
        },
      });

      const poolResponse = await fetch(`${baseUrl}/api/manara/pools/mutual-aid-canopy`);
      expect(poolResponse.status).toBe(200);
      const poolPayload = (await poolResponse.json()) as {
        id: string;
        availableBalanceCents: number;
      };

      expect(poolPayload).toMatchObject({
        id: 'mutual-aid-canopy',
        availableBalanceCents: 125000,
      });
    });
  });

  it('keeps organizer/write routes in beta-limited mode without database infrastructure', async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/manara/revenue-events`);
      expect(response.status).toBe(503);

      const payload = (await response.json()) as {
        error?: {
          code?: string;
        };
      };

      expect(payload.error?.code).toBe('BetaDependencyMissing');
    });
  });
});
