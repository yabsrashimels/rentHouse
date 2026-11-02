import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../config/database';
import config from '../config';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const DESIGNATED_OWNER_EMAIL = 'shimelsyabsra565@gmail.com';
export const DESIGNATED_OWNER_PASSWORD_HASH = '$2a$12$EgVFwzmQsjGgJtKFSCeys.hbh3QuxHZsOrLdDZ9Y9ZeBoEa/IHgMW';

export const isDesignatedOwner = (email?: string | null) => {
  return email?.toLowerCase() === DESIGNATED_OWNER_EMAIL.toLowerCase();
};

export const ensureSingleOwnerAccount = async () => {
  const existingDesignatedOwner = await prisma.user.findUnique({
    where: { email: DESIGNATED_OWNER_EMAIL },
    select: { id: true, role: true, fullName: true, accountStatus: true },
  });

  if (!existingDesignatedOwner) {
    await prisma.user.create({
      data: {
        fullName: 'Yabsra Shimels',
        email: DESIGNATED_OWNER_EMAIL,
        phone: '+251911111111',
        passwordHash: DESIGNATED_OWNER_PASSWORD_HASH,
        role: 'OWNER',
        accountStatus: 'ACTIVE',
      },
    });
  } else if (existingDesignatedOwner.role !== 'OWNER' || existingDesignatedOwner.accountStatus !== 'ACTIVE') {
    await prisma.user.update({
      where: { email: DESIGNATED_OWNER_EMAIL },
      data: {
        role: 'OWNER',
        accountStatus: 'ACTIVE',
        passwordHash: DESIGNATED_OWNER_PASSWORD_HASH,
      },
    });
  }

  await prisma.user.updateMany({
    where: {
      email: { not: DESIGNATED_OWNER_EMAIL },
      role: 'OWNER',
    },
    data: { role: 'TENANT' },
  });
};

const generateTokens = (userId: string, email: string, role: string) => {
  const accessToken = jwt.sign(
    { userId, email, role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as any }
  );

  const refreshToken = jwt.sign(
    { userId, email, role },
    config.jwtRefreshSecret,
    { expiresIn: config.jwtRefreshExpiresIn as any }
  );

  return { accessToken, refreshToken };
};

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  const isProd = config.nodeEnv === 'production';

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: config.cookieSameSite as 'lax' | 'strict' | 'none',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: config.cookieSameSite as 'lax' | 'strict' | 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth/refresh',
  });
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureSingleOwnerAccount();

    const { fullName, email, phone, password } = req.body;
    const safeRole = 'TENANT';

    // Check if email exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ApiError(409, 'An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        phone,
        passwordHash,
        role: safeRole,
        accountStatus: 'ACTIVE',
      },
      select: {
        id: true, fullName: true, email: true, phone: true,
        role: true, accountStatus: true, createdAt: true,
      },
    });

    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);

    // Save session
    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    setAuthCookies(res, accessToken, refreshToken);

    // Log registration
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'USER_REGISTERED',
        entityType: 'User',
        entityId: user.id,
        ipAddress: req.ip,
      },
    });

    sendSuccess(res, { user, accessToken }, 'Registration successful', 201);
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureSingleOwnerAccount();

    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true, fullName: true, email: true, phone: true,
        passwordHash: true, role: true, accountStatus: true,
        telegram: true, instagram: true, profileImageUrl: true,
        createdAt: true,
      },
    });

    // Use constant-time comparison to prevent timing attacks
    const dummyHash = '$2a$12$K8gmbCaVn3ycjhFHqTG7AuSYz0M5IJ.K5Q.BX5w.J5q5J5q5J5q5J';
    const passwordValid = user
      ? await bcrypt.compare(password, user.passwordHash)
      : await bcrypt.compare(password, dummyHash);

    if (!user || !passwordValid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    if (user.accountStatus === 'SUSPENDED') {
      throw new ApiError(403, 'Your account has been suspended. Please contact support.');
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);

    // Save session
    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    setAuthCookies(res, accessToken, refreshToken);

    // Log login
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: user.id,
        ipAddress: req.ip,
      },
    });

    const { passwordHash: _, ...userWithoutPassword } = user;

    sendSuccess(res, { user: userWithoutPassword, accessToken }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await prisma.userSession.updateMany({
        where: { refreshToken },
        data: { revokedAt: new Date() },
      });
    }

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    sendSuccess(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, fullName: true, email: true, phone: true,
        role: true, accountStatus: true, telegram: true,
        instagram: true, profileImageUrl: true, emailVerifiedAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    sendSuccess(res, { user });
  } catch (error) {
    next(error);
  }
};

export const becomeHost = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await ensureSingleOwnerAccount();

    if (!isDesignatedOwner(req.user?.email)) {
      throw new ApiError(403, 'Only the designated owner account may enable owner permissions.');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, fullName: true, email: true, phone: true,
        role: true, accountStatus: true, telegram: true,
        instagram: true, profileImageUrl: true, emailVerifiedAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.role !== 'OWNER') {
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { role: 'OWNER', passwordHash: DESIGNATED_OWNER_PASSWORD_HASH },
      });
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, fullName: true, email: true, phone: true,
        role: true, accountStatus: true, telegram: true,
        instagram: true, profileImageUrl: true, emailVerifiedAt: true,
        createdAt: true,
      },
    });

    sendSuccess(res, { user: updatedUser }, 'Host account activated');
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      throw new ApiError(401, 'Refresh token required');
    }

    const decoded = jwt.verify(token, config.jwtRefreshSecret) as {
      userId: string; email: string; role: string;
    };

    // Check if session is valid and not revoked
    const session = await prisma.userSession.findUnique({
      where: { refreshToken: token },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new ApiError(401, 'Invalid or expired refresh token');
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      decoded.userId, decoded.email, decoded.role
    );

    // Rotate refresh token
    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    setAuthCookies(res, accessToken, newRefreshToken);

    sendSuccess(res, { accessToken }, 'Token refreshed');
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) {
      return sendSuccess(res, null, 'If an account with that email exists, a password reset link has been sent');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt },
    });

    // TODO: Send email with reset link
    // const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;
    // await emailService.sendPasswordReset(user.email, resetUrl);

    sendSuccess(res, null, 'If an account with that email exists, a password reset link has been sent');
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;

    const resetRecord = await prisma.passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.expiresAt < new Date() || resetRecord.usedAt) {
      throw new ApiError(400, 'Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all sessions
      prisma.userSession.updateMany({
        where: { userId: resetRecord.userId },
        data: { revokedAt: new Date() },
      }),
    ]);

    sendSuccess(res, null, 'Password reset successful. Please log in with your new password.');
  } catch (error) {
    next(error);
  }
};
