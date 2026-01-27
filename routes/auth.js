const express = require('express');
const bcrypt = require('bcryptjs');
const { User, UserQuota } = require('../models');
const { generateToken, requireAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();
const SALT_ROUNDS = 10;

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').trim().isLength({ min: 2, max: 100 }),
  async (req, res) => {
    try {
      // Validate inputs
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Datos inválidos',
          details: errors.array()
        });
      }

      const { email, password, name } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });

      if (existingUser) {
        return res.status(400).json({
          error: 'Usuario ya existe',
          message: 'Ya existe una cuenta con este correo electrónico'
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Create user
      const user = await User.create({
        email,
        password_hash: passwordHash,
        name,
        role: 'user',
        email_verified: false
      });

      // Create initial quota record
      await UserQuota.create({
        user_id: user.id,
        chat_requests_used: 0,
        chat_tokens_used: 0,
        quota_reset_date: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      });

      // Generate token
      const token = generateToken(user.id, user.email);

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      });

    } catch (error) {
      console.error('Error en registro:', error);
      res.status(500).json({
        error: 'Error en el registro',
        message: 'No se pudo completar el registro'
      });
    }
  }
);

/**
 * POST /api/auth/login
 * User login
 */
router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  async (req, res) => {
    try {
      // Validate inputs
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Datos inválidos',
          details: errors.array()
        });
      }

      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ where: { email } });

      if (!user) {
        return res.status(401).json({
          error: 'Credenciales inválidas',
          message: 'Correo o contraseña incorrectos'
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Credenciales inválidas',
          message: 'Correo o contraseña incorrectos'
        });
      }

      // Update last_login
      await user.update({ last_login: new Date() });

      // Generate token
      const token = generateToken(user.id, user.email);

      res.json({
        success: true,
        message: 'Inicio de sesión exitoso',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });

    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({
        error: 'Error en el inicio de sesión',
        message: 'No se pudo completar el inicio de sesión'
      });
    }
  }
);

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    // Get user quota
    const quota = await UserQuota.findOne({
      where: { user_id: req.user.id }
    });

    const quotaData = quota ? {
      requests_used: quota.chat_requests_used,
      tokens_used: quota.chat_tokens_used,
      reset_date: quota.quota_reset_date
    } : {
      requests_used: 0,
      tokens_used: 0,
      reset_date: null
    };

    res.json({
      user: req.user,
      quota: quotaData
    });

  } catch (error) {
    console.error('Error obtaining user:', error);
    res.status(500).json({
      error: 'Error al obtener información del usuario'
    });
  }
});

module.exports = router;
