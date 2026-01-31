const express = require('express');
const bcrypt = require('bcryptjs');
const { User, UserQuota } = require('../models');
const { generateToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/v2/auth/login
 * Simplified Login Endpoint
 */
router.post('/login', async (req, res) => {
    console.log('Login V2 Attempt:', req.body.email); // Debug log

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email y contraseña son requeridos'
            });
        }

        // 1. Find User
        const user = await User.findOne({ where: { email } });
        if (!user) {
            console.log('Login V2 Failed: User not found');
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // 2. Check Password
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            console.log('Login V2 Failed: Invalid password');
            return res.status(401).json({
                success: false,
                message: 'Credenciales inválidas'
            });
        }

        // 3. Update Last Login
        await user.update({ last_login: new Date() });

        // 4. Generate Token
        const token = generateToken(user.id, user.email);

        console.log('Login V2 Success:', user.email);

        // 5. Send Response
        return res.json({
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
        console.error('Login V2 Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            debug_error: error.message // Temporary for debugging
        });
    }
});

/**
 * GET /api/v2/auth/me
 * Get current user info
 */
router.get('/me', requireAuth, async (req, res) => {
    try {
        const quota = await UserQuota.findOne({ where: { user_id: req.user.id } });

        res.json({
            success: true,
            user: req.user,
            quota: quota ? {
                requests_used: quota.chat_requests_used,
                tokens_used: quota.chat_tokens_used,
                reset_date: quota.quota_reset_date
            } : null
        });
    } catch (error) {
        console.error('Me V2 Error:', error);
        res.status(500).json({ success: false, message: 'Error recuperando sesión' });
    }
});

module.exports = router;
