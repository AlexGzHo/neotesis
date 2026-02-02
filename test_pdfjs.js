
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const fs = require('fs');

async function extractText(pdfPath) {
    try {
        const data = new Uint8Array(fs.readFileSync(pdfPath));
        const loadingTask = pdfjsLib.getDocument(data);
        const pdf = await loadingTask.promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + ' ';
        }

        console.log('Extraction success! Text length:', fullText.length);
        console.log('Sample:', fullText.substring(0, 100));
        return fullText;
    } catch (error) {
        console.error('Extraction failed:', error);
    }
}

// Create a dummy PDF if none exists or use a known one if available
// For now just testing import and function definition logic is valid
console.log('Script loaded successfully.');
