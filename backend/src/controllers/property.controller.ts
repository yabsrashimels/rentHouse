import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { ApiError } from '../utils/ApiError';
import { sendSuccess, sendPaginatedSuccess } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { paginateQuery, generateUniqueSlug } from '../utils/helpers';
import { cloudinary } from '../config/cloudinary';
import { v4 as uuidv4 } from 'uuid';

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
      approximateLongitude, publicAddressEnabled,
    } = req.body;

    const slug = await generateUniqueSlug(title, uuidv4().substring(0, 8));

    const property = await prisma.property.create({
      data: {
        ownerId: req.user!.id,
        title, description,
        propertyType,
        monthlyRent: parseFloat(monthlyRent),
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
    const editableStatuses = ['DRAFT', 'AWAITING_PAYMENT', 'REJECTED'];
    if (req.user!.role !== 'ADMIN' && !editableStatuses.includes(property.listingStatus)) {
      throw new ApiError(400, 'This listing cannot be edited in its current status');
    }

    const updateData: Prisma.PropertyUpdateInput = {};
    const allowedFields = [
      'title', 'description', 'propertyType', 'monthlyRent', 'bedrooms',
      'bathrooms', 'sizeSquareMeters', 'furnished', 'parkingAvailable',
      'waterAvailable', 'electricityAvailable', 'amenities', 'region',
      'city', 'neighborhood', 'address', 'approximateLatitude',
      'approximateLongitude', 'publicAddressEnabled',
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
      phone: property.owner.phone,
      telegram: property.owner.telegram || null,
      instagram: property.owner.instagram || null,
    });
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
      where: { propertyId: id, paymentStatus: { in: ['VERIFIED', 'SUBMITTED', 'UNDER_REVIEW'] } },
      include: { package: true },
    });

    const maxPhotos = payment?.package.maximumPhotos || 1;
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

      // Upload to Cloudinary
      const result = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: `ethiorent/properties/${id}`,
            transformation: [
              { width: 1200, height: 900, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' },
            ],
            resource_type: 'image',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(file.buffer);
      });

      const image = await prisma.propertyImage.create({
        data: {
          propertyId: id,
          imageUrl: result.secure_url,
          storageKey: result.public_id,
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

    // Delete from Cloudinary
    if (image.storageKey) {
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
