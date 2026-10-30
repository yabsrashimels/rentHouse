import app from './app';
import { createServer } from 'http';
import config from './config';
import prisma from './config/database';
import cron from 'node-cron';
import { initializeRealtime } from './realtime';

const PORT = config.port;

// ============================================================
// Scheduled jobs
// ============================================================

// Check for expired listings every hour
cron.schedule('0 * * * *', async () => {
  try {
    console.log('[CRON] Checking for expired listings...');
    
    const now = new Date();
    const expiredListings = await prisma.property.findMany({
      where: {
        listingStatus: 'PUBLISHED',
        expiresAt: { lt: now },
      },
      select: { id: true, ownerId: true, title: true },
    });

    if (expiredListings.length > 0) {
      await prisma.property.updateMany({
        where: {
          id: { in: expiredListings.map(p => p.id) },
          listingStatus: 'PUBLISHED',
          expiresAt: { lt: now },
        },
        data: { listingStatus: 'EXPIRED' },
      });

      // Notify owners
      for (const listing of expiredListings) {
        await prisma.notification.create({
          data: {
            userId: listing.ownerId,
            type: 'LISTING_EXPIRED',
            title: 'Listing Expired',
            message: `Your listing "${listing.title}" has expired. Renew it to make it visible again.`,
            data: { propertyId: listing.id },
          },
        });
      }

      console.log(`[CRON] Expired ${expiredListings.length} listings`);
    }
  } catch (error) {
    console.error('[CRON] Error checking expired listings:', error);
  }
});

// Check for listings expiring soon (7 days warning) - run daily
cron.schedule('0 9 * * *', async () => {
  try {
    console.log('[CRON] Checking for listings expiring soon...');
    
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const expiringSoon = await prisma.property.findMany({
      where: {
        listingStatus: 'PUBLISHED',
        expiresAt: { gte: now, lte: sevenDays },
      },
      select: { id: true, ownerId: true, title: true, expiresAt: true },
    });

    for (const listing of expiringSoon) {
      // Check if we already notified
      const existingNotif = await prisma.notification.findFirst({
        where: {
          userId: listing.ownerId,
          type: 'LISTING_EXPIRING_SOON',
          data: { path: ['propertyId'], equals: listing.id },
          createdAt: { gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
      });

      if (!existingNotif) {
        const daysLeft = Math.ceil((listing.expiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        await prisma.notification.create({
          data: {
            userId: listing.ownerId,
            type: 'LISTING_EXPIRING_SOON',
            title: '⚠️ Listing Expiring Soon',
            message: `Your listing "${listing.title}" expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Renew it to keep it active.`,
            data: { propertyId: listing.id, daysLeft },
          },
        });
      }
    }

    console.log(`[CRON] Notified ${expiringSoon.length} expiring listings`);
  } catch (error) {
    console.error('[CRON] Error checking expiring listings:', error);
  }
});

// ============================================================
// Start server
// ============================================================
async function start() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    const server = createServer(app);
    initializeRealtime(server);
    server.listen(PORT, () => {
      console.log(`🚀 EthioRent API server running on port ${PORT}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
      console.log(`🌐 Frontend URL: ${config.frontendUrl}`);
      console.log(`❤️  Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Database disconnected. Process terminated.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

start();
