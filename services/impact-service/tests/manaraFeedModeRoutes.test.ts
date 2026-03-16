import express, { Router } from 'express';
import { AddressInfo } from 'net';
import { Server } from 'http';
import { buildServerApp } from '../src/bootstrapApp';
import { resolveManaraFeedMode, resolveManaraFeedState } from '../src/manaraFeed';
import { createManaraRoutes } from '../src/routes/manara';

async function withServer(
  appFactory: () => express.Express,
  callback: (baseUrl: string) => Promise<void>
): Promise<void> {
  const app = appFactory();
  const server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  try {
    const { port } = server.address() as AddressInfo;
    await callback(`http://127.0.0.1:${port}`);
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

function createLiveRoutes(spies: { liveFeed: jest.Mock; liveChannels: jest.Mock }): Router {
  const router = Router();

  router.get('/feed', (req, res) => {
    spies.liveFeed();
    res.json({ source: 'live' });
  });

  router.get('/channels', (req, res) => {
    spies.liveChannels();
    res.json({ source: 'live-channels' });
  });

  return router;
}

function createPlaceholderFeedRoutes(spy: jest.Mock): Router {
  const router = Router();

  router.get('/feed', (req, res) => {
    spy();
    res.json({ source: 'placeholder', placeholder: true });
  });

  return router;
}

describe('Manara feed rollout mode', () => {
  test('placeholder mode routes /feed to the placeholder implementation and keeps non-feed routes live', async () => {
    const liveFeed = jest.fn();
    const liveChannels = jest.fn();
    const placeholderFeed = jest.fn();
    const app = express();

    app.use('/api/manara', createManaraRoutes({} as never, {
      feedMode: 'placeholder',
      liveRoutesFactory: () => createLiveRoutes({ liveFeed, liveChannels }),
      placeholderFeedRoutesFactory: () => createPlaceholderFeedRoutes(placeholderFeed)
    }));

    await withServer(() => app, async (baseUrl) => {
      const feedResponse = await fetch(`${baseUrl}/api/manara/feed`);
      expect(feedResponse.status).toBe(200);
      await expect(feedResponse.json()).resolves.toMatchObject({
        source: 'placeholder',
        placeholder: true
      });

      const channelsResponse = await fetch(`${baseUrl}/api/manara/channels`);
      expect(channelsResponse.status).toBe(200);
      await expect(channelsResponse.json()).resolves.toMatchObject({
        source: 'live-channels'
      });
    });

    expect(placeholderFeed).toHaveBeenCalledTimes(1);
    expect(liveFeed).not.toHaveBeenCalled();
    expect(liveChannels).toHaveBeenCalledTimes(1);
  });

  test('live mode routes /feed to the Prisma-backed implementation', async () => {
    const liveFeed = jest.fn();
    const placeholderFeed = jest.fn();
    const app = express();

    app.use('/api/manara', createManaraRoutes({} as never, {
      feedMode: 'live',
      liveRoutesFactory: () => createLiveRoutes({ liveFeed, liveChannels: jest.fn() }),
      placeholderFeedRoutesFactory: () => createPlaceholderFeedRoutes(placeholderFeed)
    }));

    await withServer(() => app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/manara/feed`);
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        source: 'live'
      });
    });

    expect(liveFeed).toHaveBeenCalledTimes(1);
    expect(placeholderFeed).not.toHaveBeenCalled();
  });

  test('production-safe defaults keep the Manara feed in placeholder mode until explicitly enabled', () => {
    expect(resolveManaraFeedMode(undefined, 'production')).toBe('placeholder');
    expect(resolveManaraFeedMode(undefined, 'development')).toBe('live');
    expect(resolveManaraFeedMode('live', 'production')).toBe('live');
  });

  test('health exposes when the configured feed mode falls back to placeholder behavior', async () => {
    await withServer(
      () => buildServerApp(null, { manaraFeedMode: 'live' }),
      async (baseUrl) => {
        const assertPayload = async (path: string) => {
          const response = await fetch(`${baseUrl}${path}`);
          expect(response.status).toBe(200);

          const payload = (await response.json()) as {
            manaraFeed: {
              configuredMode: string;
              activeMode: string;
              backend: string;
              dbBacked: boolean;
            };
          };

          expect(payload.manaraFeed).toEqual({
            configuredMode: 'live',
            activeMode: 'placeholder',
            backend: 'placeholder',
            dbBacked: false
          });
        };

        await assertPayload('/health');
        await assertPayload('/api/health');
      }
    );
  });

  test('feed state resolves to placeholder when Prisma is unavailable', () => {
    expect(resolveManaraFeedState({
      configuredMode: 'live',
      hasPrisma: false
    })).toEqual({
      configuredMode: 'live',
      activeMode: 'placeholder',
      backend: 'placeholder',
      dbBacked: false
    });
  });
});
