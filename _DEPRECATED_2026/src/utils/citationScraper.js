import { api } from '../services/api';
import { formatAPA } from './citation'; // reuse formatting if possible, or keep internal

// Ported from legacy scripts.js
export const unifiedExtractMetadata = async (urlInput, secureFetch) => {
    const url = urlInput.trim();
    
    // Helper to fetch via proxy
    const fetchWithProxy = async (targetUrl, asJson = true) => {
       // We use the secureFetch passed from the hook to maintain context/tokens
       const config = api.citation.proxy(targetUrl);
       // Note: The legacy /api/proxy implementation seemed to accept a POST body with url/type
       // My api.js defined it as GET /api/proxy?url=...
       // I should check consistentency. Legacy: fetchWithProxy uses POST /api/proxy.
       // I should probably stick to legacy backend contract if I'm not changing backend.
       
       // RE-READING Legacy scripts.js:
       // fetchWithProxy uses POST to /api/proxy with body { url, type: 'single' }
       
       const response = await secureFetch('/api/proxy', {
           method: 'POST',
           body: JSON.stringify({ url: targetUrl, type: 'single' })
       });
       
       // Response handling from legacy
       // It expects { success: true, data: { content: ..., type: ... } }
       if (!response.success) {
           throw new Error(response.error || 'Proxy error');
       }
       
       const content = response.data.content;
       if (asJson) {
           return typeof content === 'string' ? JSON.parse(content) : content;
       }
       return content;
    };

    try {
        // 1. Detección de DOI
        const doiRegex = /10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i;
        const doiMatch = url.match(doiRegex);
        if (doiMatch) {
            let doi = doiMatch[0];
            if (doi.endsWith(".") || doi.endsWith("/")) doi = doi.slice(0, -1);
            const meta = await getDoiMetadata(doi);
            if (meta) return { text: formatCitationFromMetadata(meta, doi), error: false };
        }

        // 2. ScienceDirect (vía PII)
        if (url.includes("sciencedirect.com") && url.includes("/pii/")) {
            const pii = url.match(/pii\/([A-Z0-9]+)/i)[1];
            try {
                const data = await fetchWithProxy(`https://api.crossref.org/works?filter=alternative-id:${pii}`, true);
                const item = data.message?.items?.[0];
                if (item) return { text: formatCitationFromMetadata(item, item.DOI || url), error: false };
            } catch (e) {
                console.warn("ScienceDirect PII fallido, intentando scrapeo...");
            }
        }

        // 3. Repositorio UCV (DSpace OAI)
        if (url.includes("repositorio.ucv.edu.pe") && url.includes("/handle/")) {
            const handle = url.match(/handle\/([0-9./]+)/)[1];
            try {
                const xml = await fetchWithProxy(`https://repositorio.ucv.edu.pe/oai/request?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:repositorio.ucv.edu.pe:${handle}`, false);
                const parser = new DOMParser();
                const doc = parser.parseFromString(xml, "text/xml");
                const meta = {
                    authorsList: Array.from(doc.getElementsByTagName("dc:creator")).map(n => n.textContent),
                    year: doc.getElementsByTagName("dc:date")[0]?.textContent?.match(/\d{4}/)?.[0] || "s. f.",
                    title: doc.getElementsByTagName("dc:title")[0]?.textContent,
                    container: "Repositorio UCV",
                    docType: "Tesis"
                };
                if (meta.title) return { text: formatCitationAPA7(meta, url), error: false };
            } catch (e) {
                return { text: await fetchAliciaMetadata(handle, url, true, fetchWithProxy), error: false };
            }
        }

        // 4. Repositorio UPAO
        if (url.includes("repositorio.upao.edu.pe") && url.includes("/item/")) {
            const uuid = url.match(/item\/([a-f0-9-]{36})/i)[1];
            try {
                const data = await fetchWithProxy(`https://repositorio.upao.edu.pe/server/api/core/items/${uuid}`, true);
                if (data && data.metadata && data.metadata["dc.title"]) {
                    const metadata = data.metadata;
                    const meta = {
                        authorsList: (metadata["dc.contributor.author"] || metadata["dc.creator"] || []).map(m => m.value),
                        year: metadata["dc.date.issued"]?.[0]?.value.substring(0, 4) || metadata["dc.date.available"]?.[0]?.value.substring(0, 4),
                        title: metadata["dc.title"]?.[0]?.value,
                        container: "Repositorio UPAO",
                        docType: "Tesis/Documento"
                    };
                    return { text: formatCitationAPA7(meta, url), error: false };
                }
                throw new Error();
            } catch (e) {
                return { text: await fetchAliciaMetadata(uuid, url, true, fetchWithProxy), error: false };
            }
        }

        // 5. Genérico
        try {
            const html = await fetchWithProxy(url, false);
            const doc = new DOMParser().parseFromString(html, "text/html");
            const meta = {
                authorsList: [doc.querySelector('meta[name="author"], meta[property="article:author"], meta[name="citation_author"]')?.content || "Autor Desconocido"],
                year: html.match(/\d{4}/)?.[0] || "s. f.",
                title: doc.querySelector('meta[property="og:title"], meta[name="citation_title"], title')?.content || doc.title,
                container: doc.querySelector('meta[property="og:site_name"], meta[name="citation_journal_title"]')?.content || new URL(url).hostname
            };
            return { text: formatCitationAPA7(meta, url), error: false };
        } catch (e) {
            throw new Error("SITIO_PROTEGIDO");
        }

    } catch (e) {
        return { text: e.message || "Error desconocido", error: true };
    }
}

// Helpers
async function getDoiMetadata(doi) {
    try {
        const res = await fetch(`https://api.crossref.org/works/${doi}`);
        const data = await res.json();
        return data.message || null;
    } catch (e) {
        return null;
    }
}

async function fetchAliciaMetadata(id, url, returnTextOnly = false, fetchWithProxy) {
    try {
        const res = await fetchWithProxy(`https://alicia.concytec.gob.pe/vufind/Search/Results?lookfor=${id}`, false);
        const doc = new DOMParser().parseFromString(res, "text/html");
        const resultItem = doc.querySelector('.result, .record, .result-body');
        if (!resultItem) throw new Error("Alicia: Record missing");

        const titleNode = resultItem.querySelector('.title, a[class*="title"]');
        const titleText = titleNode?.innerText.trim() || "";
        
        const authorNode = resultItem.querySelector('.author, a[class*="author"], .result-data');
        const meta = {
            authorsList: [authorNode?.innerText.replace(/por|by/gi, '').trim() || "Autor Desconocido"],
            year: resultItem.innerText.match(/\d{4}/)?.[0] || "s. f.",
            title: titleText,
            container: "Repositorio Institucional"
        };
        return returnTextOnly ? formatCitationAPA7(meta, url) : meta;
    } catch (e) {
        throw e;
    }
}

function normalizeTitle(text) {
    if (!text) return "";
    let t = text.trim();
    // Simplified normalization for brevity
    return t.charAt(0).toUpperCase() + t.slice(1);
}

function formatAuthorsListAPA(list) {
    // Logic from legacy
    if (!list || list.length === 0) return "Autor Desconocido";
    // Check if list is array of strings
    const authors = list.map(name => {
         // Simple heuristic if not needing full legacy complexity
         return name;
    });
    return authors.join(", ");
}

function formatCitationAPA7(meta, identifier) {
    const authors = formatAuthorsListAPA(meta.authorsList);
    const year = meta.year || "s. f.";
    const title = normalizeTitle(meta.title);
    const link = identifier.startsWith('10.') ? `https://doi.org/${identifier}` : identifier;
    const container = meta.container || "Repositorio Institucional";
    
    return `${authors} (${year}). <i>${title}</i>. ${container}. ${link}`;
}

function formatCitationFromMetadata(data, identifier) {
    const meta = {
        authorsList: (data.author || []).map(a => `${a.family}, ${a.given || ''}`),
        year: data.created?.["date-parts"]?.[0]?.[0] || "s. f.",
        title: data.title?.[0] || "Sin título",
        container: data["container-title"]?.[0] || data.publisher
    };
    return formatCitationAPA7(meta, identifier);
}
