const express = require('express');
const { query } = require('../config/database');
const { authenticate, tenantGuard } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);
router.use(tenantGuard);

// ── GET /api/alerts ──
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.role === 'user' ? req.user.id : null;
    let whereClause = 'a.organization_id = $1';
    const params = [req.tenantId];
    if (userId) {
      whereClause += ` AND (a.user_id = $${params.length + 1} OR a.user_id IS NULL)`;
      params.push(userId);
    }
    const limit = parseInt(req.query.limit) || 50;
    params.push(limit);

    const result = await query(`
      SELECT a.*, sm.meter_serial
      FROM alerts a
      LEFT JOIN smart_meters sm ON sm.id = a.meter_id
      WHERE ${whereClause}
      ORDER BY a.created_at DESC LIMIT $${params.length}
    `, params);

    const unread = await query(`
      SELECT COUNT(*) AS count FROM alerts
      WHERE ${whereClause} AND is_read = false
    `, params.slice(0, -1));

    res.json({ alerts: result.rows, unread_count: parseInt(unread.rows[0].count) });
  } catch (err) { next(err); }
});

// ── PUT /api/alerts/:id/read ──
router.put('/:id/read', async (req, res, next) => {
  try {
    await query('UPDATE alerts SET is_read = true WHERE id = $1 AND organization_id = $2',
      [req.params.id, req.tenantId]);
    res.json({ message: 'Marked as read' });
  } catch (err) { next(err); }
});

// ── PUT /api/alerts/read-all ──
router.put('/read/all', async (req, res, next) => {
  try {
    const userId = req.user.role === 'user' ? req.user.id : null;
    if (userId) {
      await query('UPDATE alerts SET is_read = true WHERE organization_id = $1 AND user_id = $2',
        [req.tenantId, userId]);
    } else {
      await query('UPDATE alerts SET is_read = true WHERE organization_id = $1', [req.tenantId]);
    }
    res.json({ message: 'All marked as read' });
  } catch (err) { next(err); }
});

module.exports = router;
