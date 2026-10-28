import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // =============================================
  // Create Listing Packages
  // =============================================
  const basicPackage = await prisma.listingPackage.upsert({
    where: { slug: 'basic' },
    update: {},
    create: {
      name: 'Basic',
      slug: 'basic',
      description: 'Perfect for getting started with your first listing',
      priceInETB: 30,
      durationDays: 30,
      maximumPhotos: 1,
      featuredPlacement: false,
      visibilityLevel: 'STANDARD',
      sortOrder: 1,
      active: true,
    },
  });

  const standardPackage = await prisma.listingPackage.upsert({
    where: { slug: 'standard' },
    update: {},
    create: {
      name: 'Standard',
      slug: 'standard',
      description: 'Great visibility with more photos and longer duration',
      priceInETB: 99,
      durationDays: 60,
      maximumPhotos: 6,
      featuredPlacement: false,
      visibilityLevel: 'ENHANCED',
      sortOrder: 2,
      active: true,
    },
  });

  const premiumPackage = await prisma.listingPackage.upsert({
    where: { slug: 'premium' },
    update: {},
    create: {
      name: 'Premium',
      slug: 'premium',
      description: 'Maximum exposure with featured placement and top visibility',
      priceInETB: 200,
      durationDays: 90,
      maximumPhotos: 12,
      featuredPlacement: true,
      visibilityLevel: 'FEATURED',
      sortOrder: 3,
      active: true,
    },
  });

  console.log('✅ Listing packages created');

  // =============================================
  // Create Admin User
  // =============================================
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@ethiorent.com';
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error('Set ADMIN_PASSWORD before running the database seed.');
  }
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      fullName: 'EthioRent Administrator',
      email: adminEmail,
      phone: '+251911000000',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
    },
  });

  console.log('✅ Admin user created:', adminEmail);

  if (process.env.NODE_ENV !== 'production') {
  // =============================================
  // Create Demo Owner
  // =============================================
  const ownerPassword = await bcrypt.hash('Owner@Demo2024!', 12);
  const demoOwner = await prisma.user.upsert({
    where: { email: 'owner@demo.com' },
    update: {},
    create: {
      fullName: 'Abebe Tesfaye',
      email: 'owner@demo.com',
      phone: '+251912345678',
      passwordHash: ownerPassword,
      role: 'OWNER',
      accountStatus: 'ACTIVE',
      telegram: '@abebet',
      instagram: 'abebetesfaye',
    },
  });

  console.log('✅ Demo owner created');

  // =============================================
  // Create Demo Tenant
  // =============================================
  const tenantPassword = await bcrypt.hash('Tenant@Demo2024!', 12);
  const demoTenant = await prisma.user.upsert({
    where: { email: 'tenant@demo.com' },
    update: {},
    create: {
      fullName: 'Meron Hailu',
      email: 'tenant@demo.com',
      phone: '+251923456789',
      passwordHash: tenantPassword,
      role: 'TENANT',
      accountStatus: 'ACTIVE',
    },
  });

  console.log('✅ Demo tenant created');

  // =============================================
  // Create Demo Properties (for development)
  // =============================================
  const now = new Date();
  const future90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const demoProperties = [
    {
      title: 'Modern 2 Bedroom Apartment in Bole',
      slug: 'modern-2-bedroom-apartment-bole-addis-ababa-demo1',
      description:
        'A beautiful and modern 2 bedroom apartment in the heart of Bole, Addis Ababa. The house is fully furnished, has a modern kitchen, spacious living room, and great ventilation. Perfect for families or professionals.',
      propertyType: 'APARTMENT' as const,
      monthlyRent: 25000,
      bedrooms: 2,
      bathrooms: 2,
      sizeSquareMeters: 120,
      furnished: true,
      parkingAvailable: true,
      waterAvailable: true,
      electricityAvailable: true,
      amenities: ['WiFi Ready', 'Security', 'Generator Backup', 'Elevator'],
      region: 'Addis Ababa',
      city: 'Addis Ababa',
      neighborhood: 'Bole',
      address: 'Bole Road, Near Friendship Mall',
      listingStatus: 'PUBLISHED' as const,
      featuredUntil: future90,
      publishedAt: now,
      expiresAt: future90,
    },
    {
      title: 'Spacious 3 Bedroom House in Kirkos',
      slug: 'spacious-3-bedroom-house-kirkos-addis-ababa-demo2',
      description:
        'Spacious family home with large compound, garden, and modern amenities. Located in a quiet neighborhood in Kirkos sub-city with easy access to major roads.',
      propertyType: 'HOUSE' as const,
      monthlyRent: 35000,
      bedrooms: 3,
      bathrooms: 2,
      sizeSquareMeters: 200,
      furnished: false,
      parkingAvailable: true,
      waterAvailable: true,
      electricityAvailable: true,
      amenities: ['Compound', 'Garden', 'Guard'],
      region: 'Addis Ababa',
      city: 'Addis Ababa',
      neighborhood: 'Kirkos',
      address: 'Kirkos Sub-city, Woreda 8',
      listingStatus: 'PUBLISHED' as const,
      publishedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(future90.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Cozy 1 Bedroom Apartment in Mekanisa',
      slug: 'cozy-1-bedroom-apartment-mekanisa-addis-ababa-demo3',
      description:
        'Affordable and cozy studio apartment perfect for a single professional or couple. Close to public transport and local amenities.',
      propertyType: 'APARTMENT' as const,
      monthlyRent: 12000,
      bedrooms: 1,
      bathrooms: 1,
      sizeSquareMeters: 60,
      furnished: false,
      parkingAvailable: false,
      waterAvailable: true,
      electricityAvailable: true,
      amenities: ['Security'],
      region: 'Addis Ababa',
      city: 'Addis Ababa',
      neighborhood: 'Mekanisa',
      listingStatus: 'PUBLISHED' as const,
      publishedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(future90.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Luxury Villa in Kazanchis',
      slug: 'luxury-villa-kazanchis-addis-ababa-demo4',
      description:
        'Stunning luxury villa with panoramic city views, private pool, fully equipped modern kitchen, and premium finishes throughout. Ideal for executives or diplomatic families.',
      propertyType: 'VILLA' as const,
      monthlyRent: 70000,
      bedrooms: 4,
      bathrooms: 3,
      sizeSquareMeters: 350,
      furnished: true,
      parkingAvailable: true,
      waterAvailable: true,
      electricityAvailable: true,
      amenities: ['Private Pool', 'Home Theater', 'Smart Home', 'Guest House', 'Generator'],
      region: 'Addis Ababa',
      city: 'Addis Ababa',
      neighborhood: 'Kazanchis',
      listingStatus: 'PUBLISHED' as const,
      featuredUntil: future90,
      publishedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      expiresAt: future90,
    },
    {
      title: 'Modern Apartment 2 Bedroom in Bole',
      slug: 'modern-apartment-2-bedroom-bole-demo5',
      description:
        'Well maintained 2 bedroom apartment in Bole sub-city. Great location with easy access to shopping centers, restaurants, and the airport.',
      propertyType: 'APARTMENT' as const,
      monthlyRent: 22000,
      bedrooms: 2,
      bathrooms: 1,
      sizeSquareMeters: 90,
      furnished: false,
      parkingAvailable: false,
      waterAvailable: true,
      electricityAvailable: true,
      amenities: ['Security', 'Generator'],
      region: 'Addis Ababa',
      city: 'Addis Ababa',
      neighborhood: 'Bole',
      listingStatus: 'PUBLISHED' as const,
      publishedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(future90.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const propData of demoProperties) {
    const existing = await prisma.property.findUnique({ where: { slug: propData.slug } });
    if (!existing) {
      await prisma.property.create({
        data: {
          ...propData,
          ownerId: demoOwner.id,
        },
      });
    }
  }

  console.log('✅ Demo properties created');

  // =============================================
  // Site Configuration
  // =============================================
  const configs = [
    { key: 'publication_target_hours', value: '3', label: 'Publication Target Hours' },
    { key: 'site_name', value: 'EthioRent', label: 'Site Name' },
    { key: 'site_tagline', value: 'Find Your Next Home', label: 'Site Tagline' },
  ];

  for (const config of configs) {
    await prisma.siteConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }

  console.log('✅ Site configuration created');
  }
  console.log('');
  console.log('🎉 Database seed completed!');
  console.log('');
  if (process.env.NODE_ENV !== 'production') {
    console.log('Demo owner/tenant credentials are for local development only.');
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
