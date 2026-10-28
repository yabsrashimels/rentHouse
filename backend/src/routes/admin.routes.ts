import { Router } from 'express';
import {
  getAdminDashboard, getAdminProperties, approveProperty, rejectProperty,
  suspendProperty, getAdminPayments, verifyPayment, rejectPayment,
  getAdminUsers, updateUserStatus, getAuditLogs, updatePackage,
  getAdminReports, moveToModeration,
} from '../controllers/admin.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// All admin routes require ADMIN role
router.use(authenticate, requireRole('ADMIN'));

// Dashboard
router.get('/dashboard', getAdminDashboard);

// Properties
router.get('/properties', getAdminProperties);
router.post('/properties/:id/approve', approveProperty);
router.post('/properties/:id/reject', rejectProperty);
router.post('/properties/:id/suspend', suspendProperty);

// Payments
router.get('/payments', getAdminPayments);
router.post('/payments/:id/verify', verifyPayment);
router.post('/payments/:id/reject', rejectPayment);
router.post('/payments/:id/review', moveToModeration);

// Users
router.get('/users', getAdminUsers);
router.patch('/users/:id/status', updateUserStatus);

// Packages
router.patch('/packages/:id', updatePackage);

// Reports
router.get('/reports', getAdminReports);

// Audit logs
router.get('/audit-logs', getAuditLogs);

export default router;
