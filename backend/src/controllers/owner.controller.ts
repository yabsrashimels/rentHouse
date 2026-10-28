import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { ApiError } from '../utils/ApiError';
import { sendSuccess } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { cloudinary } from '../config/cloudinary';

export const getPackages = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const packages = await prisma.listingPackage.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    sendSuccess(res, packages);
  } catch (error) {
    next(error);
  }
};

export const createPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { propertyId, packageId } = req.body;

    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new ApiError(404, 'Property not found');

    if (property.ownerId !== req.user!.id) {
      throw new ApiError(403, 'You can only pay for your own properties');
    }

    const pkg = await prisma.listingPackage.findUnique({ where: { id: packageId } });
    if (!pkg || !pkg.active) throw new ApiError(404, 'Package not found or unavailable');

    // Check for existing active/pending payment
    const existingPayment = await prisma.payment.findFirst({
      where: {
        propertyId,
        paymentStatus: { in: ['PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED'] },
      },
    });

    if (existingPayment) {
      throw new ApiError(409, 'A payment already exists for this property');
    }

    const payment = await prisma.payment.create({
      data: {
        userId: req.user!.id,
        propertyId,
        packageId,
        amountInETB: pkg.priceInETB,
        paymentStatus: 'PENDING',
        ipAddress: req.ip,
      },
      include: { package: true },
    });

    // Update property status
    await prisma.property.update({
      where: { id: propertyId },
      data: { listingStatus: 'AWAITING_PAYMENT' },
    });

    sendSuccess(res, payment, 'Payment record created', 201);
  } catch (error) {
    next(error);
  }
};

export const submitPaymentEvidence = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { transactionReference, paymentMethod } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!payment) throw new ApiError(404, 'Payment not found');
    if (payment.userId !== req.user!.id) throw new ApiError(403, 'Access denied');
    if (!['PENDING', 'REJECTED'].includes(payment.paymentStatus)) {
      throw new ApiError(400, 'This payment cannot be updated');
    }

    let receiptUrl: string | undefined;
    let receiptStorageKey: string | undefined;

    // Upload receipt if provided
    if (req.file) {
      if (!req.file.mimetype.startsWith('image/') && req.file.mimetype !== 'application/pdf') {
        throw new ApiError(400, 'Receipt must be an image or PDF');
      }

      const result = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: `ethiorent/receipts`,
            resource_type: 'auto',
            access_mode: 'private', // Restrict access
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(req.file!.buffer);
      });

      receiptUrl = result.secure_url;
      receiptStorageKey = result.public_id;
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        transactionReference,
        paymentMethod,
        receiptUrl: receiptUrl || payment.receiptUrl,
        receiptStorageKey: receiptStorageKey || payment.receiptStorageKey,
        paymentStatus: 'SUBMITTED',
      },
    });

    // Update property status
    await prisma.property.update({
      where: { id: payment.propertyId },
      data: { listingStatus: 'PAYMENT_UNDER_REVIEW' },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: req.user!.id,
        type: 'PAYMENT_SUBMITTED',
        title: 'Payment Submitted',
        message: 'Your payment evidence has been submitted. We will verify it within 3 hours.',
        data: { paymentId: id, propertyId: payment.propertyId },
      },
    });

    sendSuccess(res, updated, 'Payment evidence submitted successfully');
  } catch (error) {
    next(error);
  }
};

export const getMyPayments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user!.id },
      include: {
        package: true,
        property: { select: { id: true, title: true, slug: true, city: true } },
        verifiedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, payments);
  } catch (error) {
    next(error);
  }
};

export const getOwnerDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const [
      totalListings, activeListings, pendingApproval,
      expiredListings, payments,
    ] = await Promise.all([
      prisma.property.count({ where: { ownerId: userId } }),
      prisma.property.count({ where: { ownerId: userId, listingStatus: 'PUBLISHED', expiresAt: { gt: new Date() } } }),
      prisma.property.count({ where: { ownerId: userId, listingStatus: { in: ['AWAITING_MODERATION', 'PAYMENT_UNDER_REVIEW'] } } }),
      prisma.property.count({ where: { ownerId: userId, listingStatus: 'EXPIRED' } }),
      prisma.payment.findMany({
        where: { userId, paymentStatus: 'VERIFIED' },
        select: { amountInETB: true },
      }),
    ]);

    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amountInETB.toString()), 0);

    const recentPayments = await prisma.payment.findMany({
      where: { userId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { package: true, property: { select: { title: true } } },
    });

    sendSuccess(res, {
      stats: { totalListings, activeListings, pendingApproval, expiredListings, totalPaid },
      recentPayments,
    });
  } catch (error) {
    next(error);
  }
};

export const getOwnerProperties = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const properties = await prisma.property.findMany({
      where: { ownerId: req.user!.id },
      include: {
        images: { where: { isCover: true }, take: 1 },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { package: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = properties.map(p => ({
      ...p,
      coverImage: p.images[0]?.imageUrl || null,
      latestPayment: p.payments[0] || null,
      isExpired: p.expiresAt ? p.expiresAt < new Date() : false,
      isFeatured: p.featuredUntil ? p.featuredUntil > new Date() : false,
    }));

    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const getFavorites = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user!.id },
      include: {
        property: {
          include: {
            images: { where: { isCover: true }, take: 1 },
            owner: { select: { id: true, fullName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = favorites
      .filter(f => f.property.listingStatus === 'PUBLISHED')
      .map(f => ({
        ...f.property,
        favoriteId: f.id,
        coverImage: f.property.images[0]?.imageUrl || null,
        isFavorited: true,
      }));

    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const addFavorite = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { propertyId } = req.params;

    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property || property.listingStatus !== 'PUBLISHED') {
      throw new ApiError(404, 'Property not found');
    }

    const existing = await prisma.favorite.findUnique({
      where: { userId_propertyId: { userId: req.user!.id, propertyId } },
    });

    if (existing) {
      throw new ApiError(409, 'Already in favorites');
    }

    const favorite = await prisma.favorite.create({
      data: { userId: req.user!.id, propertyId },
    });

    sendSuccess(res, favorite, 'Added to favorites', 201);
  } catch (error) {
    next(error);
  }
};

export const removeFavorite = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { propertyId } = req.params;

    await prisma.favorite.deleteMany({
      where: { userId: req.user!.id, propertyId },
    });

    sendSuccess(res, null, 'Removed from favorites');
  } catch (error) {
    next(error);
  }
};

export const updateOwnerProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { fullName, phone, telegram, instagram } = req.body;

    const updateData: any = {};
    if (fullName) updateData.fullName = fullName;
    if (phone) updateData.phone = phone;
    if (telegram !== undefined) updateData.telegram = telegram;
    if (instagram !== undefined) updateData.instagram = instagram;

    // Handle profile image upload
    if (req.file) {
      const result = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: 'ethiorent/profiles',
            transformation: [{ width: 200, height: 200, crop: 'fill', gravity: 'face' }],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(req.file!.buffer);
      });
      updateData.profileImageUrl = result.secure_url;
    }

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: updateData,
      select: {
        id: true, fullName: true, email: true, phone: true,
        role: true, telegram: true, instagram: true, profileImageUrl: true,
        createdAt: true,
      },
    });

    sendSuccess(res, user, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
};

export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user!.id, isRead: false },
    });

    sendSuccess(res, { notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

export const markNotificationsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });

    sendSuccess(res, null, 'Notifications marked as read');
  } catch (error) {
    next(error);
  }
};
