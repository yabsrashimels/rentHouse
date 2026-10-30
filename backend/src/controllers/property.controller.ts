import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { ApiError } from '../utils/ApiError';
import { sendSuccess, sendPaginatedSuccess } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { emitToUser } from '../realtime';
import { paginateQuery, generateUniqueSlug } from '../utils/helpers';
import { cloudinary } from '../config/cloudinary';
import { v4 as uuidv4 } from 'uuid';
import { randomUUID } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import path from 'path';

const propertyImageDirectory = process.env.PROPERTY_IMAGE_STORAGE_DIR || path.join(process.cwd(), 'private_uploads', 'properties');
const imageFileTypes: Record<string, { extension: string; contentType: string }> = {
  'image/jpeg': { extension: '.jpg', contentType: 'image/jpeg' },
  'image/png': { extension: '.png', contentType: 'image/png' },
  'image/webp': { extension: '.webp', contentType: 'image/webp' },
};

export const getProperties = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1', limit = '12',
      city, neighborhood, region, search,
      minRent, maxRent, bedrooms, bathrooms,
      propertyType, furnished, parking, water, electricity,
      minSize, maxSize, featured, sort = 'newest',
    } = req.query as Record<string, string>;

    const { skip, take, page: p, limit: l } = paginateQuery(parseInt(page), parseInt(limit));

    const where: Prisma.PropertyWhereInput = {
      listingStatus: 'PUBLISHED',
      expiresAt: { gt: new Date() },
    };

    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (neighborhood) where.neighborhood = { contains: neighborhood, mode: 'insensitive' };
    if (region) where.region = { contains: region, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { neighborhood: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (minRent) where.monthlyRent = { ...((where.monthlyRent as any) || {}), gte: parseFloat(minRent) };
    if (maxRent) where.monthlyRent = { ...((where.monthlyRent as any) || {}), lte: parseFloat(maxRent) };
    if (bedrooms) where.bedrooms = parseInt(bedrooms);
    if (bathrooms) where.bathrooms = { gte: parseInt(bathrooms) };
    if (propertyType) where.propertyType = propertyType as any;
    if (furnished !== undefined) where.furnished = furnished === 'true';
    if (parking !== undefined) where.parkingAvailable = parking === 'true';
    if (water !== undefined) where.waterAvailable = water === 'true';
    if (electricity !== undefined) where.electricityAvailable = electricity === 'true';
    if (minSize) where.sizeSquareMeters = { ...((where.sizeSquareMeters as any) || {}), gte: parseFloat(minSize) };
    if (maxSize) where.sizeSquareMeters = { ...((where.sizeSquareMeters as any) || {}), lte: parseFloat(maxSize) };
    if (featured === 'true') {
      where.featuredUntil = { gt: new Date() };
    }

    let orderBy: Prisma.PropertyOrderByWithRelationInput[] = [];
    switch (sort) {
      case 'price_asc': orderBy = [{ monthlyRent: 'asc' }]; break;
      case 'price_desc': orderBy = [{ monthlyRent: 'desc' }]; break;
      case 'oldest': orderBy = [{ publishedAt: 'asc' }]; break;
      case 'featured': orderBy = [{ featuredUntil: 'desc' }, { publishedAt: 'desc' }]; break;
      default: orderBy = [{ publishedAt: 'desc' }];
    }

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          images: { where: { isCover: true }, take: 1 },
          owner: { select: { id: true, fullName: true, accountStatus: true } },
          _count: { select: { favorites: true } },
        },
      }),
      prisma.property.count({ where }),
    ]);

    // Add isFavorited for logged-in users
    let favoriteIds = new Set<string>();
    if (req.user) {
      const favorites = await prisma.favorite.findMany({
        where: { userId: req.user.id },
        select: { propertyId: true },
      });
      favoriteIds = new Set(favorites.map(f => f.propertyId));
    }

    const data = properties.map(p => ({
      ...p,
      isFeatured: p.featuredUntil ? p.featuredUntil > new Date() : false,
      isFavorited: favoriteIds.has(p.id),
      coverImage: p.images[0]?.imageUrl || null,
    }));

    sendPaginatedSuccess(res, data, total, p, l);
  } catch (error) {
    next(error);
  }
};

export const getFeaturedProperties = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const properties = await prisma.property.findMany({
      where: {
        listingStatus: 'PUBLISHED',
        expiresAt: { gt: new Date() },
        featuredUntil: { gt: new Date() },
      },
      take: 8,
      orderBy: [{ featuredUntil: 'desc' }, { publishedAt: 'desc' }],
      include: {
        images: { where: { isCover: true }, take: 1 },
        owner: { select: { id: true, fullName: true, accountStatus: true } },
        _count: { select: { favorites: true } },
      },
    });

    let favoriteIds = new Set<string>();
    if (req.user) {
      const favorites = await prisma.favorite.findMany({
        where: { userId: req.user.id },
        select: { propertyId: true },
      });
      favoriteIds = new Set(favorites.map(f => f.propertyId));
    }

    const data = properties.map(p => ({
      ...p,
      isFeatured: true,
      isFavorited: favoriteIds.has(p.id),
      coverImage: p.images[0]?.imageUrl || null,
    }));

    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const getRecentProperties = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const properties = await prisma.property.findMany({
      where: {
        listingStatus: 'PUBLISHED',
        expiresAt: { gt: new Date() },
      },
      take: 8,
      orderBy: { publishedAt: 'desc' },
      include: {
        images: { where: { isCover: true }, take: 1 },
        owner: { select: { id: true, fullName: true, accountStatus: true } },
      },
    });

    const data = properties.map(p => ({
      ...p,
      isFeatured: p.featuredUntil ? p.featuredUntil > new Date() : false,
      coverImage: p.images[0]?.imageUrl || null,
    }));

    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const getPropertyBySlug = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;

    const property = await prisma.property.findFirst({
      where: {
        slug,
        listingStatus: 'PUBLISHED',
        expiresAt: { gt: new Date() },
      },
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        owner: {
          select: {
            id: true, fullName: true, accountStatus: true,
            profileImageUrl: true, createdAt: true,
          },
        },
        _count: { select: { favorites: true } },
      },
    });

    if (!property) {
      throw new ApiError(404, 'Property not found');
    }

    // Increment view count
    await prisma.property.update({
      where: { id: property.id },
      data: { viewCount: { increment: 1 } },
    });

    let isFavorited = false;
    if (req.user) {
      const fav = await prisma.favorite.findUnique({
        where: { userId_propertyId: { userId: req.user.id, propertyId: property.id } },
      });
      isFavorited = !!fav;
    }

    // Get similar properties
    const similar = await prisma.property.findMany({
      where: {
        id: { not: property.id },
        listingStatus: 'PUBLISHED',
        expiresAt: { gt: new Date() },
        city: property.city,
        bedrooms: { gte: property.bedrooms - 1, lte: property.bedrooms + 1 },
      },
      take: 4,
      orderBy: { publishedAt: 'desc' },
      include: { images: { where: { isCover: true }, take: 1 } },
    });

    sendSuccess(res, {
      ...property,
      isFeatured: property.featuredUntil ? property.featuredUntil > new Date() : false,
      isFavorited,
      coverImage: property.images.find(i => i.isCover)?.imageUrl || property.images[0]?.imageUrl || null,
      similar: similar.map(s => ({
        ...s,
        coverImage: s.images[0]?.imageUrl || null,
        isFeatured: s.featuredUntil ? s.featuredUntil > new Date() : false,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const getPropertyById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        owner: { select: { id: true, fullName: true } },
      },
    });

    if (!property) throw new ApiError(404, 'Property not found');

    // Owners can see their own; admin can see all
    if (req.user) {
      if (req.user.role !== 'ADMIN' && property.ownerId !== req.user.id) {
        if (property.listingStatus !== 'PUBLISHED') {
          throw new ApiError(403, 'Access denied');
        }
      }
    } else {
      if (property.listingStatus !== 'PUBLISHED') {
        throw new ApiError(404, 'Property not found');
      }
    }

    sendSuccess(res, property);
  } catch (error) {
    next(error);
  }
};

export const createProperty = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      title, description, propertyType, monthlyRent,
      bedrooms, bathrooms, sizeSquareMeters, furnished,
      parkingAvailable, waterAvailable, electricityAvailable, amenities,
      region, city, neighborhood, address, approximateLatitude,
      approximateLongitude, publicAddressEnabled, contactPhone,
    } = req.body;

    const slug = await generateUniqueSlug(title, uuidv4().substring(0, 8));
    const owner = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { phone: true } });
    if (!owner) throw new ApiError(401, 'Authenticated user not found');

    const property = await prisma.property.create({
      data: {
        ownerId: req.user!.id,
        title, description,
        propertyType,
        monthlyRent: parseFloat(monthlyRent),
        contactPhone: typeof contactPhone === 'string' && contactPhone.trim() ? contactPhone.trim() : owner.phone,
        bedrooms: parseInt(bedrooms),
        bathrooms: parseInt(bathrooms),
        sizeSquareMeters: sizeSquareMeters ? parseFloat(sizeSquareMeters) : null,
        furnished: furnished === true || furnished === 'true',
        parkingAvailable: parkingAvailable === true || parkingAvailable === 'true',
        waterAvailable: waterAvailable !== false && waterAvailable !== 'false',
        electricityAvailable: electricityAvailable !== false && electricityAvailable !== 'false',
        amenities: Array.isArray(amenities) ? amenities : [],
        region, city,
        neighborhood: neighborhood || null,
        address: address || null,
        approximateLatitude: approximateLatitude ? parseFloat(approximateLatitude) : null,
        approximateLongitude: approximateLongitude ? parseFloat(approximateLongitude) : null,
        publicAddressEnabled: publicAddressEnabled === true || publicAddressEnabled === 'true',
        listingStatus: 'DRAFT',
        slug,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: 'PROPERTY_CREATED',
        entityType: 'Property',
        entityId: property.id,
        ipAddress: req.ip,
      },
    });

    emitToUser(req.user!.id, 'listing:updated', { propertyId: property.id, status: property.listingStatus });

    sendSuccess(res, property, 'Property created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateProperty = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) throw new ApiError(404, 'Property not found');

    // Only owner or admin can edit
    if (req.user!.role !== 'ADMIN' && property.ownerId !== req.user!.id) {
      throw new ApiError(403, 'You can only edit your own properties');
    }

    // Owners can't edit published properties directly (must go through review)
    const editableStatuses = ['DRAFT', 'AWAITING_PAYMENT', 'PAYMENT_UNDER_REVIEW', 'REJECTED', 'PUBLISHED', 'EXPIRED'];
    if (req.user!.role !== 'ADMIN' && !editableStatuses.includes(property.listingStatus)) {
      throw new ApiError(400, 'This listing cannot be edited in its current status');
    }

    const updateData: Prisma.PropertyUpdateInput = {};
    const allowedFields = [
      'title', 'description', 'propertyType', 'monthlyRent', 'bedrooms',
      'bathrooms', 'sizeSquareMeters', 'furnished', 'parkingAvailable',
      'waterAvailable', 'electricityAvailable', 'amenities', 'region',
      'city', 'neighborhood', 'address', 'approximateLatitude',
      'approximateLongitude', 'publicAddressEnabled', 'contactPhone',
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        (updateData as any)[field] = req.body[field];
      }
    }

    // Parse numeric/boolean fields
    if (updateData.monthlyRent) updateData.monthlyRent = parseFloat(updateData.monthlyRent as string);
    if (updateData.bedrooms) updateData.bedrooms = parseInt(updateData.bedrooms as string);
    if (updateData.bathrooms) updateData.bathrooms = parseInt(updateData.bathrooms as string);

    const updated = await prisma.property.update({
      where: { id },
      data: updateData,
      include: { images: { orderBy: { displayOrder: 'asc' } } },
    });

    sendSuccess(res, updated, 'Property updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteProperty = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) throw new ApiError(404, 'Property not found');

    if (req.user!.role !== 'ADMIN' && property.ownerId !== req.user!.id) {
      throw new ApiError(403, 'Access denied');
    }

    await prisma.property.delete({ where: { id } });

    sendSuccess(res, null, 'Property deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const getOwnerContact = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required to view contact information');
    }

    const { id } = req.params;

    const property = await prisma.property.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true, phone: true, telegram: true, instagram: true,
            accountStatus: true,
          },
        },
      },
    });

    if (!property || property.listingStatus !== 'PUBLISHED') {
      throw new ApiError(404, 'Property not found');
    }

    if (property.owner.accountStatus !== 'ACTIVE') {
      throw new ApiError(403, 'Owner account is not active');
    }

    // Increment contact reveal count
    await prisma.property.update({
      where: { id },
      data: { contactRevealCount: { increment: 1 } },
    });

    sendSuccess(res, {
      phone: property.contactPhone,
      telegram: property.owner.telegram || null,
      instagram: property.owner.instagram || null,
    });
  } catch (error) {
    next(error);
  }
};

export const createRentalRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id: propertyId } = req.params;
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    if (message.length < 10 || message.length > 2000) {
      throw new ApiError(400, 'Message must be between 10 and 2000 characters');
    }

    const property = await prisma.property.findFirst({
      where: { id: propertyId, listingStatus: 'PUBLISHED', expiresAt: { gt: new Date() } },
    });
    if (!property) throw new ApiError(404, 'Property not found');
    if (property.ownerId === req.user!.id) throw new ApiError(400, 'You cannot request your own property');

    const existing = await prisma.rentalRequest.findFirst({
      where: { propertyId, renterId: req.user!.id, status: 'PENDING' },
    });
    if (existing) throw new ApiError(409, 'You already have a pending request for this property');

    const request = await prisma.$transaction(async tx => {
      const created = await tx.rentalRequest.create({
        data: { propertyId, renterId: req.user!.id, message },
        include: { renter: { select: { id: true, fullName: true, phone: true, email: true } }, property: { select: { id: true, title: true } } },
      });
      await tx.notification.create({
        data: {
          userId: property.ownerId,
          type: 'RENTAL_REQUEST_RECEIVED',
          title: 'New rental request',
          message: `${req.user!.fullName} sent a rental request for "${property.title}".`,
          data: { rentalRequestId: created.id, propertyId },
        },
      });
      return created;
    });

    sendSuccess(res, request, 'Rental request sent', 201);
  } catch (error) {
    next(error);
  }
};

export const getMyRentalRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const requests = await prisma.rentalRequest.findMany({
      where: { renterId: req.user!.id },
      include: { property: { select: { id: true, title: true, slug: true, city: true, listingStatus: true } } },
      orderBy: { createdAt: 'desc' },
    });
    sendSuccess(res, requests);
  } catch (error) {
    next(error);
  }
};

export const getOwnerRentalRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const requests = await prisma.rentalRequest.findMany({
      where: { property: { ownerId: req.user!.id } },
      include: {
        renter: { select: { id: true, fullName: true, phone: true, email: true } },
        property: { select: { id: true, title: true, slug: true, city: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    sendSuccess(res, requests);
  } catch (error) {
    next(error);
  }
};

export const respondToRentalRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { decision } = req.body as { decision?: string };
    if (!['ACCEPTED', 'REJECTED'].includes(decision || '')) throw new ApiError(400, 'Choose accept or reject');

    const request = await prisma.rentalRequest.findUnique({
      where: { id },
      include: { property: { select: { ownerId: true, title: true } } },
    });
    if (!request) throw new ApiError(404, 'Rental request not found');
    if (request.property.ownerId !== req.user!.id) throw new ApiError(403, 'You can only manage requests for your properties');
    if (request.status !== 'PENDING') throw new ApiError(409, 'This rental request has already been reviewed');

    const updated = await prisma.$transaction(async tx => {
      const changed = await tx.rentalRequest.updateMany({
        where: { id, status: 'PENDING', property: { ownerId: req.user!.id } },
        data: { status: decision as 'ACCEPTED' | 'REJECTED', responseMessage: typeof req.body.message === 'string' ? req.body.message.trim() : null, reviewedAt: new Date() },
      });
      if (changed.count !== 1) throw new ApiError(409, 'This rental request has already been reviewed');
      await tx.notification.create({
        data: {
          userId: request.renterId,
          type: 'RENTAL_REQUEST_UPDATED',
          title: `Rental request ${decision === 'ACCEPTED' ? 'accepted' : 'rejected'}`,
          message: `Your request for "${request.property.title}" was ${decision === 'ACCEPTED' ? 'accepted' : 'rejected'}.`,
          data: { rentalRequestId: id, propertyId: request.propertyId, status: decision },
        },
      });
      return tx.rentalRequest.findUnique({ where: { id } });
    });
    sendSuccess(res, updated, 'Rental request updated');
  } catch (error) {
    next(error);
  }
};

export const markAsRented = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) throw new ApiError(404, 'Property not found');

    if (property.ownerId !== req.user!.id) {
      throw new ApiError(403, 'Access denied');
    }

    await prisma.property.update({
      where: { id },
      data: { listingStatus: 'RENTED' },
    });

    sendSuccess(res, null, 'Property marked as rented');
  } catch (error) {
    next(error);
  }
};

export const uploadPropertyImages = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const property = await prisma.property.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!property) throw new ApiError(404, 'Property not found');
    if (property.ownerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new ApiError(403, 'Access denied');
    }

    // Get package photo limit if payment exists
    const payment = await prisma.payment.findFirst({
      where: { propertyId: id },
      orderBy: { createdAt: 'desc' },
      include: { package: true },
    });

    const maxPhotos = payment?.package.maximumPhotos || 12;
    const currentCount = property.images.length;

    if (!req.files || !Array.isArray(req.files)) {
      throw new ApiError(400, 'No images provided');
    }

    const files = req.files as Express.Multer.File[];

    if (currentCount + files.length > maxPhotos) {
      throw new ApiError(400, `Your package allows up to ${maxPhotos} photos. You currently have ${currentCount}.`);
    }

    const uploadedImages = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      if (!file.mimetype.startsWith('image/')) {
        throw new ApiError(400, `File ${file.originalname} is not an image`);
      }

      const fileType = imageFileTypes[file.mimetype];
      if (!fileType) throw new ApiError(400, 'Photos must be JPG, PNG, or WebP images');

      let imageUrl: string;
      let storageKey: string;
      try {
        const result = await new Promise<any>((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            {
              folder: `ethiorent/properties/${id}`,
              transformation: [
                { width: 1200, height: 900, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' },
              ],
              resource_type: 'image',
            },
            (error, result) => error ? reject(error) : resolve(result)
          ).end(file.buffer);
        });
        imageUrl = result.secure_url;
        storageKey = result.public_id;
      } catch (error: any) {
        const filename = `${randomUUID()}${fileType.extension}`;
        await mkdir(path.join(propertyImageDirectory, id), { recursive: true });
        await writeFile(path.join(propertyImageDirectory, id, filename), file.buffer, { flag: 'wx', mode: 0o600 });
        imageUrl = `/api/properties/${id}/images/local/${filename}`;
        storageKey = `local:${filename}`;
        console.warn('Property photo stored on private local disk because Cloudinary upload failed:', error.http_code || error.name || 'upload error');
      }

      const image = await prisma.propertyImage.create({
        data: {
          propertyId: id,
          imageUrl,
          storageKey,
          displayOrder: currentCount + i,
          isCover: currentCount === 0 && i === 0, // First image is cover if no existing images
          altText: property.title,
        },
      });

      uploadedImages.push(image);
    }

    sendSuccess(res, uploadedImages, 'Images uploaded successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getLocalPropertyImage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id, filename } = req.params;
    if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(filename)) throw new ApiError(404, 'Image not found');

    const image = await prisma.propertyImage.findFirst({
      where: { propertyId: id, storageKey: `local:${filename}` },
      include: { property: { select: { ownerId: true, listingStatus: true } } },
    });
    if (!image) throw new ApiError(404, 'Image not found');
    if (image.property.listingStatus !== 'PUBLISHED' && req.user?.role !== 'ADMIN' && req.user?.id !== image.property.ownerId) {
      throw new ApiError(404, 'Image not found');
    }

    const fileType = Object.values(imageFileTypes).find(type => filename.endsWith(type.extension));
    if (!fileType) throw new ApiError(404, 'Image not found');
    const imageBuffer = await readFile(path.join(propertyImageDirectory, id, filename));
    res.type(fileType.contentType).set('Cache-Control', 'private, max-age=300').send(imageBuffer);
  } catch (error) {
    next(error);
  }
};

export const deletePropertyImage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id, imageId } = req.params;

    const image = await prisma.propertyImage.findFirst({
      where: { id: imageId, propertyId: id },
    });

    if (!image) throw new ApiError(404, 'Image not found');

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) throw new ApiError(404, 'Property not found');

    if (property.ownerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new ApiError(403, 'Access denied');
    }

    if (image.storageKey?.startsWith('local:')) {
      try {
        await unlink(path.join(propertyImageDirectory, id, image.storageKey.slice('local:'.length)));
      } catch (error: any) {
        if (error.code !== 'ENOENT') throw error;
      }
    } else if (image.storageKey) {
      try {
        await cloudinary.uploader.destroy(image.storageKey);
      } catch (e) {
        console.error('Failed to delete from Cloudinary:', e);
      }
    }

    await prisma.propertyImage.delete({ where: { id: imageId } });

    // If deleted image was cover, make next image cover
    if (image.isCover) {
      const nextImage = await prisma.propertyImage.findFirst({
        where: { propertyId: id },
        orderBy: { displayOrder: 'asc' },
      });
      if (nextImage) {
        await prisma.propertyImage.update({
          where: { id: nextImage.id },
          data: { isCover: true },
        });
      }
    }

    sendSuccess(res, null, 'Image deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const reorderImages = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { imageOrders } = req.body; // [{ id: string, displayOrder: number, isCover: boolean }]

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) throw new ApiError(404, 'Property not found');

    if (property.ownerId !== req.user!.id) {
      throw new ApiError(403, 'Access denied');
    }

    await prisma.$transaction(
      imageOrders.map((item: { id: string; displayOrder: number; isCover: boolean }) =>
        prisma.propertyImage.update({
          where: { id: item.id, propertyId: id },
          data: { displayOrder: item.displayOrder, isCover: item.isCover || false },
        })
      )
    );

    sendSuccess(res, null, 'Images reordered successfully');
  } catch (error) {
    next(error);
  }
};

export const reportProperty = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason, description } = req.body;

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) throw new ApiError(404, 'Property not found');

    await prisma.listingReport.create({
      data: {
        propertyId: id,
        reporterId: req.user?.id || null,
        reason,
        description: description || null,
        reportStatus: 'OPEN',
      },
    });

    sendSuccess(res, null, 'Report submitted successfully. Thank you for helping keep EthioRent safe.');
  } catch (error) {
    next(error);
  }
};
