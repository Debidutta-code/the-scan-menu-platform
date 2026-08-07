import { Router } from 'express';
import { developerController } from '../controllers/developer.controller';
import { requireAuth, requireRole, requireRestaurantAccess } from '../middleware/auth';
import { requireFeature } from '../middleware/featureFlag';

const router = Router({ mergeParams: true });

// Require auth, api_webhooks feature flag, tenant membership, and Manager/Super Admin role
router.use(requireAuth as any);
router.use(requireFeature('api_webhooks') as any);
router.use(requireRestaurantAccess as any);
router.use(requireRole('SUPER_ADMIN') as any);

router.get('/api-keys', developerController.listApiKeys);
router.post('/api-keys', developerController.createApiKey);
router.delete('/api-keys/:keyId', developerController.revokeApiKey);

router.get('/webhooks', developerController.listWebhooks);
router.post('/webhooks', developerController.createWebhook);
router.delete('/webhooks/:webhookId', developerController.deleteWebhook);
router.post('/webhooks/:webhookId/test', developerController.testWebhookPing);

export default router;
