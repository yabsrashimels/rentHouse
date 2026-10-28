import { Router } from 'express';
import multer from 'multer';
import {
  getPackages, createPayment, submitPaymentEvidence,
  getMyPayments, getOwnerDashboard, getOwnerProperties,
  getFavorites, addFavorite, removeFavorite,
  updateOwnerProfile, getNotifications, markNotificationsRead,
} from '../controllers/owner.controller';
import { authenticate } from '../middleware/auth';
import { uploadLimiter } from '../middleware/rateLimiter';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Packages (public)
router.get('/packages', getPackages);

// Payments
router.post('/payments', authenticate, createPayment);
router.get('/payments/my', authenticate, getMyPayments);
router.post('/payments/:id/submit-evidence', authenticate, uploadLimiter,
  upload.single('receipt'), submitPaymentEvidence);

// Owner dashboard
router.get('/owner/dashboard', authenticate, getOwnerDashboard);
router.get('/owner/properties', authenticate, getOwnerProperties);
router.get('/owner/profile', authenticate, async (req: any, res: any, next: any) => {
  const { getMe } = await import('../controllers/auth.controller');
  getMe(req, res, next);
});
router.patch('/owner/profile', authenticate, uploadLimiter,
  upload.single('profileImage'), updateOwnerProfile);

// Favorites
router.get('/favorites', authenticate, getFavorites);
router.post('/favorites/:propertyId', authenticate, addFavorite);
router.delete('/favorites/:propertyId', authenticate, removeFavorite);

// Notifications
router.get('/notifications', authenticate, getNotifications);
router.patch('/notifications/read', authenticate, markNotificationsRead);

export default router;
