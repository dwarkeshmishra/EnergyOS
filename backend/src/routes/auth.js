const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { query } = require('../config/database');
const config = require('../config');
const { validate } = require('../middleware/errorHandler');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/auth/register ──
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('organizationSlug').trim().notEmpty(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password, firstName, lastName, organizationSlug } = req.body;

      // Check if org exists
      const orgResult = await query(
        'SELECT id FROM organizations WHERE slug = $1 AND is_active = true',
        [organizationSlug]
      );
      if (orgResult.rows.length === 0) {
        return res.status(400).json({ error: 'Organization not found' });
      }

      // Check duplicate email
      const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const result = await query(
        `INSERT INTO users (organization_id, email, password_hash, first_name, last_name, role)
         VALUES ($1, $2, $3, $4, $5, 'user')
         RETURNING id, organization_id, email, first_name, last_name, role`,
        [orgResult.rows[0].id, email, passwordHash, firstName, lastName]
      );

      const user = result.rows[0];
      const token = jwt.sign(
        { userId: user.id, role: user.role, organizationId: user.organization_id },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          organizationId: user.organization_id,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/auth/login ──
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const result = await query(
        `SELECT u.*, o.name as org_name, o.slug as org_slug
         FROM users u
         JOIN organizations o ON o.id = u.organization_id
         WHERE u.email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];
      if (!user.is_active) {
        return res.status(403).json({ error: 'Account deactivated' });
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Update last login
      await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

      const token = jwt.sign(
        { userId: user.id, role: user.role, organizationId: user.organization_id },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          organizationId: user.organization_id,
          organization: {
            id: user.organization_id,
            name: user.org_name,
            slug: user.org_slug,
          },
          preferences: user.preferences,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/auth/me ──
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.phone,
              u.preferences, u.organization_id, u.created_at, u.last_login,
              o.name as org_name, o.slug as org_slug, o.type as org_type
       FROM users u
       JOIN organizations o ON o.id = u.organization_id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const u = result.rows[0];
    res.json({
      id: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      role: u.role,
      phone: u.phone,
      preferences: u.preferences,
      organizationId: u.organization_id,
      organization: { id: u.organization_id, name: u.org_name, slug: u.org_slug, type: u.org_type },
      createdAt: u.created_at,
      lastLogin: u.last_login,
    });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/auth/preferences ──
router.put('/preferences', authenticate, async (req, res, next) => {
  try {
    const { preferences } = req.body;
    await query('UPDATE users SET preferences = $1 WHERE id = $2', [JSON.stringify(preferences), req.user.id]);
    res.json({ message: 'Preferences updated', preferences });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
