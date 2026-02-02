const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const ocrService = require('../services/ocrService');
const { requireAuth } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const unlinkAsync = promisify(fs.unlink);

/**
 * Professional Multer Configuration (v1.4.5 LTS)
 * Ensures cross-platform stability and avoids alpha/beta bugs
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = 'uploads/temp';
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo se admiten archivos PDF.'));
        }
    }
});

/**
 * @route POST /api/ocr/process
 * @desc Process PDF with high-precision OCR
 */
router.post('/process', requireAuth, upload.single('pdf'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se recibió ningún archivo PDF.' });
    }

    const inputPath = req.file.path;
    const outputPath = path.join('uploads', `ocr-${path.basename(req.file.path)}`);

    try {
        console.log(`[OCR Route] Starting process for: ${req.file.originalname}`);

        const result = await ocrService.processPDF(inputPath, outputPath, {
            language: req.body.language || 'spa+eng',
            sidecar: true
        });

        // Resolve absolute output path for security on some platforms
        const absolutePath = path.resolve(result.pdfPath);

        res.download(absolutePath, `ocr-${req.file.originalname}`, async (err) => {
            if (err) {
                console.error('[OCR Route] Download error:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Error al descargar el archivo procesado.' });
                }
            }

            // Cleanup local copies AFTER download finishes
            try {
                await unlinkAsync(inputPath);
                // We keep the result for a while or cleanup depending on policy
                // For this implementation, we cleanup to save disk space
                if (fs.existsSync(outputPath)) await unlinkAsync(outputPath);
                const sidecarPath = outputPath.replace('.pdf', '.txt');
                if (fs.existsSync(sidecarPath)) await unlinkAsync(sidecarPath);
            } catch (cleanupErr) {
                console.error('[OCR Route] Cleanup error:', cleanupErr);
            }
        });

    } catch (error) {
        console.error('[OCR Route] Processing error:', error.message);

        // Cleanup input file on error
        try { if (fs.existsSync(inputPath)) await unlinkAsync(inputPath); } catch (e) { }

        if (error.message === 'PDF_ENCRYPTED') {
            return res.status(400).json({
                error: 'El PDF está protegido con contraseña. Por favor, sube una versión desbloqueada.'
            });
        }

        res.status(500).json({
            error: 'Error durante el procesamiento OCR.',
            details: error.message
        });
    }
});

module.exports = router;
