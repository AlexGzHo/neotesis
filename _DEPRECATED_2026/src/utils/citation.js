// APA 7th Edition Formatting Utilities

export const formatAPA = (metadata) => {
    // Metadata structure: { title, author, date, siteName, url }
    
    const authors = formatAuthors(metadata.author);
    const date = formatDate(metadata.date);
    const title = metadata.title ? `*${metadata.title}*` : 'Título desconocido'; // Italics usually
    const source = metadata.siteName || '';
    const url = metadata.url || '';

    // APA 7: Author. (Date). Title. Site Name. URL
    let citation = '';

    if (authors) citation += `${authors} `;
    citation += `(${date}). `;
    citation += `${title}. `;
    if (source) citation += `${source}. `;
    citation += `${url}`;

    return citation;
};

const formatAuthors = (authorStr) => {
    if (!authorStr) return 'Autor desconocido';
    // Simple logic, assume standard string, or parse if array
    // APA requires Last, F. M.
    // This depends heavily on scraper output quality.
    return authorStr; 
};

const formatDate = (dateStr) => {
    if (!dateStr) return 's.f.';
    // Should try to parse YYYY, Month DD
    return dateStr;
};
