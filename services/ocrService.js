const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const unlinkAsync = promisify(fs.unlink);

class OCRService {
    /**
     * Process a PDF with OCR using OCRmyPDF
     * @param {string} inputPath - Path to input PDF
     * @param {string} outputPath - Path to output PDF
     * @param {Object} options - OCR options
     * @returns {Promise<string>} - Path to processed PDF
     */
    async processPDF(inputPath, outputPath, options = {}) {
        const {
            language = 'spa+eng',
            sidecar = false, // Return text file
            deskew = true,
            clean = true,
            cleanFinal = false,
            ocrType = 'skip-text', // skip-text, force-ocr, redo-ocr
            jobs = 1 // Default to 1 to avoid /dev/shm issues in some containers
        } = options;

        const args = [
            '--verbose', '1',
            '--output-type', 'pdf',
            '--pdf-renderer', 'hocr', // 'hocr' or 'sandwich'
            '--invalidate-digital-signatures'
        ];

        // Language
        if (language) {
            args.push('--language', language);
        }

        // Processing flags
        if (deskew) args.push('--deskew');
        if (clean) args.push('--clean');
        if (cleanFinal) args.push('--clean-final');

        // OCR Strategy
        if (ocrType === 'force-ocr') args.push('--force-ocr');
        else if (ocrType === 'redo-ocr') args.push('--redo-ocr');
        else args.push('--skip-text'); // Default: only OCR images without text

        // Sidecar (text extraction)
        let sidecarPath = null;
        if (sidecar) {
            sidecarPath = outputPath.replace('.pdf', '.txt');
            args.push('--sidecar', sidecarPath);
        }

        // Parallel processing (careful with memory)
        // Stirling-PDF falls back to jobs=1 if it fails, we set it safe by default
        if (jobs) {
            args.push('--jobs', jobs.toString());
        }

        // Input/Output
        args.push(inputPath);
        args.push(outputPath);

        console.log('[OCRService] Running command: ocrmypdf', args.join(' '));

        return new Promise((resolve, reject) => {
            const process = spawn('ocrmypdf', args);

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
                // Log progress if needed
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
                console.log('[OCRService] stderr:', data.toString());
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve({
                        pdfPath: outputPath,
                        textPath: sidecarPath,
                        logs: stderr
                    });
                } else {
                    console.error('[OCRService] Failed with code', code);
                    console.error('[OCRService] Error logs:', stderr);

                    // Heuristic check for common errors
                    if (stderr.includes('file is encrypted')) {
                        reject(new Error('El archivo PDF está encriptado o protegido con contraseña.'));
                    } else {
                        reject(new Error(`OCR falló con código ${code}: ${stderr.substring(0, 200)}...`));
                    }
                }
            });

            process.on('error', (err) => {
                reject(new Error(`Error al iniciar proceso OCR: ${err.message}`));
            });
        });
    }
}

module.exports = new OCRService();
