import DOMPurify from 'dompurify';

export const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return DOMPurify.sanitize(input, {
        ALLOWED_TAGS: [], // Strip all tags for inputs usually
        ALLOWED_ATTR: []
    });
};

export const sanitizeHtml = (html) => {
    if (typeof html !== 'string') return html;
    return DOMPurify.sanitize(html);
};
