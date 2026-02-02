const express = require('express');
const router = express.Router();
const { Chat, Message } = require('../models');
const { authMiddleware, optionalAuth, requireAuth } = require('../middleware/auth');
const { strictLimiter } = require('../middleware/rateLimiter');
const { chatValidationRules, handleValidationErrors } = require('../middleware/validator');
const aiService = require('../services/aiService');
const { securityLogger } = require('../utils/logger');
const { alertPresets } = require('../utils/alerting');

// Helper for client IP
const getClientIP = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.headers['client-ip'] ||
        req.ip ||
        'unknown';
};

// ==========================================
// CHAT COMPLETION
// ==========================================
router.post('/chat',
    optionalAuth,
    strictLimiter,
    chatValidationRules,
    handleValidationErrors,
    async (req, res, next) => {
        const startTime = Date.now();
        const clientIP = getClientIP(req);

        // Strict req.user.id usage
        const isAuthenticated = req.user && req.user.id;
        const chatId = req.body.chatId || req.body.currentChatId;

        try {
            securityLogger.info('Chat request started', {
                ip: clientIP,
                messageCount: req.body.messages?.length,
                authenticated: !!isAuthenticated,
                chatId: chatId || 'new'
            });

            const body = req.body;

            // 1. Build Messages
            const messages = aiService.buildMessages(body.messages, body.pdfContext);

            // 2. Call AI Service
            const groqData = await aiService.generateResponse(messages, clientIP);

            // 3. Save to DB (if authenticated)
            let savedChatId = null;

            if (isAuthenticated) {
                try {
                    let chat;

                    if (chatId) {
                        // Verify ownership
                        chat = await Chat.findOne({
                            where: { id: chatId, user_id: req.user.id }
                        });

                        if (!chat) {
                            securityLogger.warn('Chat not found or unauthorized during save', { chatId, userId: req.user.id });
                            // Proceed without saving to avoid breaking the user experience entirely? 
                            // Or fail? Logic in server.js was "warn then continue" (implied by if (!chat) else ... )
                            // Actually server.js logic: if (chatId) find... if (!chat) warn... else update.
                            // Then "if (chat)" save messages. So if not found, it wouldn't save messages.
                        } else {
                            if (body.pdfContext !== undefined) {
                                await chat.update({
                                    pdf_content: body.pdfContext,
                                    pdf_pages: body.pdf_pages ? JSON.stringify(body.pdf_pages) : chat.pdf_pages,
                                    total_pages: body.total_pages || chat.total_pages
                                });
                            }
                        }
                    } else {
                        // Create New
                        chat = await Chat.create({
                            user_id: req.user.id,
                            title: aiService.generateTitle(body.messages?.[0]?.content),
                            pdf_content: body.pdfContext || null,
                            pdf_pages: body.pdf_pages ? JSON.stringify(body.pdf_pages) : null,
                            total_pages: body.total_pages || null
                        });
                    }

                    if (chat) {
                        await Message.create({
                            chat_id: chat.id,
                            role: 'user',
                            content: body.messages[body.messages.length - 1]?.content
                        });

                        await Message.create({
                            chat_id: chat.id,
                            role: 'assistant',
                            content: groqData.choices[0].message.content,
                            tokens_used: groqData.usage?.total_tokens || 0
                        });

                        await chat.update({ updatedAt: new Date() });
                        savedChatId = chat.id;
                    }

                } catch (dbError) {
                    securityLogger.error('Error saving chat to database', dbError, { userId: req.user.id });
                    // Don't fail request
                }
            }

            // 4. Response
            const duration = Date.now() - startTime;
            securityLogger.successfulRequest('/api/chat', duration, {
                ip: clientIP,
                tokensUsed: groqData.usage?.total_tokens || 0,
                saved: !!savedChatId
            });

            res.json({
                ...groqData,
                chatId: savedChatId,
                saved: !!savedChatId
            });

        } catch (error) {
            next(error); // Pass to global handler
        }
    }
);

// ==========================================
// CHAT MANAGEMENT (CRUD)
// ==========================================

// GET /api/chats
router.get('/chats', authMiddleware, async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            const err = new Error('No autenticado');
            err.status = 401;
            throw err;
        }

        const chats = await Chat.findAll({
            where: { user_id: req.user.id },
            order: [['updatedAt', 'DESC']],
            limit: 50,
            attributes: ['id', 'title', 'updatedAt', 'pdf_content', 'total_pages']
        });
        res.json({ chats });
    } catch (error) {
        next(error);
    }
});

// POST /api/chats (Manual creation)
router.post('/chats', authMiddleware, async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            const err = new Error('No autenticado');
            err.status = 401;
            throw err;
        }

        const { title, initialMessage, pdf_content, pdf_pages, total_pages } = req.body;
        const chat = await Chat.create({
            user_id: req.user.id,
            title: title || 'Nuevo Chat',
            pdf_content: pdf_content || null,
            pdf_pages: pdf_pages ? JSON.stringify(pdf_pages) : null,
            total_pages: total_pages || null
        });

        if (initialMessage) {
            await Message.create({
                chat_id: chat.id,
                role: 'user',
                content: initialMessage
            });
        }

        securityLogger.info('Chat created via API', { chatId: chat.id, userId: req.user.id });
        res.status(201).json({ chat });
    } catch (error) {
        next(error);
    }
});

// GET /api/chats/:id
router.get('/chats/:id', authMiddleware, async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            const err = new Error('No autenticado');
            err.status = 401;
            throw err;
        }

        const chat = await Chat.findOne({
            where: { id: req.params.id, user_id: req.user.id },
            include: [{ model: Message }],
            order: [[Message, 'createdAt', 'ASC']],
            attributes: ['id', 'title', 'updatedAt', 'pdf_content', 'pdf_pages', 'total_pages']
        });

        if (!chat) {
            const err = new Error('Chat no encontrado');
            err.status = 404;
            throw err;
        }

        res.json({ chat });
    } catch (error) {
        next(error);
    }
});

// DELETE /api/chats/:id
router.delete('/chats/:id', authMiddleware, async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            const err = new Error('No autenticado');
            err.status = 401;
            throw err;
        }

        const chat = await Chat.findOne({
            where: { id: req.params.id, user_id: req.user.id }
        });

        if (!chat) {
            const err = new Error('Chat no encontrado');
            err.status = 404;
            throw err;
        }

        await Message.destroy({ where: { chat_id: chat.id } });
        await chat.destroy();

        securityLogger.info('Chat deleted', { chatId: req.params.id, userId: req.user.id });
        res.status(200).json({ message: 'Chat eliminado correctamente' });
    } catch (error) {
        next(error);
    }
});

// POST /api/chats/:id/messages
router.post('/chats/:id/messages', authMiddleware, async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            const err = new Error('No autenticado');
            err.status = 401;
            throw err;
        }

        const { role, content } = req.body;
        const chat = await Chat.findOne({
            where: { id: req.params.id, user_id: req.user.id }
        });

        if (!chat) {
            const err = new Error('Chat no encontrado');
            err.status = 404;
            throw err;
        }

        const message = await Message.create({
            chat_id: chat.id,
            role,
            content
        });

        await chat.update({ updatedAt: new Date() });
        securityLogger.info('Message saved', { chatId: chat.id, messageId: message.id });
        res.status(201).json({ message });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
