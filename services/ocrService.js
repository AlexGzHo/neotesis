const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class OCRService {
    /**
     * Process a PDF with OCR using OCRmyPDF
     * Adopted from Professional Node OCR Architecture
     */
    async processPDF(inputPath, outputPath, options = {}) {
        const {
            language = 'spa+eng',
            sidecar = true,
            ocrType = 'skip-text'
        } = options;

        // Sidecar path management
        const parsed = path.parse(outputPath);
        const sidecarPath = path.join(parsed.dir, parsed.name + '.txt');

        // Build command arguments (Standard stable parameters)
        const args = [
            '-l', language,
            '--output-type', 'pdfa',
            '--optimize', '1',
        ];

        if (ocrType === 'force-ocr') args.push('--force-ocr');
        else if (ocrType === 'redo-ocr') args.push('--redo-ocr');
        else args.push('--skip-text');

        if (sidecar) args.push('--sidecar', sidecarPath);

        // Add input and output
        args.push(inputPath, outputPath);

        console.log(`[OCRService] Executing: ocrmypdf ${args.join(' ')}`);

        return new Promise((resolve, reject) => {
            const child = spawn('ocrmypdf', args);

            let stderr = '';

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                if (code === 0) {
                    resolve({
                        pdfPath: outputPath,
                        textPath: sidecarPath,
                        logs: stderr
                    });
                } else {
                    console.error(`[OCRService] Process failed with code ${code}`);
                    if (stderr.toLowerCase().includes('password') || stderr.toLowerCase().includes('encrypt')) {
                        reject(new Error('PDF_ENCRYPTED'));
                    } else {
                        reject(new Error(`OCR failed (code ${code}): ${stderr.split('\n').pop()}`));
                    }
                }
            });

            child.on('error', (err) => {
                reject(new Error(`Failed to start OCR process: ${err.message}`));
            });
        });
    }
}

module.exports = new OCRService();
