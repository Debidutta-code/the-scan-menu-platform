import re

with open('server/src/routes/public.routes.ts', 'r') as f:
    content = f.read()

search_routes = """// Order retrieval for public tracker
router.get('/orders/:orderId', publicController.getOrder);"""

replace_routes = """// Order retrieval for public tracker
router.get('/orders/:orderId', publicController.getOrder);

// Public Taxes lookup
router.get('/restaurants/:restaurantId/taxes', async (req, res, next) => {
    try {
        const { Tax } = await import('../models/Tax');
        const taxes = await Tax.find({ restaurantId: req.params.restaurantId, isActive: true });
        res.json({ success: true, data: taxes });
    } catch (e) {
        next(e);
    }
});"""
content = content.replace(search_routes, replace_routes)

with open('server/src/routes/public.routes.ts', 'w') as f:
    f.write(content)
