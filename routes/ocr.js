const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const ocrService = require('../services/ocrService');
const { requireAuth, optionalAuth } = require('../middleware/auth'); // Check middleware availability

// Configure Multer for temp uploads
const upload = multer({
    dest: 'uploads/temp/',
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF'), false);
        }
    }
});

const unlinkAsync = promisify(fs.unlink);

// POST /api/ocr
router.post('/', optionalAuth, upload.single('pdf'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se subió ningún archivo PDF' });
    }

    const inputPath = req.file.path;
    const outputPath = path.join(req.file.destination, `processed_${req.file.filename}.pdf`);

    // Default options from query or body
    const options = {
        language: req.body.language || 'spa+eng',
        deskew: req.body.deskew === 'true',
        clean: req.body.clean === 'true',
        ocrType: req.body.force === 'true' ? 'force-ocr' : 'skip-text',
        jobs: 1
    };

    try {
        console.log(`[OCR API] Processing ${req.file.originalname} with options:`, options);

        const result = await ocrService.processPDF(inputPath, outputPath, options);

        // Send file back
        res.download(outputPath, `OCR_${req.file.originalname}`, async (err) => {
            // Cleanup temp files after sending
            try {
                if (fs.existsSync(inputPath)) await unlinkAsync(inputPath);
                if (fs.existsSync(outputPath)) await unlinkAsync(outputPath);
                if (result.textPath && fs.existsSync(result.textPath)) await unlinkAsync(result.textPath);
            } catch (cleanupErr) {
                console.error('Error cleaning up OCR temp files:', cleanupErr);
            }

            if (err) {
                console.error('Error sending file:', err);
                if (!res.headersSent) {
                    res.status(500).send('Error al descargar el archivo procesado');
                }
            }
        });

    } catch (error) {
        console.error('[OCR API] Error:', error);

        // Attempt cleanup on error
        try {
            if (fs.existsSync(inputPath)) await unlinkAsync(inputPath);
            if (fs.existsSync(outputPath)) await unlinkAsync(outputPath);
        } catch (e) { }

        res.status(500).json({
            error: 'Error procesando el documento',
            details: error.message
        });
    }
});

module.exports = router;
