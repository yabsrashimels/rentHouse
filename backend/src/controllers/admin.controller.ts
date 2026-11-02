import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { ApiError } from '../utils/ApiError';
import { sendSuccess, sendPaginatedSuccess } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { emitToUser } from '../realtime';
import { paginateQuery } from '../utils/helpers';
import { acceptPayment as acceptReviewedPayment, rejectPayment as rejectReviewedPayment } from './owner.controller';

export const getAdminDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    
    const [
      totalUsers, totalOwners, totalTenants, totalListings,
      publishedListings, pendingListings, expiredListings, rentedProperties,
      pendingPayments, verifiedPayments,
      rentalRequests, pendingRentalRequests,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'OWNER' } }),
      prisma.user.count({ where: { role: 'TENANT' } }),
      prisma.property.count(),
      prisma.property.count({ where: { listingStatus: 'PUBLISHED', expiresAt: { gt: now } } }),
      prisma.property.count({ where: { listingStatus: { in: ['AWAITING_MODERATION', 'PAYMENT_UNDER_REVIEW'] } } }),
      prisma.property.count({ where: { OR: [{ listingStatus: 'EXPIRED' }, { expiresAt: { lt: now }, listingStatus: 'PUBLISHED' }] } }),
      prisma.property.count({ where: { listingStatus: 'RENTED' } }),
      prisma.payment.count({ where: { paymentStatus: { in: ['SUBMITTED', 'UNDER_REVIEW'] } } }),
      prisma.payment.count({ where: { paymentStatus: 'VERIFIED' } }),
      prisma.rentalRequest.count(),
      prisma.rentalRequest.count({ where: { status: 'PENDING' } }),
    ]);

    const revenueResult = await prisma.payment.aggregate({
      where: { paymentStatus: 'VERIFIED' },
      _sum: { amountInETB: true },
    });

    const totalRevenue = revenueResult._sum.amountInETB?.toString() || '0';

    const recentPayments = await prisma.payment.findMany({
      where: { paymentStatus: { in: ['SUBMITTED', 'UNDER_REVIEW'] } },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true, email: true, phone: true } },
        property: { select: { title: true, city: true } },
        package: { select: { name: true } },
      },
    });

    const overdueReviews = await prisma.payment.findMany({
      where: {
        paymentStatus: 'SUBMITTED',
        createdAt: { lt: new Date(now.getTime() - 3 * 60 * 60 * 1000) }, // Older than 3 hours
      },
      take: 5,
      include: {
        user: { select: { fullName: true, email: true } },
        property: { select: { title: true } },
      },
    });

    sendSuccess(res, {
      stats: {
        totalUsers, totalOwners, totalTenants, totalListings,
        unpublishedListings: totalListings - publishedListings,
        publishedListings, pendingListings, expiredListings, rentedProperties,
        pendingPayments, verifiedPayments, totalRevenue,
        rentalRequests, pendingRentalRequests,
      },
      recentPayments,
      overdueReviews,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminProperties = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', status, city, search } = req.query as Record<string, string>;
    const { skip, take, page: p, limit: l } = paginateQuery(parseInt(page), parseInt(limit));

    const where: any = {};
    if (status) where.listingStatus = status;
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { owner: { fullName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          images: { where: { isCover: true }, take: 1 },
          owner: { select: { id: true, fullName: true, email: true, phone: true } },
          payments: { orderBy: { createdAt: 'desc' }, take: 1, include: { package: true } },
        },
      }),
      prisma.property.count({ where }),
    ]);

    sendPaginatedSuccess(res, properties.map(p => ({
      ...p,
      coverImage: p.images[0]?.imageUrl || null,
    })), total, p, l);
  } catch (error) {
    next(error);
  }
};

export const approveProperty = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const property = await prisma.property.findUnique({
      where: { id },
      include: { payments: { where: { paymentStatus: 'VERIFIED' }, take: 1, include: { package: true } } },
    });

    if (!property) throw new ApiError(404, 'Property not found');

    if (!['AWAITING_MODERATION', 'PAYMENT_UNDER_REVIEW'].includes(property.listingStatus)) {
      throw new ApiError(400, 'Property is not awaiting approval');
    }

    throw new ApiError(409, 'Listings are published only when an administrator accepts the associated advertising payment');
  } catch (error) {
    next(error);
  }
};

export const rejectProperty = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) throw new ApiError(400, 'Rejection reason is required');

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) throw new ApiError(404, 'Property not found');

    await prisma.property.update({
      where: { id },
      data: { listingStatus: 'REJECTED' },
    });

    await prisma.notification.create({
      data: {
        userId: property.ownerId,
        type: 'LISTING_REJECTED',
        title: 'Listing Rejected',
        message: `Your property "${property.title}" was rejected. Reason: ${reason}`,
        data: { propertyId: id, reason },
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        adminId: req.user!.id,
        action: 'PROPERTY_REJECTED',
        entityType: 'Property',
        entityId: id,
        relevantMetadata: { reason },
        ipAddress: req.ip,
      },
    });

    emitToUser(property.ownerId, 'listing:updated', { propertyId: id, status: 'REJECTED' });

    sendSuccess(res, null, 'Property rejected');
  } catch (error) {
    next(error);
  }
};

export const suspendProperty = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) throw new ApiError(404, 'Property not found');

    await prisma.property.update({
      where: { id },
      data: { listingStatus: 'SUSPENDED' },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        adminId: req.user!.id,
        action: 'PROPERTY_SUSPENDED',
        entityType: 'Property',
        entityId: id,
        relevantMetadata: { reason },
        ipAddress: req.ip,
      },
    });

    sendSuccess(res, null, 'Property suspended');
  } catch (error) {
    next(error);
  }
};

export const getAdminPayments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', status, method } = req.query as Record<string, string>;
    const { skip, take, page: p, limit: l } = paginateQuery(parseInt(page), parseInt(limit));

    const where: any = {};
    if (status) where.paymentStatus = status;
    if (method) where.paymentMethod = method;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, email: true, phone: true } },
          property: {
            select: {
              id: true, title: true, city: true, slug: true,
              images: { orderBy: { displayOrder: 'asc' } },
            },
          },
          package: true,
          verifiedBy: { select: { id: true, fullName: true } },
          verificationHistory: { orderBy: { createdAt: 'desc' } },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    sendPaginatedSuccess(res, payments, total, p, l);
  } catch (error) {
    next(error);
  }
};

export const getAdminRentalRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '20', status } = req.query as Record<string, string>;
    const { skip, take, page: p, limit: l } = paginateQuery(parseInt(page), parseInt(limit));
    const where: any = status ? { status } : {};
    const [requests, total] = await Promise.all([
      prisma.rentalRequest.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: {
          renter: { select: { id: true, fullName: true, email: true, phone: true } },
          property: { select: { id: true, title: true, slug: true, city: true, owner: { select: { id: true, fullName: true, phone: true, email: true } } } },
        },
      }),
      prisma.rentalRequest.count({ where }),
    ]);
    sendPaginatedSuccess(res, requests, total, p, l);
  } catch (error) {
    next(error);
  }
};

export const verifyPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  return acceptReviewedPayment(req, res, next);
};

export const rejectPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  return rejectReviewedPayment(req, res, next);
};

export const getAdminUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '50', search, role, status } = req.query as Record<string, string>;
    const { skip, take, page: p, limit: l } = paginateQuery(parseInt(page), parseInt(limit));

    const where: any = {};
    if (role) where.role = role as any;
    if (status) where.accountStatus = status as any;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          role: true,
          accountStatus: true,
          balance: true,
          createdAt: true,
          properties: {
            select: {
              id: true,
              title: true,
              monthlyRent: true,
              listingStatus: true,
            },
          },
          payments: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              amountInETB: true,
              paymentStatus: true,
              paymentMethod: true,
              transactionReference: true,
              createdAt: true,
              package: { select: { name: true } },
              property: { select: { title: true } },
            },
          },
          _count: { select: { properties: true, payments: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const formattedUsers = users.map(u => {
      const username = u.email ? u.email.split('@')[0] : u.fullName.toLowerCase().replace(/\s+/g, '_');
      const balanceNum = Number(u.balance || 0);

      // Total earnings for user from their rented properties + balance
      const rentedRent = u.properties
        .filter(prop => prop.listingStatus === 'RENTED')
        .reduce((sum, prop) => sum + Number(prop.monthlyRent), 0);
      const totalEarnings = rentedRent + balanceNum;

      // Total paid by this user for advertising
      const totalPaid = u.payments
        .filter(pay => pay.paymentStatus === 'VERIFIED')
        .reduce((sum, pay) => sum + Number(pay.amountInETB), 0);

      return {
        id: u.id,
        fullName: u.fullName,
        username,
        email: u.email,
        phone: u.phone,
        role: u.role,
        accountStatus: u.accountStatus,
        balance: balanceNum,
        totalEarnings,
        totalPaid,
        propertiesCount: u._count.properties,
        paymentsCount: u._count.payments,
        createdAt: u.createdAt,
        transactionHistory: u.payments.map(pay => ({
          id: pay.id,
          amountInETB: Number(pay.amountInETB),
          paymentStatus: pay.paymentStatus,
          paymentMethod: pay.paymentMethod,
          transactionReference: pay.transactionReference,
          packageName: pay.package?.name || 'Package',
          propertyTitle: pay.property?.title || 'Listing',
          createdAt: pay.createdAt,
        })),
      };
    });

    sendPaginatedSuccess(res, formattedUsers, total, p, l);
  } catch (error) {
    next(error);
  }
};

export const getUserTransactions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        accountStatus: true,
        balance: true,
        createdAt: true,
      },
    });
    if (!user) throw new ApiError(404, 'User not found');

    const payments = await prisma.payment.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        package: { select: { name: true, priceInETB: true } },
        property: { select: { id: true, title: true, city: true, monthlyRent: true } },
      },
    });

    const username = user.email ? user.email.split('@')[0] : user.fullName.toLowerCase().replace(/\s+/g, '_');

    sendSuccess(res, {
      user: {
        ...user,
        username,
        balance: Number(user.balance || 0),
      },
      payments: payments.map(pay => ({
        id: pay.id,
        amountInETB: Number(pay.amountInETB),
        paymentStatus: pay.paymentStatus,
        paymentMethod: pay.paymentMethod,
        transactionReference: pay.transactionReference,
        packageName: pay.package?.name || 'Advertising',
        propertyTitle: pay.property?.title || 'Property',
        createdAt: pay.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserBalance = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new ApiError(400, 'Valid numeric amount is required');
    }
    if (!reason || typeof reason !== 'string') {
      throw new ApiError(400, 'Reason for balance adjustment is required');
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiError(404, 'User not found');

    const newBalance = Math.max(0, Number(user.balance) + amount);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { balance: newBalance },
      });

      await tx.auditLog.create({
        data: {
          actorId: req.user!.id,
          adminId: req.user!.id,
          action: 'USER_BALANCE_ADJUSTED',
          entityType: 'User',
          entityId: id,
          relevantMetadata: { previousBalance: Number(user.balance), adjustedAmount: amount, newBalance, reason },
          ipAddress: req.ip,
        },
      });
    });

    sendSuccess(res, { balance: newBalance }, 'User balance updated successfully');
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['TENANT', 'OWNER', 'ADMIN'].includes(role)) {
      throw new ApiError(400, 'A valid role is required: TENANT, OWNER, or ADMIN');
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiError(404, 'User not found');

    if (role === 'OWNER' || role === 'ADMIN') {
      const actorEmail = req.user?.email?.toLowerCase();
      if (actorEmail !== 'shimelsyabsra565@gmail.com') {
        throw new ApiError(403, 'Only the designated owner can grant OWNER or ADMIN roles');
      }
    }

    if (role === 'OWNER') {
      const ownerCount = await prisma.user.count({ where: { role: 'OWNER' } });
      if (ownerCount > 0 && user.role !== 'OWNER') {
        throw new ApiError(409, 'Only one owner account is allowed. Reassign the current owner before creating another.');
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        accountStatus: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        adminId: req.user!.id,
        action: 'USER_ROLE_UPDATED',
        entityType: 'User',
        entityId: id,
        relevantMetadata: { previousRole: user.role, newRole: role },
        ipAddress: req.ip,
      },
    });

    sendSuccess(res, { user: updatedUser }, 'User role updated successfully');
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new ApiError(404, 'User not found');

    // Prevent admins from suspending themselves
    if (id === req.user!.id) {
      throw new ApiError(400, 'You cannot change your own account status');
    }

    await prisma.user.update({
      where: { id },
      data: { accountStatus: status },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        adminId: req.user!.id,
        action: `USER_STATUS_${status}`,
        entityType: 'User',
        entityId: id,
        relevantMetadata: { reason },
        ipAddress: req.ip,
      },
    });

    sendSuccess(res, null, `User account ${status.toLowerCase()}`);
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '50', entityType, action } = req.query as Record<string, string>;
    const { skip, take, page: p, limit: l } = paginateQuery(parseInt(page), parseInt(limit));

    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (action) where.action = { contains: action, mode: 'insensitive' };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { id: true, fullName: true, email: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    sendPaginatedSuccess(res, logs, total, p, l);
  } catch (error) {
    next(error);
  }
};

export const updatePackage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, description, priceInETB, durationDays, maximumPhotos, featuredPlacement, visibilityLevel, active } = req.body;

    const pkg = await prisma.listingPackage.findUnique({ where: { id } });
    if (!pkg) throw new ApiError(404, 'Package not found');

    const updated = await prisma.listingPackage.update({
      where: { id },
      data: {
        name: name || pkg.name,
        description: description !== undefined ? description : pkg.description,
        priceInETB: priceInETB !== undefined ? parseFloat(priceInETB) : pkg.priceInETB,
        durationDays: durationDays !== undefined ? parseInt(durationDays) : pkg.durationDays,
        maximumPhotos: maximumPhotos !== undefined ? parseInt(maximumPhotos) : pkg.maximumPhotos,
        featuredPlacement: featuredPlacement !== undefined ? featuredPlacement : pkg.featuredPlacement,
        visibilityLevel: visibilityLevel || pkg.visibilityLevel,
        active: active !== undefined ? active : pkg.active,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        adminId: req.user!.id,
        action: 'PACKAGE_UPDATED',
        entityType: 'ListingPackage',
        entityId: id,
        relevantMetadata: req.body,
        ipAddress: req.ip,
      },
    });

    sendSuccess(res, updated, 'Package updated successfully');
  } catch (error) {
    next(error);
  }
};

export const getAdminReports = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reports = await prisma.listingReport.findMany({
      where: { reportStatus: 'OPEN' },
      include: {
        property: { select: { id: true, title: true, slug: true, ownerId: true } },
        reporter: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, reports);
  } catch (error) {
    next(error);
  }
};

export const moveToModeration = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) throw new ApiError(404, 'Payment not found');

    const updated = await prisma.payment.updateMany({
      where: { id, paymentStatus: 'SUBMITTED' },
      data: { paymentStatus: 'UNDER_REVIEW' },
    });
    if (updated.count !== 1) throw new ApiError(409, 'Only newly submitted payments can be moved to review');

    sendSuccess(res, null, 'Payment moved to under review');
  } catch (error) {
    next(error);
  }
};
