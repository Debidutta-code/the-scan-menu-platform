import { Router } from 'express';
import { healthController } from '../controllers/health.controller';

const router = Router();

router.get('/liveness', healthController.getLiveness);
router.get('/readiness', healthController.getReadiness);

export default router;
