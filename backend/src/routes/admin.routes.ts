import { Router } from 'express';
import {
  getAdminDashboard, getAdminProperties, approveProperty, rejectProperty,
  suspendProperty, getAdminPayments,
  getAdminUsers, updateUserStatus, getAuditLogs, updatePackage,
  getAdminReports, moveToModeration, getAdminRentalRequests,
  getUserTransactions, updateUserBalance,
} from '../controllers/admin.controller';
import { authenticate, requireRole } from '../middleware/auth';
import { acceptPayment, rejectPayment } from '../controllers/owner.controller';

const router = Router();
const adminOnly = requireRole('ADMIN');
const dashboardUserAccess = requireRole('ADMIN', 'OWNER');

router.use(authenticate);

// Dashboard
router.get('/dashboard', adminOnly, getAdminDashboard);

// Properties
router.get('/properties', adminOnly, getAdminProperties);
router.post('/properties/:id/approve', adminOnly, approveProperty);
router.post('/properties/:id/reject', adminOnly, rejectProperty);
router.post('/properties/:id/suspend', adminOnly, suspendProperty);

// Payments
router.get('/payments', adminOnly, getAdminPayments);
router.get('/rental-requests', adminOnly, getAdminRentalRequests);
router.post('/payments/:id/verify', adminOnly, acceptPayment);
router.post('/payments/:id/reject', adminOnly, rejectPayment);
router.post('/payments/:id/review', adminOnly, moveToModeration);

// The owner dashboard uses these user-management endpoints.
router.get('/users', dashboardUserAccess, getAdminUsers);
router.get('/users/:id/transactions', adminOnly, getUserTransactions);
router.patch('/users/:id/status', dashboardUserAccess, updateUserStatus);
router.patch('/users/:id/balance', dashboardUserAccess, updateUserBalance);

// Packages
router.patch('/packages/:id', adminOnly, updatePackage);

// Reports
router.get('/reports', adminOnly, getAdminReports);

// Audit logs
router.get('/audit-logs', adminOnly, getAuditLogs);

export default router;
