import slugify from 'slugify';
import prisma from '../config/database';

export const generateSlug = async (title: string, id?: string): Promise<string> => {
  const baseSlug = slugify(title, {
    lower: true,
    strict: true,
    trim: true,
  });

  // Check for uniqueness
  let slug = baseSlug;
  let counter = 0;

  while (true) {
    const existing = await prisma.property.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing || (id && existing.id === id)) {
      break;
    }

    counter++;
    slug = `${baseSlug}-${counter}`;
  }

  return slug;
};

export const generateUniqueSlug = async (title: string, suffix: string): Promise<string> => {
  const base = slugify(title, { lower: true, strict: true, trim: true });
  const safeSuffix = suffix.substring(0, 8);
  return `${base}-${safeSuffix}`;
};

export const paginateQuery = (page: number, limit: number) => {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(50, Math.max(1, limit));
  const skip = (safePage - 1) * safeLimit;
  return { skip, take: safeLimit, page: safePage, limit: safeLimit };
};

export const formatETB = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `ETB ${num.toLocaleString('en-ET')}`;
};

export const sanitizePhone = (phone: string): string => {
  // Normalize Ethiopian phone numbers
  const cleaned = phone.replace(/\s+/g, '').replace(/-/g, '');
  if (cleaned.startsWith('0')) {
    return '+251' + cleaned.substring(1);
  }
  if (cleaned.startsWith('251') && !cleaned.startsWith('+')) {
    return '+' + cleaned;
  }
  return cleaned;
};

export const maskPhone = (phone: string): string => {
  if (phone.length <= 4) return phone;
  return phone.substring(0, phone.length - 4).replace(/\d/g, '*') + phone.slice(-4);
};
