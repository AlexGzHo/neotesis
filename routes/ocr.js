const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const { exec } = require('child_process');
const ocrService = require('../services/ocrService');
const { requireAuth, optionalAuth } = require('../middleware/auth');


// Helper to check text using pdfjs-dist
const checkTextWithPdfJs = async (filePath) => {
    try {
        // Dynamic import for ESM module in CommonJS environment
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

        const data = new Uint8Array(fs.readFileSync(filePath));
        // Use default export if necessary, or just the module
        const docFunction = pdfjsLib.getDocument || pdfjsLib.default.getDocument;
        const loadingTask = docFunction(data);

        const pdf = await loadingTask.promise;
        let fullText = '';

        // Check first 3 pages only (optimization)
        const pagesToCheck = Math.min(pdf.numPages, 3);

        for (let i = 1; i <= pagesToCheck; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + ' ';
        }

        return fullText;
    } catch (error) {
        console.error('Error reading PDF with pdfjs:', error);
        return null;
    }
};

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
router.post('/', upload.single('pdf'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No se subió ningún archivo PDF' });
    }

    const inputPath = req.file.path;
    const outputPath = path.join(req.file.destination, `processed_${req.file.filename}.pdf`);

    // Default options
    const options = {
        language: req.body.language || 'spa+eng',
        deskew: true,
        clean: true,
        ocrType: 'skip-text', // Default to skip-text for smart check
        jobs: 1
    };

    // Override if forced
    if (req.body.force === 'true') {
        options.ocrType = 'force-ocr';
    }

    try {
        console.log(`[OCR API] Received ${req.file.originalname}`);

        // 1. SMART CHECK
        let needsOCR = true;

        if (options.ocrType === 'skip-text') {
            try {
                const textContent = await checkTextWithPdfJs(inputPath);
                const cleanText = textContent ? textContent.replace(/\s/g, '') : '';

                if (cleanText.length > 50) {
                    console.log(`[OCR API] Smart Check: Text found (${cleanText.length} chars). Skipping OCR.`);
                    needsOCR = false;
                } else {
                    console.log(`[OCR API] Smart Check: Insufficient text. Starting OCR.`);
                }
            } catch (err) {
                console.warn('[OCR API] Smart Check failed:', err.message);
            }
        }

        if (!needsOCR) {
            // Return original file
            return res.download(inputPath, `Doc_${req.file.originalname}`, async (err) => {
                try {
                    if (fs.existsSync(inputPath)) await unlinkAsync(inputPath);
                } catch (e) { }
            });
        }

        // 2. RUN OCR
        console.log(`[OCR API] Running OCR with options:`, options);
        const result = await ocrService.processPDF(inputPath, outputPath, options);

        // 3. SEND RESULT
        res.download(outputPath, `OCR_${req.file.originalname}`, async (err) => {
            try {
                if (fs.existsSync(inputPath)) await unlinkAsync(inputPath);
                if (fs.existsSync(outputPath)) await unlinkAsync(outputPath);
                if (result.textPath && fs.existsSync(result.textPath)) await unlinkAsync(result.textPath);
            } catch (cleanupErr) {
                console.error('Error cleaning up:', cleanupErr);
            }
            if (err && !res.headersSent) {
                res.status(500).send('Error downloading processed file');
            }
        });

    } catch (error) {
        console.error('[OCR API] Error:', error);
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
