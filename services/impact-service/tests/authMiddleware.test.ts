import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware, optionalAuth } from '../src/middleware/auth';

function requestWithToken(token: string): Request {
  return {
    headers: {
      authorization: `Bearer ${token}`
    },
    path: '/api/test'
  } as unknown as Request;
}

function responseStub(): Response {
  return {} as Response;
}

describe('auth middleware compatibility', () => {
  test('accepts legacy impact tokens with nested subject claims', () => {
    const token = jwt.sign(
      {
        sub: {
          username: 'legacy-user',
          role: 'organizer'
        }
      },
      process.env.JWT_SECRET_KEY ?? 'falak-test-secret'
    );
    const req = requestWithToken(token);
    const next = jest.fn();

    authMiddleware(req, responseStub(), next);

    expect(req.user).toEqual({
      username: 'legacy-user',
      role: 'organizer'
    });
    expect(next).toHaveBeenCalledWith();
  });

  test('accepts Flask public tokens signed with PUBLIC_JWT_SECRET_KEY', () => {
    const token = jwt.sign(
      {
        sub: 'anu-admin',
        role: 'operator',
        aud: 'public',
        token_use: 'public'
      },
      process.env.PUBLIC_JWT_SECRET_KEY ?? 'falak-public-test-secret'
    );
    const req = requestWithToken(token);
    const next = jest.fn();

    authMiddleware(req, responseStub(), next);

    expect(req.user).toEqual({
      username: 'anu-admin',
      role: 'operator'
    });
    expect(next).toHaveBeenCalledWith();
  });

  test('normalizes control subject prefixes during optional auth extraction', () => {
    const token = jwt.sign(
      {
        sub: 'control::anu-admin',
        role: 'superadmin'
      },
      process.env.JWT_SECRET_KEY ?? 'falak-test-secret'
    );
    const req = requestWithToken(token);
    const next = jest.fn();

    optionalAuth(req, responseStub(), next);

    expect(req.user).toEqual({
      username: 'anu-admin',
      role: 'superadmin'
    });
    expect(next).toHaveBeenCalledWith();
  });
});
