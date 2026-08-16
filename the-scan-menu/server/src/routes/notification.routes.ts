import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();
const notificationController = new NotificationController();

router.post('/devices/register', requireAuth, notificationController.registerDevice);
router.post('/devices/unregister', requireAuth, notificationController.unregisterDevice);
router.post('/test', requireAuth, notificationController.testPushNotification);

export default router;
