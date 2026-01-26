// scripts.js - Motor de Citación y Análisis Neotesis Perú
// Versión 2.0 - Arquitectura Serverless Segura

// ============================================================================
// CONFIGURACIÓN GLOBAL
// ============================================================================

const MAX_QUOTA = 3;
const MAX_TOKENS = 100000;
const QUOTA_RESET_TIME = 24 * 60 * 60 * 1000; // 24 horas en ms
const MAX_PDF_CONTEXT = 12000; // Máximo de caracteres del PDF

let pdfText = "";
let pdfContextForAI = ""; // Contexto con marcadores por página para referencias
let history = [];
let quotaInterval = null;

// ============================================================================
// NAVEGACIÓN Y UI GENERAL
// ============================================================================

function showSection(sectionId) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    const targetSection = document.getElementById(sectionId);
    if (targetSection) targetSection.classList.add('active');

    document.querySelectorAll('nav a').forEach(a => {
        a.classList.remove('active');
        if (a.getAttribute('onclick')?.includes(`'${sectionId}'`)) {
            a.classList.add('active');
        }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openWhatsApp() {
    window.open("https://wa.me/51900000000?text=Hola,%20necesito%20asesoría%20con%20mi%20tesis", "_blank");
}

// ============================================================================
// GENERADOR APA MANUAL
// ============================================================================

function toggleApaFields() {
    const type = document.getElementById('apaType').value;
    const fieldPublisher = document.getElementById('fieldPublisher');
    const fieldJournal = document.getElementById('fieldJournal');
    const fieldUrl = document.getElementById('fieldUrl');

    // Resetear visibilidad
    fieldPublisher.style.display = 'none';
    fieldJournal.style.display = 'none';
    fieldUrl.style.display = 'none';

    // Mostrar campos según el tipo
    if (type === 'book') {
        fieldPublisher.style.display = 'block';
    } else if (type === 'journal') {
        fieldJournal.style.display = 'block';
    } else if (type === 'web') {
        fieldUrl.style.display = 'block';
    }
}

function generateAPA() {
    const type = document.getElementById('apaType').value;
    const author = document.getElementById('apaAuthor').value.trim();
    const year = document.getElementById('apaYear').value.trim();
    const title = document.getElementById('apaTitle').value.trim();

    if (!author || !year || !title) {
        alert('Por favor completa todos los campos obligatorios.');
        return;
    }

    let citation = '';

    if (type === 'book') {
        const publisher = document.getElementById('apaPublisher').value.trim();
        if (!publisher) {
            alert('Por favor ingresa la editorial.');
            return;
        }
        citation = `${author} (${year}). <i>${title}</i>. ${publisher}.`;
    } else if (type === 'journal') {
        const journal = document.getElementById('apaJournal').value.trim();
        if (!journal) {
            alert('Por favor ingresa el nombre de la revista.');
            return;
        }
        citation = `${author} (${year}). ${title}. <i>${journal}</i>.`;
    } else if (type === 'web') {
        const url = document.getElementById('apaUrl').value.trim();
        if (!url) {
            alert('Por favor ingresa la URL.');
            return;
        }
        citation = `${author} (${year}). <i>${title}</i>. ${url}`;
    }

    const resultBox = document.getElementById('apaResult');
    resultBox.innerHTML = citation;
    resultBox.style.display = 'block';
}

// ============================================================================
// CALCULADORA DE MUESTRA
// ============================================================================

function calculateSample() {
    const N = parseInt(document.getElementById('popSize').value);
    const Z = parseFloat(document.getElementById('confidence').value);
    const e = parseFloat(document.getElementById('errorMargin').value) / 100;
    const p = parseFloat(document.getElementById('probability').value) / 100;
    const q = 1 - p;

    let n;
    if (!N) {
        // Población Infinita
        n = Math.ceil((Z ** 2 * p * q) / (e ** 2));
    } else {
        // Población Finita
        n = Math.ceil((N * Z ** 2 * p * q) / ((e ** 2 * (N - 1)) + (Z ** 2 * p * q)));
    }

    const resultDiv = document.getElementById('sampleResult');
    const countDiv = document.getElementById('sampleCount');
    const descDiv = document.getElementById('sampleDesc');

    countDiv.innerText = n;
    descDiv.innerHTML = `Para universo de <b>${N ? N : 'población infinita'}</b>, confianza <b>${(Z === 1.96 ? '95%' : (Z === 1.645 ? '90%' : '99%'))}</b> y error <b>${(e * 100).toFixed(1)}%</b>.`;

    resultDiv.style.opacity = '1';
}

// ============================================================================
// UTILIDAD DE RED - PROXY SERVERLESS
// ============================================================================

/**
 * Fetch con proxy serverless (reemplaza los proxies públicos)
 * @param {string} url - URL a fetchear
 * @param {boolean} asJson - Si se espera JSON como respuesta
 * @returns {Promise<any>} - Contenido de la respuesta
 */
async function fetchWithProxy(url, asJson = true) {
    try {
        console.log(`Fetching via serverless proxy: ${url}`);

        const response = await fetch('/api/proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: url,
                type: 'single'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Error desconocido del proxy');
        }

        // Extraer el contenido según el tipo
        if (result.data.type === 'json') {
            return result.data.content;
        } else {
            // HTML o XML
            const content = result.data.content;
            if (asJson) {
                try {
                    return JSON.parse(content);
                } catch (e) {
                    return content;
                }
            }
            return content;
        }

    } catch (error) {
        console.error('Proxy error:', error);
        throw error;
    }
}

// ============================================================================
// LÓGICA DE CITACIÓN UNIFICADA
// ============================================================================

async function fetchCitation() {
    let urlInput = document.getElementById('webUrl').value.trim();
    const resultBox = document.getElementById('urlResult');
    const loading = document.getElementById('loadingIndicator');

    if (!urlInput) { alert("Ingresa un enlace."); return; }

    resultBox.style.display = 'none';
    loading.style.display = 'block';
    loading.innerText = "Analizando registros académicos...";

    try {
        const result = await unifiedExtractMetadata(urlInput);
        if (result.error) throw new Error(result.text);
        displayCitation(result.text);
    } catch (error) {
        console.error(error);
        if (error.message.includes("SITIO_PROTEGIDO")) {
            alert("Este sitio web tiene protección avanzada o requiere acceso manual.");
        } else if (error.message.includes("Dominio no permitido")) {
            alert("Este dominio no está en la lista de sitios académicos permitidos. Solo se permiten repositorios académicos y bases de datos científicas.");
        } else {
            alert("No se pudo extraer la información automáticamente: " + error.message);
        }
    } finally {
        loading.style.display = 'none';
    }
}

async function unifiedExtractMetadata(urlInput) {
    const url = urlInput.trim();
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
                const item = data.message.items[0];
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
                return { text: await fetchAliciaMetadata(handle, url, true), error: false };
            }
        }

        // 4. Repositorio UPAO (DSpace 7 API)
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
                return { text: await fetchAliciaMetadata(uuid, url, true), error: false };
            }
        }

        // 5. Genérico (Web Scraping)
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

async function getDoiMetadata(doi) {
    try {
        // CrossRef API es pública y no requiere proxy
        const res = await fetch(`https://api.crossref.org/works/${doi}`);
        const data = await res.json();
        return data.message || null;
    } catch (e) {
        return null;
    }
}

function normalizeTitle(text) {
    if (!text) return "";
    let t = text.trim().toLowerCase();
    t = t.charAt(0).toUpperCase() + t.slice(1);
    // Capitalizar después de puntuación
    t = t.replace(/([:.\\?\\!]\\s+)([a-z0-9])/g, (m, p1, p2) => p1 + p2.toUpperCase());
    // Siglas
    const acronyms = ["VIH", "ONU", "TIC", "TICs", "IA", "PDF", "COVID-19", "APA", "DOI", "UPAO", "UCV"];
    acronyms.forEach(a => {
        const r = new RegExp("\\b" + a + "\\b", "gi");
        t = t.replace(r, a);
    });
    return t;
}

function formatSingleAuthorAPA(name) {
    if (!name) return "";
    name = name.trim();
    if (["universidad", "ministerio", "instituto", "onu", "unesco"].some(k => name.toLowerCase().includes(k))) return name;

    if (name.includes(",")) {
        const parts = name.split(",");
        const last = parts[0].trim();
        const initials = parts[1].trim().split(" ").map(n => n[0].toUpperCase() + ".").join(" ");
        return `${last}, ${initials}`;
    } else {
        const parts = name.split(" ");
        if (parts.length < 2) return name;
        const last = parts[parts.length - 1];
        const initials = parts.slice(0, -1).map(n => n[0].toUpperCase() + ".").join(" ");
        return `${last}, ${initials}`;
    }
}

function formatAuthorsListAPA(list) {
    if (!list || list.length === 0) return "Autor Desconocido";
    const formatted = list.map(formatSingleAuthorAPA);
    if (formatted.length === 1) return formatted[0];
    if (formatted.length === 2) return `${formatted[0]} y ${formatted[1]}`;
    if (formatted.length <= 20) {
        return formatted.slice(0, -1).join(", ") + " y " + formatted[formatted.length - 1];
    }
    return formatted.slice(0, 19).join(", ") + ", ... " + formatted[formatted.length - 1];
}

function formatCitationAPA7(meta, identifier) {
    const authors = formatAuthorsListAPA(meta.authorsList);
    const year = meta.year || "s. f.";
    const title = normalizeTitle(meta.title);
    const link = identifier.startsWith('10.') ? `https://doi.org/${identifier}` : identifier;
    const container = meta.container || "Repositorio Institucional";
    const docType = meta.docType ? ` [${meta.docType}]` : "";

    if (meta.type === 'journal' && meta.volume) {
        const journal = meta.container.split(" ").map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(" ");
        return `${authors} (${year}). ${title}. <i>${journal}</i>, <i>${meta.volume}</i>(${meta.issue}), ${meta.pages}. ${link}`;
    }
    return `${authors} (${year}). <i>${title}</i>${docType}. ${container}. ${link}`;
}

function formatCitationFromMetadata(data, identifier) {
    const meta = {
        authorsList: (data.author || []).map(a => `${a.family}, ${a.given || ''}`),
        year: data.created?.[" date-parts"]?.[0]?.[0] || "s. f.",
        title: data.title?.[0] || "Sin título",
        container: data["container-title"]?.[0] || data.publisher,
        volume: data.volume,
        issue: data.issue,
        pages: data.page,
        type: data.type === 'journal-article' ? 'journal' : 'book'
    };
    return formatCitationAPA7(meta, identifier);
}

function displayCitation(text) {
    document.getElementById('finalCitationText').innerHTML = text;
    document.getElementById('urlResult').style.display = 'block';
}

async function fetchBatchCitations() {
    const batchInput = document.getElementById('batchUrls').value.trim();
    if (!batchInput) { alert("Ingresa al menos un enlace."); return; }

    const urls = batchInput.split('\n').filter(url => url.trim().length > 0);
    const progressDiv = document.getElementById('batchProgress');
    const progressBar = document.getElementById('batchProgressBar');
    const statusText = document.getElementById('batchStatusText');
    const percentText = document.getElementById('batchPercentText');
    const resultContainer = document.getElementById('batchResultContainer');
    const batchList = document.getElementById('batchList');

    // Inicializar UI
    progressDiv.style.display = 'block';
    resultContainer.style.display = 'none';
    batchList.innerHTML = '';
    progressBar.style.width = '0%';
    percentText.innerText = '0%';

    let completed = 0;
    const total = urls.length;

    // Procesar uno por uno para control de UI
    for (let url of urls) {
        statusText.innerText = `Procesando: ${url.substring(0, 40)}...`;
        const citation = await processSingleUrl(url.trim());

        const card = document.createElement('div');
        card.className = 'result-box';
        card.style.marginTop = '0';
        card.style.background = citation.error ? '#fff5f5' : 'white';
        card.innerHTML = `
            <div style="font-size: 0.8rem; color: #666; margin-bottom: 0.5rem; display: flex; justify-content: space-between;">
                <span>${url}</span>
                ${citation.error ? '<span style="color: #e53e3e;">Error</span>' : '<span style="color: #38a169;">Éxito</span>'}
            </div>
            <div class="citation-text">${citation.text}</div>
        `;
        batchList.appendChild(card);

        completed++;
        const percent = Math.round((completed / total) * 100);
        progressBar.style.width = percent + '%';
        percentText.innerText = percent + '%';
    }

    statusText.innerText = "Procesamiento completado.";
    resultContainer.style.display = 'block';
}

async function processSingleUrl(urlInput) {
    return await unifiedExtractMetadata(urlInput);
}

async function fetchAliciaMetadata(id, url, returnTextOnly = false) {
    try {
        const res = await fetchWithProxy(`https://alicia.concytec.gob.pe/vufind/Search/Results?lookfor=${id}`, false);
        const doc = new DOMParser().parseFromString(res, "text/html");
        const resultItem = doc.querySelector('.result, .record, .result-body');
        if (!resultItem) throw new Error("Alicia: Record missing");

        const titleNode = resultItem.querySelector('.title, a[class*="title"]');
        const titleText = titleNode?.innerText.trim() || "";
        const forbidden = ["suggested topics", "sugerencias", "resultados de búsqueda", "no se encontraron"];
        if (!titleText || forbidden.some(term => titleText.toLowerCase().includes(term))) {
            throw new Error("Alicia: Invalid title");
        }

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

function copyAllBatch() {
    const citations = Array.from(document.querySelectorAll('#batchList .citation-text'))
        .map(el => el.innerText)
        .join('\n\n');
    navigator.clipboard.writeText(citations).then(() => alert("Todas las citas han sido copiadas."));
}

function copyToClipboard() {
    const text = document.getElementById('finalCitationText').innerText;
    navigator.clipboard.writeText(text).then(() => alert("Copiado"));
}

// ============================================================================
// CHAT IA - SISTEMA DE CUOTAS
// ============================================================================

// Inicializar cuota al cargar
document.addEventListener('DOMContentLoaded', () => {
    updateQuotaUI();
});

function getQuotaData() {
    const data = localStorage.getItem('neotesis_quota');
    if (!data) return { count: 0, tokens: 0, firstUsed: null };
    return JSON.parse(data);
}

function updateQuotaUI() {
    const data = getQuotaData();
    const now = Date.now();

    // Verificar si el bloqueo de 24h ya pasó
    if (data.firstUsed && (now - data.firstUsed >= QUOTA_RESET_TIME)) {
        data.count = 0;
        data.tokens = 0;
        data.firstUsed = null;
        localStorage.setItem('neotesis_quota', JSON.stringify(data));
    }

    const remainingRequests = Math.max(0, MAX_QUOTA - data.count);
    const remainingTokens = Math.max(0, MAX_TOKENS - data.tokens);

    const requestPercent = (remainingRequests / MAX_QUOTA) * 100;
    const tokenPercent = (remainingTokens / MAX_TOKENS) * 100;
    const finalPercent = Math.min(requestPercent, tokenPercent);

    const quotaBar = document.getElementById('quotaBar');
    const quotaText = document.getElementById('quotaText');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('chatSendBtn');
    const timerDiv = document.getElementById('quotaTimer');
    const statusBadge = document.getElementById('statusBadge');
    const serviceStatusText = document.getElementById('serviceStatusText');

    if (quotaBar) quotaBar.style.width = finalPercent + '%';

    if (data.tokens >= MAX_TOKENS) {
        if (quotaText) quotaText.innerText = `Límite de tokens alcanzado`;
    } else {
        if (quotaText) quotaText.innerText = `Consultas hoy: ${data.count} / ${MAX_QUOTA}`;
    }

    // Manejo de colores de la barra y estado del botón
    if (remainingRequests === 0 || remainingTokens === 0) {
        quotaBar.style.background = '#ef4444';
        userInput.disabled = true;
        userInput.placeholder = "Servicio Inactivo";

        if (statusBadge) {
            statusBadge.classList.remove('active');
            statusBadge.classList.add('inactive');
        }
        if (serviceStatusText) serviceStatusText.innerText = 'Servicio Inactivo';

        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<i class="fas fa-ban"></i> Servicio Inactivo';
            sendBtn.style.background = '#94a3b8';
            sendBtn.style.cursor = 'not-allowed';
            sendBtn.style.width = 'auto';
        }

        timerDiv.style.display = 'block';
        startQuotaCountdown(data.firstUsed + QUOTA_RESET_TIME);
    } else {
        quotaBar.style.background = remainingRequests === 1 ? '#f59e0b' : 'linear-gradient(90deg, #10b981 0%, #3b82f6 100%)';
        userInput.disabled = false;
        userInput.placeholder = "Escribe tu pregunta aquí...";

        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
            sendBtn.style.background = 'var(--accent)';
            sendBtn.style.cursor = 'pointer';
        }

        if (statusBadge) {
            statusBadge.classList.remove('inactive');
            statusBadge.classList.add('active');
        }
        if (serviceStatusText) serviceStatusText.innerText = 'Servicio Activo';

        timerDiv.style.display = 'none';
        if (quotaInterval) clearInterval(quotaInterval);
    }
}

function startQuotaCountdown(resetTimestamp) {
    if (quotaInterval) clearInterval(quotaInterval);

    const countdownEl = document.getElementById('countdown');

    quotaInterval = setInterval(() => {
        const now = Date.now();
        const diff = resetTimestamp - now;

        if (diff <= 0) {
            clearInterval(quotaInterval);
            updateQuotaUI();
            return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        countdownEl.innerText = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
}

// ============================================================================
// CHAT IA - MANEJO DE PDF Y VISOR
// ============================================================================

let pdfDocument = null;
let currentPage = 1;
let totalPages = 0;
let currentZoom = 1.0;
let pdfTextByPage = []; // Array para almacenar texto por página

function buildPdfContextForAI() {
    // Construye un contexto compactado con marcadores por página.
    // Esto permite que el modelo cite “p. X” de forma más consistente.
    let ctx = '';
    for (const p of pdfTextByPage) {
        const block = `\n\n[PAGE ${p.page}]\n${p.text}`;
        if ((ctx.length + block.length) > MAX_PDF_CONTEXT) break;
        ctx += block;
    }
    return ctx.trim();
}

function extractReferencesFromReply(reply) {
    // Espera formato:
    // ...respuesta...
    // REFERENCIAS:
    // - p. 3: "..."
    // - p. 7 | "..."
    const idx = reply.toLowerCase().lastIndexOf('referencias');
    if (idx === -1) return { answer: reply, refs: [] };

    const answer = reply.slice(0, idx).trim();
    const tail = reply.slice(idx).split(/\r?\n/).slice(1); // después de la línea “REFERENCIAS:”
    const refs = [];

    for (const line of tail) {
        const cleaned = line.trim().replace(/^[-*•]\s*/, '');
        if (!cleaned) continue;
        const m = cleaned.match(/p\.?\s*(\d+)\s*(?:[:|—-])\s*(.+)$/i);
        if (!m) continue;
        const page = parseInt(m[1], 10);
        let quote = (m[2] || '').trim();
        quote = quote.replace(/^"|"$/g, '').replace(/^“|”$/g, '');
        refs.push({ page, quote });
    }

    return { answer: answer || reply, refs };
}

function approxLineFromQuote(pageText, quote) {
    if (!pageText || !quote) return null;
    const hay = pageText.toLowerCase();
    const needle = quote.toLowerCase();

    // Intento 1: búsqueda literal
    let idx = hay.indexOf(needle);
    // Intento 2: búsqueda por prefijo para tolerar pequeñas diferencias
    if (idx === -1) {
        const prefix = needle.slice(0, 40);
        if (prefix.length >= 12) idx = hay.indexOf(prefix);
    }
    if (idx === -1) return null;

    // Aproximación: “líneas” en función de caracteres (sin layout real del PDF)
    const CHARS_PER_LINE = 120;
    return Math.floor(idx / CHARS_PER_LINE) + 1;
}

function wireReferenceClicks(containerEl) {
    const refs = containerEl.querySelectorAll('.pdf-reference[data-page]');
    refs.forEach(el => {
        el.addEventListener('click', () => {
            const page = parseInt(el.getAttribute('data-page'), 10);
            const quote = el.getAttribute('data-quote') || '';
            highlightPdfReference(page, quote);
        });
    });
}

async function handlePdfUpload(input) {
    const file = input.files[0];
    if (!file) return;

    try {
        // Mostrar loading
        document.getElementById('pdfStatus').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando PDF...';

        const buffer = await file.arrayBuffer();

        // Cargar PDF con PDF.js
        pdfDocument = await pdfjsLib.getDocument({ data: buffer }).promise;
        totalPages = pdfDocument.numPages;

        // Extraer texto de todas las páginas
        pdfText = "";
        pdfTextByPage = [];

        for (let i = 1; i <= totalPages; i++) {
            const page = await pdfDocument.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(' ');
            pdfTextByPage.push({
                page: i,
                text: pageText,
                startIndex: pdfText.length
            });
            pdfText += pageText + " ";
        }

        // Limitar el contexto total
        pdfText = pdfText.substring(0, MAX_PDF_CONTEXT);

        // Contexto para IA con marcadores por página
        pdfContextForAI = buildPdfContextForAI();

        // Actualizar UI
        document.getElementById('pdfStatus').innerHTML = '<i class="fas fa-check-circle" style="color: var(--emerald);"></i> PDF cargado correctamente';
        document.getElementById('pdfControls').style.display = 'flex';

        // Renderizar primera página
        currentPage = 1;
        await renderPage(currentPage);

        // Actualizar navegación
        updatePageNavigation();

        // Mensaje de bienvenida actualizado
        const chat = document.getElementById('chatMessages');
        chat.innerHTML = `
            <div class="msg ai">
                <div class="ai-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="msg-content">
                    <strong>Neotesis IA:</strong> ¡Perfecto! He cargado tu PDF de ${totalPages} página(s). Ahora puedes hacer preguntas específicas sobre el contenido. Te mostraré exactamente de dónde saqué la información en cada respuesta.
                </div>
            </div>
        `;

    } catch (e) {
        document.getElementById('pdfStatus').innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i> Error al procesar el PDF';
        alert("Error al procesar el PDF. Verifica que sea un archivo válido.");
        console.error("PDF Error:", e);
    }
}

async function renderPage(pageNum) {
    if (!pdfDocument) return;

    try {
        const page = await pdfDocument.getPage(pageNum);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        // Calcular escala para ajustar al contenedor
        const container = document.getElementById('pdfViewer');
        const containerWidth = container.clientWidth - 40; // Padding
        const containerHeight = container.clientHeight - 40;

        const viewport = page.getViewport({ scale: 1.0 });
        const scaleX = containerWidth / viewport.width;
        const scaleY = containerHeight / viewport.height;
        const scale = Math.min(scaleX, scaleY, 2.0) * currentZoom; // Limitar zoom máximo

        const scaledViewport = page.getViewport({ scale: scale });

        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        const renderContext = {
            canvasContext: context,
            viewport: scaledViewport
        };

        await page.render(renderContext).promise;

        // Limpiar visor y agregar canvas
        const viewer = document.getElementById('pdfViewer');
        viewer.innerHTML = '';
        viewer.appendChild(canvas);

        // Centrar el canvas
        canvas.style.display = 'block';
        canvas.style.margin = '20px auto';

    } catch (e) {
        console.error('Error rendering page:', e);
    }
}

function updatePageNavigation() {
    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('totalPages').textContent = totalPages;
    document.getElementById('zoomLevel').textContent = Math.round(currentZoom * 100) + '%';

    // Habilitar/deshabilitar botones
    document.getElementById('prevPage').disabled = currentPage <= 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;
}

async function changePage(delta) {
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        await renderPage(currentPage);
        updatePageNavigation();
    }
}

async function zoomPDF(delta) {
    currentZoom = Math.max(0.5, Math.min(3.0, currentZoom + delta));
    await renderPage(currentPage);
    updatePageNavigation();
}

function highlightPdfReference(pageNum, textSnippet = "") {
    // Cambiar a la página especificada
    if (pageNum && pageNum !== currentPage) {
        currentPage = pageNum;
        renderPage(currentPage);
        updatePageNavigation();
    }

    // Aquí se podría implementar highlighting visual del texto
    // Por ahora, solo cambiamos de página
    console.log(`Referencia: Página ${pageNum}`, textSnippet);
}

// ============================================================================
// CHAT IA - ENVÍO DE MENSAJES (SERVERLESS)
// ============================================================================

async function sendMessage() {
    const data = getQuotaData();
    if (data.count >= MAX_QUOTA || data.tokens >= MAX_TOKENS) {
        updateQuotaUI();
        return;
    }

    const msg = document.getElementById('userInput').value;
    if (!msg) return;
    document.getElementById('userInput').value = "";
    const chat = document.getElementById('chatMessages');
    chat.innerHTML += `
        <div class="msg user">
            <div class="ai-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="msg-content">
                <strong>Tú:</strong> ${msg}
            </div>
        </div>
    `;
    history.push({ role: "user", content: msg });

    try {
        // Llamar a la API
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messages: history,
                pdfContext: (pdfContextForAI && pdfContextForAI.length > 0) ? pdfContextForAI : pdfText
            })
        });

        // Manejar rate limiting del servidor
        if (res.status === 429) {
            const errorData = await res.json();
            const resetTime = new Date(errorData.resetTime);
            chat.innerHTML += `
                <div class="msg ai">
                    <div class="ai-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="msg-content" style="color: #ef4444;">
                        <strong>Neotesis IA:</strong> Has excedido el límite de consultas diarias. El servicio se restablecerá el ${resetTime.toLocaleString('es-PE')}.
                    </div>
                </div>
            `;

            // Actualizar cuota local para reflejar el bloqueo del servidor
            if (!data.firstUsed) data.firstUsed = Date.now();
            data.count = MAX_QUOTA;
            localStorage.setItem('neotesis_quota', JSON.stringify(data));
            updateQuotaUI();
            return;
        }

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || `HTTP ${res.status}`);
        }

        const responseData = await res.json();
        const rawReply = responseData.choices[0].message.content;

        // 1) Intentar leer referencias explícitas desde la respuesta
        const parsed = extractReferencesFromReply(rawReply);
        const reply = parsed.answer;
        const refs = parsed.refs;

        // 2) Fallback heurístico si el modelo no devolvió referencias
        let fallbackPages = [];
        if (refs.length === 0 && pdfDocument && pdfTextByPage.length > 0) {
            const responseWords = reply.toLowerCase().split(' ');
            const relevantPages = [];

            pdfTextByPage.forEach(pageData => {
                const pageWords = pageData.text.toLowerCase();
                const matches = responseWords.filter(word => word.length > 3 && pageWords.includes(word));
                if (matches.length > 0) relevantPages.push({ page: pageData.page, matches: matches.length });
            });

            fallbackPages = relevantPages
                .sort((a, b) => b.matches - a.matches)
                .slice(0, 3)
                .map(r => ({ page: r.page, quote: '' }));
        }

        const refsToRender = refs.length > 0 ? refs : fallbackPages;
        let referencesHTML = '';

        if (refsToRender.length > 0) {
            referencesHTML += '<div style="margin-top: 1rem;">';
            referencesHTML += '<strong>Referencias en el documento:</strong><br>';

            refsToRender.slice(0, 3).forEach(ref => {
                const pageData = pdfTextByPage.find(p => p.page === ref.page);
                const approxLine = pageData ? approxLineFromQuote(pageData.text, ref.quote) : null;
                const lineLabel = approxLine ? ` · línea aprox. ${approxLine}` : '';
                const quoteLabel = ref.quote ? ` — “${ref.quote}”` : '';

                // data-quote para poder usar addEventListener (evitar problemas por comillas en onclick)
                const safeQuote = (ref.quote || '').replace(/"/g, '&quot;');
                referencesHTML += `
                    <div class="pdf-reference" data-page="${ref.page}" data-quote="${safeQuote}">
                        <i class="fas fa-file-alt"></i> Página ${ref.page}${lineLabel}${quoteLabel}
                    </div>
                `;
            });
            referencesHTML += '</div>';
        }

        chat.innerHTML += `
            <div class="msg ai">
                <div class="ai-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="msg-content">
                    <strong>Neotesis IA:</strong> ${reply}
                    ${referencesHTML}
                </div>
            </div>
        `;

        // Activar clicks de referencias recién insertadas
        const lastMsg = chat.lastElementChild;
        if (lastMsg) wireReferenceClicks(lastMsg);

        history.push({ role: "assistant", content: rawReply });
        chat.scrollTop = chat.scrollHeight;

        // Actualizar cuota tras éxito
        if (!data.firstUsed) data.firstUsed = Date.now();
        data.count++;

        // Registrar tokens si la API los devuelve
        if (responseData.usage && responseData.usage.total_tokens) {
            data.tokens += responseData.usage.total_tokens;
        }

        localStorage.setItem('neotesis_quota', JSON.stringify(data));
        updateQuotaUI();

    } catch (e) {
        console.error("Chat Error:", e);
        chat.innerHTML += `
            <div class="msg ai">
                <div class="ai-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="msg-content" style="color: #ef4444;">
                    <strong>Neotesis IA:</strong> Error de conexión: ${e.message || 'Servicio no disponible'}. Verifica tu conexión e intenta de nuevo.
                </div>
            </div>
        `;
    }
}

function handleEnter(e) {
    if (e.key === 'Enter') sendMessage();
}

// Función para cambiar entre herramientas de citación
function switchCitationTool(tool) {
    // Ocultar todas las herramientas
    const tools = document.querySelectorAll('.citation-tool');
    tools.forEach(t => t.classList.remove('active'));

    // Mostrar la herramienta seleccionada
    const selectedTool = document.getElementById(`${tool}-citation-tool`);
    if (selectedTool) {
        selectedTool.classList.add('active');
    }

    // Actualizar botones de tabs
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => btn.classList.remove('active'));

    // Encontrar y activar el botón correspondiente
    const activeButton = Array.from(tabButtons).find(btn =>
        btn.onclick.toString().includes(tool)
    );
    if (activeButton) {
        activeButton.classList.add('active');
    }

    // Limpiar resultados anteriores cuando se cambia de herramienta
    if (tool === 'single') {
        document.getElementById('urlResult').style.display = 'none';
        document.getElementById('loadingIndicator').style.display = 'none';
    } else if (tool === 'batch') {
        document.getElementById('batchResultContainer').style.display = 'none';
        document.getElementById('batchProgress').style.display = 'none';
    } else if (tool === 'manual') {
        document.getElementById('apaResult').style.display = 'none';
    }
}
