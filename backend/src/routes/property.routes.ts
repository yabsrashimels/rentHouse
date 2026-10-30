import { Router } from 'express';
import multer from 'multer';
import {
  getProperties, getFeaturedProperties, getRecentProperties,
  getPropertyBySlug, createProperty, updateProperty, deleteProperty,
  getOwnerContact, markAsRented, uploadPropertyImages, deletePropertyImage,
  reorderImages, reportProperty, createRentalRequest, getLocalPropertyImage,
} from '../controllers/property.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { contactRevealLimiter, uploadLimiter } from '../middleware/rateLimiter';

const router = Router();

// Multer setup - memory storage for Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Public routes
router.get('/', optionalAuth, getProperties);
router.get('/featured', optionalAuth, getFeaturedProperties);
router.get('/recent', optionalAuth, getRecentProperties);
router.get('/:slug', optionalAuth, getPropertyBySlug);

// Protected contact reveal
router.get('/:id/contact', authenticate, contactRevealLimiter, getOwnerContact);

// Owner routes
router.post('/', authenticate, createProperty);
router.patch('/:id', authenticate, updateProperty);
router.delete('/:id', authenticate, deleteProperty);
router.post('/:id/mark-rented', authenticate, markAsRented);
router.post('/:id/rental-requests', authenticate, createRentalRequest);

// Image management
router.get('/:id/images/local/:filename', optionalAuth, getLocalPropertyImage);
router.post('/:id/images', authenticate, uploadLimiter,
  upload.array('images', 12), uploadPropertyImages);
router.delete('/:id/images/:imageId', authenticate, deletePropertyImage);
router.patch('/:id/images/reorder', authenticate, reorderImages);

// Reporting
router.post('/:id/report', optionalAuth, reportProperty);

export default router;
