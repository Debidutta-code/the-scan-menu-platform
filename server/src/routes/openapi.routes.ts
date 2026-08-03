import { Router } from 'express';
import { openApiController } from '../controllers/openapi.controller';
import { requireApiKey } from '../middleware/apiKey.middleware';

const router = Router();

// Public OpenAPI Endpoints (authenticated via X-API-Key or Authorization Bearer)
router.get('/menu', requireApiKey('menu:read'), openApiController.getMenu);
router.get('/orders', requireApiKey('orders:read'), openApiController.getOrders);
router.post('/orders', requireApiKey('orders:write'), openApiController.createOrder);

router.get('/webhooks', requireApiKey('webhooks:manage'), openApiController.getWebhooks);
router.post('/webhooks', requireApiKey('webhooks:manage'), openApiController.createWebhook);
router.delete('/webhooks/:webhookId', requireApiKey('webhooks:manage'), openApiController.deleteWebhook);

export default router;
