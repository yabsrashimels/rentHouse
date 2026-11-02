import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../app';
import prisma from '../config/database';
import config from '../config';

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    userSession: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../middleware/rateLimiter', () => ({
  authLimiter: (_req: any, _res: any, next: any) => next(),
  generalLimiter: (_req: any, _res: any, next: any) => next(),
  passwordResetLimiter: (_req: any, _res: any, next: any) => next(),
  contactRevealLimiter: (_req: any, _res: any, next: any) => next(),
  uploadLimiter: (_req: any, _res: any, next: any) => next(),
}));

describe('auth security rules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockImplementation(({ data }) => Promise.resolve({
      id: 'new-user-id',
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    (prisma.userSession.create as jest.Mock).mockResolvedValue({});
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
  });

  it('forces tenant role for public registration even when owner is requested', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Test User',
        email: 'new.user@example.com',
        phone: '+251911111111',
        password: 'StrongPass1',
        role: 'OWNER',
      });

    expect(res.status).toBe(201);

    const registrationCall = (prisma.user.create as jest.Mock).mock.calls.find(
      ([call]) => call?.data?.email === 'new.user@example.com'
    );

    expect(registrationCall?.[0].data.role).toBe('TENANT');
  });

  it('allows a tenant to sign in with a valid password and returns tenant role', async () => {
    const passwordHash = await bcrypt.hash('StrongPass1', 12);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      fullName: 'Tenant User',
      email: 'tenant@example.com',
      phone: '+251900000000',
      passwordHash,
      role: 'TENANT',
      accountStatus: 'ACTIVE',
      telegram: null,
      instagram: null,
      profileImageUrl: null,
      createdAt: new Date(),
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'tenant@example.com',
        password: 'StrongPass1',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('TENANT');
  });

  it('blocks non-owner users from becoming an owner via the direct API', async () => {
    const token = jwt.sign({ userId: 'tenant-42', email: 'tenant@example.com', role: 'TENANT' }, config.jwtSecret);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'tenant-42',
      fullName: 'Tenant User',
      email: 'tenant@example.com',
      phone: '+251900000000',
      role: 'TENANT',
      accountStatus: 'ACTIVE',
    });

    const res = await request(app)
      .post('/api/auth/become-host')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
