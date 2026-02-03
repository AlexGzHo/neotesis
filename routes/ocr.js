const express = require('express');
const router = express.Router();

/**
 * Basic OCR Route (Reset - Scorched Earth)
 * All complex server-side OCR has been removed for stability.
 */

router.post('/process', (req, res) => {
    res.status(501).json({
        error: 'El procesamiento OCR en el servidor ha sido desactivado temporalmente para mantenimiento.'
    });
});

module.exports = router;
