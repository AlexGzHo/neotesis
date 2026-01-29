// scripts.js - Motor de Citación y Análisis Neotesis Perú
// Versión 2.0 - Arquitectura Serverless Segura con Medidas de Seguridad Frontend

// ============================================================================
// CONFIGURACIÓN DE SEGURIDAD FRONTEND
// ============================================================================

// DOMPurify se carga desde CDN en index.html
const DOMPurify = window.DOMPurify;

// Configuración de sanitización
const SANITIZE_CONFIG = {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'blockquote', 'span'],
    ALLOWED_ATTR: ['class', 'id'],
    ALLOW_DATA_ATTR: false
};

// Token CSRF para protección contra ataques
let csrfToken = null;

// Timeout de sesión (30 minutos)
const SESSION_TIMEOUT = 30 * 60 * 1000;
let sessionTimer = null;
let lastActivity = Date.now();

// ============================================================================
// CONFIGURACIÓN GLOBAL
// ============================================================================

const MAX_QUOTA = 3;
const MAX_TOKENS = 100000;
const QUOTA_RESET_TIME = 24 * 60 * 60 * 1000; // 24 horas en ms
const MAX_PDF_CONTEXT = 12000; // Máximo de caracteres del PDF
const DISABLE_QUOTA = true; // Temporal para testing

let pdfText = "";
let pdfContextForAI = ""; // Contexto con marcadores por página para referencias
let pdfTextByPage = []; // Array para almacenar texto por página
let isHtmlView = false; // Indica si se está usando vista HTML (historial) o Canvas (nuevo upload)
let pdfDocument = null;
let currentPage = 1;
let totalPages = 0;
let currentZoom = 1.0;
let history = [];
let quotaInterval = null;

// ============================================================================
// FUNCIONES DE SEGURIDAD FRONTEND
// ============================================================================

/**
 * Sanitiza contenido HTML para prevenir XSS
 */
function sanitizeHTML(html) {
    if (typeof html !== 'string') return html;
    return DOMPurify.sanitize(html, SANITIZE_CONFIG);
}

/**
 * Sanitiza entrada de texto plano
 */
function sanitizeText(text) {
    if (typeof text !== 'string') return text;
    // Remover caracteres potencialmente peligrosos
    return text
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+="[^"]*"/gi, '')
        .trim();
}

/**
 * Valida entrada de formulario
 */
function validateFormInput(input, rules) {
    const value = input.value.trim();
    const errors = [];

    if (rules.required && !value) {
        errors.push('Este campo es obligatorio');
    }

    if (rules.minLength && value.length < rules.minLength) {
        errors.push(`Mínimo ${rules.minLength} caracteres`);
    }

    if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`Máximo ${rules.maxLength} caracteres`);
    }

    if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(rules.patternMessage || 'Formato inválido');
    }

    return errors;
}

/**
 * Obtiene token CSRF (simulado - en producción vendría del servidor)
 */
function getCSRFToken() {
    if (!csrfToken) {
        csrfToken = generateSecureToken();
    }
    return csrfToken;
}

/**
 * Genera token seguro aleatorio
 */
function generateSecureToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Actualiza actividad del usuario para timeout de sesión
 */
function updateActivity() {
    lastActivity = Date.now();
    resetSessionTimer();
}

/**
 * Reinicia el timer de sesión
 */
function resetSessionTimer() {
    if (sessionTimer) {
        clearTimeout(sessionTimer);
    }

    sessionTimer = setTimeout(() => {
        if (Date.now() - lastActivity > SESSION_TIMEOUT) {
            handleSessionTimeout();
        }
    }, SESSION_TIMEOUT);
}

/**
 * Maneja timeout de sesión
 */
function handleSessionTimeout() {
    showToast('Tu sesión ha expirado por inactividad. La página se recargará.', 'info', 'Sesión Expirada');
    // Limpiar datos sensibles
    localStorage.removeItem('neotesis_quota');
    history = [];
    pdfText = '';
    pdfContextForAI = '';
    // Recargar página
    window.location.reload();
}

/**
 * Valida mensaje de chat antes de enviar
 */
function validateChatMessage(message) {
    if (!message || typeof message !== 'string') {
        return { valid: false, error: 'Mensaje inválido' };
    }

    const trimmed = message.trim();
    if (trimmed.length === 0) {
        return { valid: false, error: 'El mensaje no puede estar vacío' };
    }

    if (trimmed.length > 10000) {
        return { valid: false, error: 'El mensaje es demasiado largo (máximo 10000 caracteres)' };
    }

    // Verificar caracteres peligrosos
    const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+=/i,
        /<iframe/i,
        /<object/i,
        /<embed/i
    ];

    if (dangerousPatterns.some(pattern => pattern.test(trimmed))) {
        return { valid: false, error: 'El mensaje contiene contenido no permitido' };
    }

    return { valid: true, sanitized: sanitizeText(trimmed) };
}

/**
 * Envía solicitud segura con validación
 */
async function secureFetch(url, options = {}) {
    // Agregar token CSRF si es POST
    if (options.method === 'POST' && options.body) {
        const data = JSON.parse(options.body);
        data.csrfToken = getCSRFToken();
        options.body = JSON.stringify(data);
    }

    // Agregar headers de seguridad
    options.headers = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...options.headers
    };

    try {
        const response = await fetch(url, options);

        // Verificar respuesta
        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('Demasiadas solicitudes. Intenta de nuevo más tarde.');
            }
            if (response.status === 403) {
                throw new Error('Acceso denegado. Verifica tus permisos.');
            }
            throw new Error(`Error del servidor: ${response.status}`);
        }

        return response;
    } catch (error) {
        console.error('Secure fetch error:', error);
        throw error;
    }
}

// ============================================================================
// NAVEGACIÓN Y UI GENERAL
// ============================================================================

function showSection(sectionId) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    const targetSection = document.getElementById(sectionId);
    if (targetSection) targetSection.classList.add('active');

    document.querySelectorAll('nav a').forEach(a => {
        a.classList.remove('active');
        if (a.getAttribute('data-section') === sectionId || a.getAttribute('onclick')?.includes(`'${sectionId}'`)) {
            a.classList.add('active');
        }
    });

    // Control de visibilidad del footer y scroll del body
    const footer = document.getElementById('main-footer');
    if (footer) {
        if (sectionId === 'ai-chat') {
            footer.style.display = 'none';
            document.body.style.overflow = 'hidden';
            // Ajuste para evitar scroll en el contenedor principal
            const aiChatSection = document.getElementById('ai-chat');
            if (aiChatSection) aiChatSection.style.height = 'calc(100vh - 80px)';
        } else {
            footer.style.display = 'block';
            document.body.style.overflow = 'auto';
            const aiChatSection = document.getElementById('ai-chat');
            if (aiChatSection) aiChatSection.style.height = 'auto';
        }
    }

    // Close mobile menu after navigation
    const nav = document.querySelector('nav');
    if (nav && nav.classList.contains('mobile-open')) {
        nav.classList.remove('mobile-open');
    }

    // Cargar chats cuando se muestra la sección de chat
    if (sectionId === 'ai-chat') {
        loadChatList();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMobileMenu() {
    const nav = document.querySelector('nav');
    nav.classList.toggle('mobile-open');
}

// Event listeners
const hamburgerBtn = document.getElementById('hamburgerBtn');
if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', toggleMobileMenu);
}

// Nav links
const navLinks = document.querySelectorAll('nav a[data-section]');
navLinks.forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        const section = this.getAttribute('data-section');
        showSection(section);

        // Cerrar menú móvil al navegar
        const nav = document.querySelector('nav');
        if (nav && nav.classList.contains('mobile-open')) {
            toggleMobileMenu();
        }
    });
});

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
    const authorInput = document.getElementById('apaAuthor');
    const yearInput = document.getElementById('apaYear');
    const titleInput = document.getElementById('apaTitle');

    // Validar campos con reglas de seguridad
    const authorErrors = validateFormInput(authorInput, {
        required: true,
        minLength: 1,
        maxLength: 200,
        pattern: /^[a-zA-ZÀ-ÿ\s.,'-]+$/,
        patternMessage: 'El nombre del autor contiene caracteres no válidos'
    });

    const yearErrors = validateFormInput(yearInput, {
        required: true,
        pattern: /^\d{4}$/,
        patternMessage: 'El año debe ser un número de 4 dígitos'
    });

    const titleErrors = validateFormInput(titleInput, {
        required: true,
        minLength: 1,
        maxLength: 500
    });

    // Mostrar errores si existen
    if (authorErrors.length > 0 || yearErrors.length > 0 || titleErrors.length > 0) {
        const allErrors = [...authorErrors, ...yearErrors, ...titleErrors];
        showToast(allErrors.join('. '), 'error', 'Errores de validación');
        return;
    }

    const author = sanitizeText(authorInput.value);
    const year = sanitizeText(yearInput.value);
    const title = sanitizeText(titleInput.value);

    let citation = '';

    if (type === 'book') {
        const publisher = document.getElementById('apaPublisher').value.trim();
        if (!publisher) {
            showToast('Por favor ingresa la editorial.', 'error');
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
    resultBox.innerHTML = sanitizeHTML(citation);
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
        console.log(`Fetching via secure proxy: ${url}`);

        const response = await secureFetch('/api/proxy', {
            method: 'POST',
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
    document.getElementById('finalCitationText').innerHTML = sanitizeHTML(text);
    document.getElementById('urlResult').style.display = 'block';
}

async function fetchBatchCitations() {
    const batchInput = document.getElementById('batchUrls').value.trim();
    if (!batchInput) {
        showToast("Ingresa al menos un enlace.", "error");
        return;
    }

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
            <span>${sanitizeText(url)}</span>
            ${citation.error ? '<span style="color: #e53e3e;">Error</span>' : '<span style="color: #38a169;">Éxito</span>'}
          </div>
          <div class="citation-text">${citation.error ? sanitizeText(citation.text) : sanitizeHTML(citation.text)}</div>
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
    const citationElements = Array.from(document.querySelectorAll('#batchList .citation-text'));
    const plainText = citationElements.map(el => el.innerText).join('\n\n');
    const htmlText = citationElements.map(el => el.innerHTML).join('<br><br>');

    if (navigator.clipboard && window.ClipboardItem) {
        const clipboardItem = new ClipboardItem({
            'text/plain': new Blob([plainText], { type: 'text/plain' }),
            'text/html': new Blob([htmlText], { type: 'text/html' })
        });
        navigator.clipboard.write([clipboardItem]).then(() => {
            alert("Todas las citas han sido copiadas con formato.");
        }).catch(err => {
            console.error('Error copying:', err);
            // Fallback to plain text
            navigator.clipboard.writeText(plainText).then(() => alert("Citas copiadas (formato básico)."));
        });
    } else {
        // Fallback for older browsers
        navigator.clipboard.writeText(plainText).then(() => alert("Todas las citas han sido copiadas."));
    }
}

function copyToClipboard() {
    const element = document.getElementById('finalCitationText');
    const plainText = element.innerText;
    const htmlText = element.innerHTML;

    if (navigator.clipboard && window.ClipboardItem) {
        const clipboardItem = new ClipboardItem({
            'text/plain': new Blob([plainText], { type: 'text/plain' }),
            'text/html': new Blob([htmlText], { type: 'text/html' })
        });
        navigator.clipboard.write([clipboardItem]).then(() => {
            alert("Copiado con formato");
        }).catch(err => {
            console.error('Error copying:', err);
            navigator.clipboard.writeText(plainText).then(() => alert("Copiado"));
        });
    } else {
        navigator.clipboard.writeText(plainText).then(() => alert("Copiado"));
    }
}

// ============================================================================
// CHAT IA - SISTEMA DE CUOTAS
// ============================================================================


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
        if (quotaText) quotaText.innerText = `Consultas: ${data.count} / ${MAX_QUOTA}`;
    }

    // Manejo de colores de la barra y estado del botón - Dashboard Theme
    if ((remainingRequests === 0 || remainingTokens === 0) && !DISABLE_QUOTA) {
        quotaBar.style.background = '#ef4444';
        userInput.disabled = true;
        userInput.placeholder = "Consultas agotadas por hoy";

        if (statusBadge) {
            statusBadge.style.background = '#ef4444';
            statusBadge.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';
        }
        if (serviceStatusText) serviceStatusText.innerText = 'Consultas Agotadas';

        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<i class="fas fa-clock"></i>';
            sendBtn.className = "w-10 h-10 bg-gray text-white rounded-xl flex items-center justify-center opacity-50 cursor-not-allowed flex-shrink-0";
        }

        timerDiv.style.display = 'block';
        startQuotaCountdown(data.firstUsed + QUOTA_RESET_TIME);
    } else {
        quotaBar.style.background = 'var(--accent)';
        userInput.disabled = false;
        userInput.placeholder = "Pregunta algo sobre el documento...";

        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
            sendBtn.className = "w-10 h-10 bg-accent text-white rounded-xl flex items-center justify-center hover:bg-accent-hover transition-all shadow-glow flex-shrink-0";
        }

        if (statusBadge) {
            statusBadge.style.background = 'var(--emerald)';
            statusBadge.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.2)';
        }
        if (serviceStatusText) serviceStatusText.innerText = 'Neotesis IA';

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

/**
 * Configurar event delegation para clicks en referencias PDF
 * Esto permite que funcionen en todos los mensajes, no solo en el último
 */
function wireReferenceClicks(containerEl) {
    // Remover listener previo si existe para evitar duplicados
    if (containerEl._pdfRefClickHandler) {
        containerEl.removeEventListener('click', containerEl._pdfRefClickHandler);
    }

    // Crear handler con event delegation
    const clickHandler = (e) => {
        const refButton = e.target.closest('.pdf-reference[data-page]');
        if (refButton) {
            const page = parseInt(refButton.getAttribute('data-page'), 10);
            const quote = refButton.getAttribute('data-quote') || '';
            highlightPdfReference(page, quote);
        }
    };

    // Guardar referencia al handler para poder removerlo después
    containerEl._pdfRefClickHandler = clickHandler;

    // Agregar listener al contenedor (event delegation)
    containerEl.addEventListener('click', clickHandler);
}

async function handlePdfUpload(input) {
    const file = input.files[0];
    if (!file) return;

    try {
        // Mostrar loading
        document.getElementById('pdfStatus').innerHTML = '<span class="material-icons-round animate-spin text-xs">sync</span> Procesando PDF...';

        const buffer = await file.arrayBuffer();
        const typedarray = new Uint8Array(buffer);

        console.log('[PDF] Archivo leído como buffer, iniciando getDocument...');

        // Cargar PDF con PDF.js
        const loadingTask = pdfjsLib.getDocument({ data: typedarray });
        pdfDocument = await loadingTask.promise;
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

        // Validar si se extrajo texto
        if (pdfText.trim().length === 0) {
            console.warn('[PDF] No se pudo extraer texto del documento (posible imagen)');
            document.getElementById('pdfStatus').innerHTML = '<span class="material-icons-round text-amber-500 text-xs">warning</span> Documento cargado sin texto (posible imagen)';
        }

        // Limitar el contexto total
        pdfText = pdfText.substring(0, MAX_PDF_CONTEXT);

        // Contexto para IA con marcadores por página
        pdfContextForAI = buildPdfContextForAI();

        // Actualizar UI
        document.getElementById('pdfStatus').innerHTML = '<span class="material-icons-round text-emerald-500 text-xs">check_circle</span> PDF cargado correctamente';
        document.getElementById('pdfControls').style.display = 'flex';

        // Renderizar primera página
        currentPage = 1;
        isHtmlView = false; // Usar Canvas para upload fresco

        // Mostrar visor y ocultar estado vacío ANTES de renderizar
        const viewer = document.getElementById('pdfViewer');
        const emptyState = document.getElementById('pdfEmptyState');
        if (viewer) viewer.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');

        await renderPage(currentPage);

        // Actualizar navegación
        updatePageNavigation();

        // Mensaje de bienvenida actualizado
        const chat = document.getElementById('chatMessages');
        chat.innerHTML = `
            <div class="flex flex-col gap-2 max-w-4xl mx-auto w-full animate-fadeIn items-start">
                <div class="flex items-center gap-2 mb-1">
                    <div class="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <span class="material-icons-round text-primary text-[18px]">smart_toy</span>
                    </div>
                    <p class="message-label ai-label">Neotesis IA</p>
                </div>
                <div class="ai-bubble chat-message-bubble ml-10">
                    ¡Perfecto! He cargado tu PDF de ${totalPages} página(s). Ahora puedes hacer preguntas específicas sobre el contenido. Te mostraré exactamente de dónde saqué la información en cada respuesta.
                </div>
            </div>
        `;

        // Actualizar subtítulo del header
        const pdfNameHeader = document.getElementById('currentChatPdfName');
        if (pdfNameHeader) {
            pdfNameHeader.textContent = `Basado en: ${file.name.length > 25 ? file.name.substring(0, 25) + '...' : file.name}`;
        }

    } catch (e) {
        document.getElementById('pdfStatus').innerHTML = '<span class="material-icons-round text-red-500 text-xs">warning</span> Error al procesar el PDF';
        console.error("PDF Error Extendido:", e);
        alert("Error al procesar el PDF: " + (e.message || "Verifica que sea un archivo válido."));
    }
}

async function renderPage(pageNum) {
    const viewer = document.getElementById('pdfViewer');
    if (!viewer) return;

    if (isHtmlView) {
        // RENDERIZADO HTML (Para historial) - MODO E-BOOK
        const pageData = pdfTextByPage.find(p => p.page === pageNum);
        if (pageData) {
            // Calcular tamaño de fuente basado en el zoom (base 16px)
            const fontSize = Math.max(12, Math.min(32, 16 * currentZoom));

            viewer.classList.add('ebook-mode');
            viewer.innerHTML = `
                <div class="ebook-reader animate-fadeIn">
                    <div class="mb-3 pb-2 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center text-primary">
                        <span class="text-[11px] font-black uppercase tracking-[0.1em] whitespace-nowrap">Lectura Inteligente</span>
                        <span class="text-[10px] font-bold text-accent whitespace-nowrap">PÁGINA ${pageNum} / ${totalPages}</span>
                    </div>
                    
                    <div class="ebook-content" id="ebookContentBody" style="font-size: ${fontSize}px;"></div>

                    <div class="reader-notice mt-8">
                        <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span class="material-icons-round text-primary text-[20px]">auto_awesome</span>
                        </div>
                        <p class="text-[11px] leading-relaxed text-slate-600">
                            <strong>Tip:</strong> Puedes usar los botones de lupa (+/-) de abajo para ajustar el tamaño de letra a tu gusto.
                        </p>
                    </div>
                </div>
            `;

            const contentBody = document.getElementById('ebookContentBody');
            if (contentBody && pageData.text) {
                // Dividir por saltos de línea y limpiar líneas vacías
                const paragraphs = pageData.text.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0);

                contentBody.innerHTML = paragraphs
                    .map(line => `<p>${sanitizeHTML(line)}</p>`)
                    .join('') || '<p class="opacity-40 italic">Contenido extraído vacío.</p>';
            }

            viewer.scrollTop = 0;

            const sidebar = viewer.closest('aside') || viewer.parentElement;
            if (sidebar) sidebar.scrollTop = 0;
        }
        return;
    }

    viewer.classList.remove('ebook-mode');

    // RENDERIZADO CANVAS (Para PDF original)
    if (!pdfDocument) return;

    try {
        const page = await pdfDocument.getPage(pageNum);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        // Calcular escala para ajustar al contenedor
        const containerWidth = viewer.clientWidth - 40; // Padding
        const containerHeight = viewer.clientHeight - 40;

        const viewport = page.getViewport({ scale: 1.0 });

        // Validar dimensiones para evitar división por cero o NaN
        const safeWidth = Math.max(containerWidth, 300);
        const safeHeight = Math.max(containerHeight, 400);

        const scaleX = safeWidth / viewport.width;
        const scaleY = safeHeight / viewport.height;
        const scale = Math.min(scaleX, scaleY, 1.5) * currentZoom;

        const scaledViewport = page.getViewport({ scale: scale });

        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        const renderContext = {
            canvasContext: context,
            viewport: scaledViewport
        };

        await page.render(renderContext).promise;

        // Limpiar visor y agregar canvas
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
    const cp = document.getElementById('currentPage');
    const tp = document.getElementById('totalPages');
    const zl = document.getElementById('zoomLevel');
    const prev = document.getElementById('prevPage');
    const next = document.getElementById('nextPage');

    if (cp) cp.textContent = currentPage;
    if (tp) tp.textContent = totalPages;
    if (zl) zl.textContent = Math.round(currentZoom * 100) + '%';

    if (prev) prev.disabled = currentPage <= 1;
    if (next) next.disabled = currentPage >= totalPages;
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

    // Si estamos en vista HTML, llamar a renderPage para actualizar el tamaño de fuente
    if (isHtmlView) {
        await renderPage(currentPage);
    } else {
        // En vista Canvas, renderPage maneja el zoom internamente
        await renderPage(currentPage);
    }

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

// Estado para chats pendientes de respuesta AI
let pendingUserMessages = [];
let hasAIResponded = false;

/**
 * Renderizar mensaje de IA con referencias PDF
 */
function renderAIMessageWithReferences(content, showSavedIndicator = false, saved = false) {
    // Sanitizar respuesta de la IA
    const sanitizedReply = sanitizeHTML(content);

    // 1) Intentar leer referencias explícitas desde la respuesta sanitizada
    const parsed = extractReferencesFromReply(sanitizedReply);
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
            const quoteLabel = ref.quote ? ` — "${ref.quote}"` : '';

            // data-quote para poder usar addEventListener (evitar problemas por comillas en onclick)
            const safeQuote = (ref.quote || '').replace(/"/g, '&quot;');
            referencesHTML += `
                <div class="pdf-reference" data-page="${ref.page}" data-quote="${safeQuote}">
                    <span class="material-icons-round text-[14px]">auto_stories</span>
                    Página ${ref.page}${lineLabel}${quoteLabel}
                </div>
            `;
        });
        referencesHTML += '</div>';
    }

    // Indicador de guardado (opcional)
    let savedIndicator = '';
    if (showSavedIndicator) {
        savedIndicator = saved
            ? '<small style="color: #10b981; font-size: 0.75rem; margin-left: 0.5rem; display: flex; align-items: center; gap: 4px;"><span class="material-icons-round text-[14px]">check_circle</span> Guardado</small>'
            : '<small style="color: #64748b; font-size: 0.75rem; margin-left: 0.5rem; display: flex; align-items: center; gap: 4px;"><span class="material-icons-round text-[14px]">info</span> No guardado</small>';
    }

    return `
        <div class="flex flex-col items-start mb-8 animate-fadeIn w-full">
            <div class="flex items-center gap-2 mb-1 ml-2">
                <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span class="material-icons-round text-primary text-[16px]">smart_toy</span>
                </div>
                <p class="message-label ai-label">Neotesis IA</p>
            </div>
            <div class="ai-bubble chat-message-bubble ml-10">
                <div class="message-text">${reply}</div>
                ${referencesHTML ? `<div class="mt-4 flex flex-wrap gap-2">${referencesHTML}</div>` : ''}
                ${savedIndicator ? `<div class="mt-2 flex items-center justify-end">${savedIndicator}</div>` : ''}
            </div>
        </div>
    `;
}


async function sendMessage() {
    // Permitir usuarios anónimos - sin verificar autenticación
    // El servidor guardará el chat solo si el usuario está autenticado

    const data = getQuotaData();
    if (!DISABLE_QUOTA && (data.count >= MAX_QUOTA || data.tokens >= MAX_TOKENS)) {
        updateQuotaUI();
        return;
    }

    const rawMsg = document.getElementById('userInput').value;

    // Validar mensaje antes de enviar
    const validation = validateChatMessage(rawMsg);
    if (!validation.valid) {
        alert(validation.error);
        return;
    }

    const msg = validation.sanitized;
    document.getElementById('userInput').value = "";
    const chat = document.getElementById('chatMessages');

    // Sanitizar mensaje para mostrar en UI
    const safeMsg = sanitizeHTML(msg);
    chat.innerHTML += `
        <div class="flex flex-col items-end mb-8 animate-fadeIn w-full">
            <div class="flex items-center gap-2 mb-1 mr-2">
                <p class="message-label user-label">Tú</p>
                <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <span class="material-icons-round text-white text-[16px]">person</span>
                </div>
            </div>
            <div class="user-bubble chat-message-bubble mr-10">
                ${safeMsg}
            </div>
        </div>
    `;

    // Agregar a historial local
    history.push({ role: "user", content: msg });

    // AGREGAR A PENDIENTES (NO guardar en DB todavía)
    pendingUserMessages.push({ role: "user", content: msg });

    // Si el usuario no está logueado, guardar en cola para persistir tras login
    if (!isLoggedIn) {
        pendingMessages.push({ role: "user", content: msg });
    }

    // Scroll al final
    chat.scrollTop = chat.scrollHeight;

    try {
        // Llamar a la API de forma segura
        const res = await secureFetch("/api/chat", {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
                messages: history,
                pdfContext: (pdfContextForAI && pdfContextForAI.length > 0) ? pdfContextForAI : pdfText,
                pdf_pages: pdfTextByPage,
                total_pages: totalPages,
                chatId: currentChatId // Asegurar que el servidor sepa si ya hay un chat
            })
        });

        // Manejar rate limiting del servidor
        if (res.status === 429) {
            const errorData = await res.json();
            const resetTime = new Date(errorData.resetTime);
            chat.innerHTML += `
                <div class="flex gap-4 items-start mb-6 animate-fadeIn">
                    <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <span class="material-icons-round text-red-500">error</span>
                    </div>
                    <div class="bg-red-50 text-red-700 p-4 rounded-2xl text-sm leading-relaxed shadow-sm border border-red-100">
                        Has excedido el límite de consultas diarias. El servicio se restablecerá el ${resetTime.toLocaleString('es-PE')}.
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

        // Renderizar mensaje de IA con referencias
        const aiMessageHTML = renderAIMessageWithReferences(rawReply, true, responseData.saved);
        chat.innerHTML += aiMessageHTML;

        // Activar clicks de referencias recién insertadas
        const lastMsg = chat.lastElementChild;
        if (lastMsg) wireReferenceClicks(lastMsg);

        history.push({ role: "assistant", content: rawReply });

        // Si el usuario no está logueado, guardar en cola para persistir tras login
        if (!isLoggedIn) {
            pendingMessages.push({ role: "assistant", content: rawReply });
        }

        chat.scrollTop = chat.scrollHeight;

        // ✅ El servidor ahora maneja el guardado condicional
        // Actualizar currentChatId si el servidor devolvió uno
        if (responseData.chatId) {
            // Solo actualizar si es diferente o si no teníamos uno
            if (!currentChatId || currentChatId !== responseData.chatId) {
                currentChatId = responseData.chatId;
                pendingUserMessages = [];

                // Solo recargar lista en la primera respuesta para evitar flicker
                if (!hasAIResponded && isLoggedIn) {
                    hasAIResponded = true;
                    await loadChatList();
                }
            }
        }

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
            <div class="flex gap-4 items-start mb-6 animate-fadeIn">
                <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                    <span class="material-icons-round text-red-500">error</span>
                </div>
                <div class="bg-red-50 text-red-700 p-4 rounded-2xl text-sm leading-relaxed shadow-sm border border-red-100">
                    Error de conexión: ${e.message || 'Servicio no disponible'}. Verifica tu conexión e intenta de nuevo.
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

// ============================================================================
// AUTENTICACIÓN
// ============================================================================

// Estado de autenticación
let isLoggedIn = false;
let authToken = null;
let currentUser = null;

/**
 * Inicializar estado de autenticación desde localStorage
 */
async function initAuth() {
    const storedToken = localStorage.getItem('neotesis_token');
    const storedUser = localStorage.getItem('neotesis_user');

    if (storedToken && storedUser) {
        try {
            authToken = storedToken;
            currentUser = JSON.parse(storedUser);

            // Verificar token con el servidor
            const isValid = await verifyAuthToken();

            if (isValid) {
                isLoggedIn = true;
                updateAuthUI();
                updateChatAuthUI();
            } else {
                // Token inválido - limpiar
                console.log('[Auth] Token inválido, limpiando sesión');
                localStorage.removeItem('neotesis_token');
                localStorage.removeItem('neotesis_user');
                authToken = null;
                currentUser = null;
                isLoggedIn = false;
            }
        } catch (e) {
            console.error('[Auth] Error verifying stored auth:', e);
            // Limpiar datos inválidos
            localStorage.removeItem('neotesis_token');
            localStorage.removeItem('neotesis_user');
            authToken = null;
            currentUser = null;
            isLoggedIn = false;
        }
    }
}

/**
 * Verificar token con el servidor
 */
async function verifyAuthToken() {
    try {
        const headers = {};
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch('/api/v4/user', {
            method: 'GET',
            headers: headers
        });

        const data = await response.json();

        if (data.authenticated && data.user) {
            // Actualizar datos del usuario desde el servidor
            currentUser = data.user;
            localStorage.setItem('neotesis_user', JSON.stringify(currentUser));
            return true;
        }

        return false;
    } catch (error) {
        console.error('[Auth] Error verifying token:', error);
        return false;
    }
}

/**
 * Actualizar UI según estado de autenticación
 */
function updateAuthUI() {
    const navAuthItem = document.getElementById('navAuthItem');

    if (!navAuthItem) {
        setTimeout(updateAuthUI, 50);
        return;
    }

    if (isLoggedIn && currentUser) {
        navAuthItem.innerHTML = `
            <div class="user-menu flex flex-col md:flex-row items-start md:items-center gap-4 w-full">
                <div class="user-info flex items-center gap-2 font-semibold text-primary">
                    <i class="fas fa-user-circle text-2xl text-accent"></i>
                    <span class="text-sm truncate max-w-[150px] md:max-w-none">${currentUser.email}</span>
                </div>
                <button class="bg-gray-100 hover:bg-gray-200 text-primary py-2.5 px-5 rounded-full font-bold inline-flex items-center gap-2 transition-all duration-300 border-none cursor-pointer text-xs w-full justify-center" onclick="handleLogout()">
                    <i class="fas fa-sign-out-alt"></i> Salir
                </button>
            </div>
        `;
    } else {
        navAuthItem.innerHTML = `
            <a href="#" onclick="openAuthModal(); return false;" class="bg-accent text-white py-2.5 px-5 rounded-full transition-all duration-300 hover:bg-accent-hover hover:scale-105 border-none cursor-pointer text-base w-fit after:hidden">
                <i class="fas fa-user"></i> Iniciar Sesión
            </a>
        `;
    }
}

/**
 * Abrir modal de autenticación
 */
function openAuthModal() {
    document.getElementById('authModal').style.display = 'flex';
    document.getElementById('authMessage').style.display = 'none';
    switchAuthTab('login');
}

/**
 * Cerrar modal de autenticación
 */
function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();
}

/**
 * Cambiar entre tabs de login/register
 */
function switchAuthTab(tab) {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const messageBox = document.getElementById('authMessage');

    messageBox.style.display = 'none';

    if (tab === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        loginTab.classList.remove('active');
        registerTab.classList.add('active');
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
}

/**
 * Mostrar mensaje de autenticación
 */
function showAuthMessage(message, type) {
    const toastType = type === 'error' ? 'error' : 'success';
    showToast(message, toastType);

    // Mantener compatibilidad con el modal por ahora
    const messageBox = document.getElementById('authMessage');
    if (messageBox) {
        messageBox.textContent = message;
        messageBox.className = `mt-6 p-4 rounded-xl text-center font-semibold ${type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
            }`;
        messageBox.style.display = 'block';
    }
}

/**
 * Manejar login
 */
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showAuthMessage('Por favor completa todos los campos', 'error');
        return;
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error al iniciar sesión');
        }

        // Guardar token y usuario
        authToken = data.token;
        currentUser = data.user;
        isLoggedIn = true;

        console.log('[Auth] Token recibido:', authToken ? authToken.substring(0, 20) + '...' : 'NULL');
        localStorage.setItem('neotesis_token', authToken);
        localStorage.setItem('neotesis_user', JSON.stringify(currentUser));

        console.log('[Auth] Token guardado en localStorage:', localStorage.getItem('neotesis_token') ? 'SÍ' : 'NO');

        showAuthMessage('¡Inicio de sesión exitoso!', 'success');

        setTimeout(async () => {
            closeAuthModal();
            updateAuthUI();
            updateChatAuthUI();

            // Guardar mensajes pendientes si los hay
            if (pendingMessages.length > 0) {
                console.log('[Auth] Persisting pending messages:', pendingMessages.length);
                try {
                    const chatTitle = generateChatTitle(pendingMessages);
                    const chatId = await createChat(chatTitle, pdfText); // Pass current pdfText

                    if (chatId) {
                        currentChatId = chatId;
                        // Guardar cada mensaje secuencialmente
                        for (const msg of pendingMessages) {
                            await saveChatMessage(chatId, msg.role, msg.content);
                        }

                        // Limpiar cola y actualizar estado
                        pendingMessages = [];

                        // Cargar el chat para sincronizar UI y PDF context
                        await loadChat(chatId);
                        console.log('[Auth] Pending messages persisted successfully in chat:', chatId);
                    }
                } catch (err) {
                    console.error('[Auth] Error persisting pending messages:', err);
                }
            }
        }, 1000);

    } catch (error) {
        showAuthMessage(error.message, 'error');
    }
}

/**
 * Manejar registro
 */
async function handleRegister(event) {
    event.preventDefault();

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

    if (!name || !email || !password || !passwordConfirm) {
        showAuthMessage('Por favor completa todos los campos', 'error');
        return;
    }

    if (name.length < 2 || name.length > 100) {
        showAuthMessage('El nombre debe tener entre 2 y 100 caracteres', 'error');
        return;
    }

    if (password !== passwordConfirm) {
        showAuthMessage('Las contraseñas no coinciden', 'error');
        return;
    }

    if (password.length < 8) {
        showAuthMessage('La contraseña debe tener al menos 8 caracteres', 'error');
        return;
    }

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, name })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error al registrar usuario');
        }

        // Guardar token y usuario
        authToken = data.token;
        currentUser = data.user;
        isLoggedIn = true;

        localStorage.setItem('neotesis_token', authToken);
        localStorage.setItem('neotesis_user', JSON.stringify(currentUser));

        showAuthMessage('¡Cuenta creada exitosamente!', 'success');

        setTimeout(async () => {
            closeAuthModal();
            updateAuthUI();
            updateChatAuthUI();

            // Guardar mensajes pendientes si los hay
            if (pendingMessages.length > 0) {
                console.log('[Auth] Persisting pending messages after register:', pendingMessages.length);
                try {
                    const chatTitle = generateChatTitle(pendingMessages);
                    const chatId = await createChat(chatTitle, pdfText); // Pass current pdfText

                    if (chatId) {
                        currentChatId = chatId;
                        for (const msg of pendingMessages) {
                            await saveChatMessage(chatId, msg.role, msg.content);
                        }
                        pendingMessages = [];
                        await loadChat(chatId); // Sincronizar UI
                    }
                } catch (err) {
                    console.error('[Auth] Error persisting messages after register:', err);
                }
            }
        }, 1500);

    } catch (error) {
        showAuthMessage(error.message, 'error');
    }
}

/**
 * Manejar logout
 */
function handleLogout() {
    authToken = null;
    currentUser = null;
    isLoggedIn = false;

    localStorage.removeItem('neotesis_token');
    localStorage.removeItem('neotesis_user');

    updateAuthUI();

    // Recargar página para limpiar estado
    window.location.reload();
}

/**
 * Obtener headers de autenticación
 */
function getAuthHeaders() {
    const headers = {
        'Content-Type': 'application/json'
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    return headers;
}

/**
 * Crear nuevo chat en el servidor
 */
async function createChat(title, pdfContent = null) {
    if (!isLoggedIn || !authToken) return null;

    try {
        const response = await fetch('/api/chats', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                title,
                pdf_content: pdfContent,
                pdf_pages: pdfTextByPage,
                total_pages: totalPages
            })
        });

        if (!response.ok) {
            throw new Error('Error creando chat');
        }

        const data = await response.json();
        // El servidor devuelve { chat: { id, ... } }
        return data.chat ? data.chat.id : (data.id || null);
    } catch (error) {
        console.error('Error creating chat:', error);
        return null;
    }
}

// ============================================================================
// GESTIÓN DE CHATS
// ============================================================================

let currentChatId = null;
let pendingMessages = []; // Mensajes pendientes de guardar si no hay chat activo

/**
 * Mostrar notificación de autenticación
 */
function showAuthNotification() {
    const notification = document.getElementById('authNotification');
    if (notification) {
        notification.style.display = 'block';
    }
}

/**
 * Ocultar notificación de autenticación
 */
function hideAuthNotification() {
    const notification = document.getElementById('authNotification');
    if (notification) {
        notification.style.display = 'none';
    }
}

/**
 * Abrir modal de auth desde el chat
 */
function openAuthModalFromChat() {
    openAuthModal();
}

/**
 * Generar título de chat desde el primer mensaje del usuario
 */
function generateChatTitle(messages) {
    const firstUserMsg = messages.find(m => m.role === 'user');
    if (!firstUserMsg) return 'Nuevo Chat';

    // Limpiar y truncar el mensaje para usar como título
    const title = firstUserMsg.content
        .replace(/<[^>]*>/g, '') // Remover HTML
        .replace(/\s+/g, ' ') // Normalizar espacios
        .trim();

    // Limitar a 40 caracteres
    if (title.length <= 40) return title;
    return title.substring(0, 40) + '...';
}

/**
 * Crear nuevo chat
 */
async function createNewChat() {
    if (!isLoggedIn || !authToken) return;

    // Cerrar sidebar en móvil si está abierto
    closeChatHistory();

    // Resetear estado local
    currentChatId = null;
    pendingUserMessages = [];
    hasAIResponded = false;
    history = [];

    // Limpiar contexto del PDF
    pdfText = "";
    pdfContextForAI = "";
    pdfTextByPage = [];
    pdfDocument = null;
    currentPage = 1;
    totalPages = 0;

    // Limpiar UI del PDF
    const pdfStatus = document.getElementById('pdfStatus');
    if (pdfStatus) {
        pdfStatus.innerHTML = '';
    }

    const pdfControls = document.getElementById('pdfControls');
    if (pdfControls) {
        pdfControls.style.display = 'none';
    }

    const pdfViewer = document.getElementById('pdfViewer');
    if (pdfViewer) {
        pdfViewer.innerHTML = '';
    }

    // Limpiar chat UI
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = `
        <div class="flex flex-col gap-2 max-w-4xl mx-auto w-full animate-fadeIn items-start mb-6">
            <div class="flex items-center gap-2 mb-1 ml-2">
                <div class="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <span class="material-icons-round text-primary text-[18px]">smart_toy</span>
                </div>
                <p class="message-label ai-label">Neotesis IA</p>
            </div>
            <div class="ai-bubble chat-message-bubble ml-10">
                Nuevo chat creado. Sube un PDF y podré responder preguntas específicas sobre su contenido.
            </div>
        </div>
    `;

    // Nota: NO creamos el chat en la base de datos todavía
    // Se creará automáticamente cuando la AI responda al primer mensaje

    console.log('Listo para nuevo chat. Se guardará cuando la AI responda.');
}

// ============================================================================
// NAVEGACIÓN MÓVIL PARA CHATPDF
// ============================================================================

/**
 * Alternar visibilidad del historial en móvil
 */
function toggleChatHistory() {
    const sidebar = document.getElementById('chatHistorySidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
}

/**
 * Cerrar historial en móvil
 */
function closeChatHistory() {
    const sidebar = document.getElementById('chatHistorySidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
}

/**
 * Alternar entre vista de Chat y PDF en móvil
 */
function toggleMobileView() {
    const layout = document.querySelector('.pdf-chat-layout');
    const toggleBtn = document.getElementById('viewToggleBtn');
    const icon = document.getElementById('viewToggleIcon');

    if (!layout || !toggleBtn || !icon) return;

    const isPdfActive = layout.classList.toggle('mobile-pdf-active');
    toggleBtn.classList.toggle('active');

    if (isPdfActive) {
        icon.textContent = 'chat';
    } else {
        icon.textContent = 'description';
    }
}

/**
 * Compartir el chat actual
 */
async function shareChat() {
    if (!currentChatId) {
        showToast('Primero debes iniciar un chat para compartirlo.', 'info', 'Compartir');
        return;
    }

    const shareData = {
        title: 'Neotesis Perú - Chat IA',
        text: 'Mira este análisis de PDF que estoy haciendo con Neotesis IA.',
        url: window.location.href
    };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            await navigator.clipboard.writeText(window.location.href);
            showToast('¡Enlace del chat copiado al portapapeles!', 'success');
        }
    } catch (err) {
        console.error('Error al compartir:', err);
    }
}

/**
 * Alternar menú de opciones del chat
 */
function toggleChatOptions() {
    const menu = document.getElementById('chatOptionsMenu');
    if (!menu) return;

    menu.classList.toggle('hidden');

    // Cerrar el menú al hacer clic fuera
    if (!menu.classList.contains('hidden')) {
        setTimeout(() => {
            document.addEventListener('click', closeChatOptionsOnClickOutside);
        }, 0);
    }
}

function closeChatOptionsOnClickOutside(e) {
    const menu = document.getElementById('chatOptionsMenu');
    const container = document.getElementById('chatOptionsContainer');

    if (menu && container && !container.contains(e.target)) {
        menu.classList.add('hidden');
        document.removeEventListener('click', closeChatOptionsOnClickOutside);
    }
}

/**
 * Eliminar el chat actual desde el menú de opciones
 */
async function deleteChatFromMenu() {
    if (!currentChatId) {
        showToast('No hay un chat activo para eliminar.', 'info');
        return;
    }

    // Cerrar el menú
    const menu = document.getElementById('chatOptionsMenu');
    if (menu) menu.classList.add('hidden');

    // Llamar a la función de eliminar chat existente
    await deleteChat(currentChatId);
}

/**
 * Renombrar el chat actual desde el menú de opciones
 */
async function renameChatFromMenu() {
    if (!currentChatId) {
        showToast('No hay un chat activo para renombrar.', 'info');
        return;
    }

    // Cerrar el menú
    const menu = document.getElementById('chatOptionsMenu');
    if (menu) menu.classList.add('hidden');

    // Obtener el título actual del chat
    const chatList = document.getElementById('chatList');
    const chatItem = chatList?.querySelector(`[onclick*="${currentChatId}"]`);
    const currentTitle = chatItem?.querySelector('.font-semibold')?.textContent || 'Nuevo Chat';

    // Mostrar prompt para nuevo nombre
    const newTitle = await showRenamePrompt('Renombrar chat', currentTitle);

    if (!newTitle || newTitle.trim() === '' || newTitle === currentTitle) {
        return;
    }

    // Llamar a la API para renombrar
    const token = authToken || localStorage.getItem('neotesis_token');
    if (!token) return;

    try {
        const response = await fetch(`/api/chats/${currentChatId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title: newTitle.trim() })
        });

        if (!response.ok) {
            throw new Error('Error al renombrar el chat');
        }

        // Actualizar la lista de chats
        await loadChatList();
        showToast('Chat renombrado exitosamente', 'success');

    } catch (error) {
        console.error('Error renaming chat:', error);
        showToast('Error al renombrar el chat', 'error');
    }
}

/**
 * Mostrar prompt personalizado para renombrar
 */
function showRenamePrompt(title, currentValue = '') {
    return new Promise((resolve) => {
        const existing = document.querySelector('.rename-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'rename-overlay confirm-overlay';

        overlay.innerHTML = `
            <div class="confirm-modal">
                <div class="confirm-icon" style="background: #dbeafe; color: #2563eb;">
                    <i class="fas fa-pen"></i>
                </div>
                <h3>${title}</h3>
                <input type="text" id="renameInput" class="rename-input" value="${currentValue}" maxlength="100" />
                <div class="confirm-actions">
                    <button class="btn-confirm btn-cancel" id="renameCancel">Cancelar</button>
                    <button class="btn-confirm" style="background: #2563eb; color: white;" id="renameAccept">Guardar</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const input = overlay.querySelector('#renameInput');
        const cancelBtn = overlay.querySelector('#renameCancel');
        const acceptBtn = overlay.querySelector('#renameAccept');

        // Focus y seleccionar texto
        setTimeout(() => {
            input.focus();
            input.select();
        }, 100);

        const close = (result) => {
            overlay.style.opacity = '0';
            overlay.style.pointerEvents = 'none';
            setTimeout(() => {
                overlay.remove();
                resolve(result);
            }, 300);
        };

        cancelBtn.onclick = () => close(null);
        acceptBtn.onclick = () => close(input.value);
        input.onkeydown = (e) => {
            if (e.key === 'Enter') close(input.value);
            if (e.key === 'Escape') close(null);
        };
        overlay.onclick = (e) => {
            if (e.target === overlay) close(null);
        };
    });
}

/**
 * Mostrar notificaciones tipo toast
 */
function showToast(message, type = 'success', title = '') {
    // Buscar o crear contenedor
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // Configuración según tipo
    let icon = 'check_circle';
    let defaultTitle = '¡Éxito!';

    if (type === 'error') {
        icon = 'error_outline';
        defaultTitle = 'Error';
    } else if (type === 'info') {
        icon = 'info';
        defaultTitle = 'Información';
    }

    const toastTitle = title || defaultTitle;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    toast.innerHTML = `
        <span class="material-icons-round toast-icon text-${type === 'success' ? 'emerald' : type === 'error' ? 'red-500' : 'blue-500'}">
            ${icon}
        </span>
        <div class="toast-content">
            <div class="toast-title">${toastTitle}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    // Eliminar del DOM después de que termine la animación
    setTimeout(() => {
        toast.remove();
        if (container.children.length === 0) {
            container.remove();
        }
    }, 3200);
}

/**
 * Mostrar modal de confirmación personalizado
 */
function showConfirm(title, message, confirmText = 'Eliminar', type = 'danger') {
    return new Promise((resolve) => {
        // Asegurarse de que no haya otros modales abiertos
        const existing = document.querySelector('.confirm-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';

        overlay.innerHTML = `
            <div class="confirm-modal">
                <div class="confirm-icon">
                    <i class="fas ${type === 'danger' ? 'fa-trash-can' : 'fa-triangle-exclamation'}"></i>
                </div>
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="confirm-actions">
                    <button class="btn-confirm btn-cancel" id="confirmCancel">Cancelar</button>
                    <button class="btn-confirm ${type === 'danger' ? 'btn-danger' : 'bg-accent text-white'}" id="confirmAccept">${confirmText}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const cancelBtn = overlay.querySelector('#confirmCancel');
        const acceptBtn = overlay.querySelector('#confirmAccept');

        const close = (result) => {
            overlay.style.opacity = '0';
            overlay.style.pointerEvents = 'none';
            setTimeout(() => {
                overlay.remove();
                resolve(result);
            }, 300);
        };

        cancelBtn.onclick = () => close(false);
        acceptBtn.onclick = () => close(true);
        overlay.onclick = (e) => {
            if (e.target === overlay) close(false);
        };
    });
}

/**
 * Guardar mensaje en el chat
 */
async function saveChatMessage(chatId, role, content) {
    if (!isLoggedIn || !authToken) return;

    try {
        await fetch(`/api/chats/${chatId}/messages`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ role, content })
        });
    } catch (error) {
        console.error('Error saving message:', error);
    }
}

/**
 * Cargar lista de chats
 */
async function loadChatList() {
    // Verificar autenticación - intentar obtener token de localStorage si no está en memoria
    const token = authToken || localStorage.getItem('neotesis_token');

    console.log('[Chat] loadChatList - token existe:', !!token);

    if (!token) {
        console.log('[Chat] No hay token, no se pueden cargar chats');
        return;
    }

    // Asegurarse de que el DOM esté completamente cargado
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => loadChatList());
        return;
    }

    const chatListPanel = document.getElementById('chatListPanel');
    const chatList = document.getElementById('chatList');
    const chatEmptyState = document.getElementById('chatEmptyState');

    if (!chatListPanel || !chatList) {
        console.log('[Chat] Elementos del DOM no encontrados');
        return;
    }

    console.log('[Chat] Obteniendo chats desde /api/chats...');

    try {
        const response = await fetch('/api/chats', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('[Chat] Response status:', response.status);

        if (response.status === 401) {
            // Token inválido - limpiar estado
            console.log('[Chat] Token inválido, limpiando sesión');
            if (isLoggedIn) {
                handleLogout();
            }
            return;
        }

        if (!response.ok) {
            throw new Error('Error cargando chats: ' + response.status);
        }

        const data = await response.json();
        console.log('[Chat] Raw response data:', data);
        console.log('[Chat] Data type:', typeof data, 'Is Array:', Array.isArray(data));
        // Handle both formats: { chats: [...] } or [...]
        const chats = Array.isArray(data) ? data : (data.chats || []);
        console.log('[Chat] Processed chats:', chats, 'Count:', chats.length);

        // Verificar elementos del DOM
        console.log('[Chat] Verificando elementos del DOM...');
        console.log('[Chat] chatListPanel exists:', chatListPanel !== null);
        console.log('[Chat] chatList exists:', chatList !== null);
        console.log('[Chat] chatEmptyState exists:', chatEmptyState !== null);

        // Verificar visibilidad
        console.log('[Chat] chatListPanel visibility:', chatListPanel ? window.getComputedStyle(chatListPanel).display : 'n/a');
        console.log('[Chat] chatEmptyState visibility:', chatEmptyState ? window.getComputedStyle(chatEmptyState).display : 'n/a');

        console.log('[Chat] Chats obtenidos:', chats.length);

        if (chats.length === 0) {
            console.log('[Chat] No hay chats, mostrando estado vacío');
            if (chatListPanel) chatListPanel.classList.add('hidden');
            if (chatEmptyState) chatEmptyState.classList.remove('hidden');
            if (chatEmptyState) chatEmptyState.style.display = 'flex';
            return;
        }

        console.log('[Chat] Mostrando', chats.length, 'chats en el sidebar');
        if (chatEmptyState) {
            chatEmptyState.classList.add('hidden');
            chatEmptyState.style.display = 'none';
        }

        // Asegurarse de que el panel de lista esté visible
        if (chatListPanel) chatListPanel.classList.remove('hidden');

        chatList.innerHTML = chats.map(chat => {
            return `
                <div class="chat-item group ${currentChatId === chat.id ? 'active' : ''}" onclick="loadChat('${chat.id}')">
                    <span class="material-icons-round text-[18px] opacity-70">${currentChatId === chat.id ? 'chat' : 'description'}</span>
                    <div class="flex-grow truncate">
                        <div class="font-semibold truncate">${sanitizeText(chat.title)}</div>
                    </div>
                    <button class="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all rounded" 
                            onclick="event.stopPropagation(); deleteChat('${chat.id}')" title="Eliminar chat">
                        <span class="material-icons-round text-[16px]">close</span>
                    </button>
                </div>
            `;
        }).join('');

        // DIAGNOSTIC LOGGING - Analyze sidebar layout
        setTimeout(() => {
            const sidebar = document.getElementById('chatHistorySidebar');
            const chatItems = document.querySelectorAll('.chat-item');
            const chatDates = document.querySelectorAll('.chat-item-date');

            console.log('=== SIDEBAR LAYOUT DIAGNOSTICS ===');
            if (sidebar) {
                const sidebarStyles = window.getComputedStyle(sidebar);
                console.log('Sidebar dimensions:', {
                    width: sidebar.offsetWidth,
                    height: sidebar.offsetHeight,
                    minWidth: sidebarStyles.minWidth,
                    maxWidth: sidebarStyles.maxWidth,
                    overflow: sidebarStyles.overflow,
                    overflowX: sidebarStyles.overflowX,
                    overflowY: sidebarStyles.overflowY
                });
            }

            if (chatItems.length > 0) {
                const firstItem = chatItems[0];
                const itemStyles = window.getComputedStyle(firstItem);
                console.log('First chat item dimensions:', {
                    width: firstItem.offsetWidth,
                    height: firstItem.offsetHeight,
                    padding: itemStyles.padding,
                    gap: itemStyles.gap
                });
            }

            if (chatDates.length > 0) {
                const firstDate = chatDates[0];
                const dateStyles = window.getComputedStyle(firstDate);
                console.log('First chat date element:', {
                    text: firstDate.textContent,
                    width: firstDate.offsetWidth,
                    scrollWidth: firstDate.scrollWidth,
                    whiteSpace: dateStyles.whiteSpace,
                    overflow: dateStyles.overflow,
                    textOverflow: dateStyles.textOverflow
                });
            }
            console.log('=== END DIAGNOSTICS ===');
        }, 100);

    } catch (error) {
        console.error('[Chat] Error loading chats:', error);
    }
}

/**
 * Eliminar un chat
 */
async function deleteChat(chatId) {
    const confirmed = await showConfirm(
        '¿Eliminar este chat?',
        'Esta acción borrará permanentemente todo el historial del chat y no podrás recuperarlo.'
    );

    if (!confirmed) return;

    const token = authToken || localStorage.getItem('neotesis_token');
    if (!token) return;

    try {
        const response = await fetch(`/api/chats/${chatId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            console.log('[Chat] Token inválido al eliminar chat');
            if (isLoggedIn) {
                handleLogout();
            }
            return;
        }

        if (!response.ok) {
            throw new Error('Error al eliminar chat');
        }

        // Si se eliminó el chat actual, limpiar UI
        if (currentChatId === chatId) {
            currentChatId = null;
            history = [];
            pendingUserMessages = [];
            hasAIResponded = false;

            // Limpiar contexto del PDF
            pdfText = "";
            pdfContextForAI = "";
            pdfTextByPage = [];
            pdfDocument = null;

            // Limpiar UI del PDF
            const pdfStatus = document.getElementById('pdfStatus');
            if (pdfStatus) {
                pdfStatus.innerHTML = '';
            }

            const pdfControls = document.getElementById('pdfControls');
            if (pdfControls) {
                pdfControls.style.display = 'none';
            }

            const pdfViewer = document.getElementById('pdfViewer');
            if (pdfViewer) {
                pdfViewer.innerHTML = '';
            }

            // Limpiar chat UI
            const chatMessages = document.getElementById('chatMessages');
            if (chatMessages) {
                chatMessages.innerHTML = `
                    <div class="flex gap-4 max-w-4xl mx-auto w-full animate-fadeIn">
                        <div class="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                            <span class="material-icons-round text-primary text-[20px]">smart_toy</span>
                        </div>
                        <div class="space-y-1 flex-grow">
                            <p class="text-[10px] font-bold text-gray uppercase tracking-wider">Neotesis IA</p>
                            <div class="chat-message-ai p-4 rounded-2xl rounded-tl-sm text-sm leading-relaxed text-dark dark:text-gray shadow-sm">
                                Chat eliminado. Sube un PDF y podré responder preguntas específicas sobre su contenido.
                            </div>
                        </div>
                    </div>
                `;
            }
        }

        // Recargar lista
        await loadChatList();

    } catch (error) {
        console.error('Error deleting chat:', error);
        showToast('Error al eliminar el chat. Por favor, intenta de nuevo.', 'error');
    }
}

/**
 * Cargar un chat específico
 */
async function loadChat(chatId) {
    const token = authToken || localStorage.getItem('neotesis_token');
    if (!token) return;

    currentChatId = chatId;

    // Cerrar sidebar en móvil si está abierto
    closeChatHistory();

    // Resetear estado de pendientes
    pendingUserMessages = [];
    hasAIResponded = true; // Ya hay un chat cargado

    try {
        const response = await fetch(`/api/chats/${chatId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            console.log('[Chat] Token inválido al cargar chat');
            if (isLoggedIn) {
                handleLogout();
            }
            return;
        }

        if (!response.ok) {
            throw new Error('Error cargando chat');
        }

        const data = await response.json();
        const chat = data.chat || data;
        const messages = chat.Messages || [];
        const pdfContent = chat.pdf_content || null;

        // Actualizar contexto del PDF del chat
        if (pdfContent) {
            console.log('[Chat] PDF content found for chat:', chat.id);
            pdfText = pdfContent;
            pdfContextForAI = pdfContent;

            // Cargar páginas si existen
            console.log('[Chat] pdf_pages in chat object:', !!chat.pdf_pages);
            if (chat.pdf_pages) {
                try {
                    pdfTextByPage = typeof chat.pdf_pages === 'string' ? JSON.parse(chat.pdf_pages) : chat.pdf_pages;
                    totalPages = chat.total_pages || pdfTextByPage.length;
                    isHtmlView = true;
                    currentPage = 1;

                    // Mostrar visor y controles
                    const viewer = document.getElementById('pdfViewer');
                    const emptyState = document.getElementById('pdfEmptyState');
                    const controls = document.getElementById('pdfControls');

                    if (viewer) {
                        viewer.classList.remove('hidden');
                        viewer.style.display = 'block';
                    }
                    if (emptyState) {
                        emptyState.classList.add('hidden');
                        emptyState.style.display = 'none';
                    }
                    if (controls) {
                        controls.style.display = 'flex';
                    }

                    // Renderizar página inicial como HTML
                    await renderPage(1);
                    updatePageNavigation();
                } catch (e) {
                    console.error('[Chat] Error parsing pdf_pages:', e);
                    isHtmlView = false;
                }
            } else {
                isHtmlView = false;
            }

            // Actualizar UI del PDF
            const pdfStatus = document.getElementById('pdfStatus');
            if (pdfStatus) {
                pdfStatus.innerHTML = `<span class="material-icons-round text-[16px] text-emerald-500">check_circle</span> PDF cargado (${isHtmlView ? 'Vista HTML' : 'Texto'})`;
            }

            // Actualizar subtítulo del header
            const pdfNameHeader = document.getElementById('currentChatPdfName');
            if (pdfNameHeader) {
                const displayTitle = chat.title || 'Documento del chat';
                pdfNameHeader.textContent = `Basado en: ${displayTitle.length > 25 ? displayTitle.substring(0, 25) + '...' : displayTitle}`;
            }

            console.log('[Chat] PDF context loaded from chat:', pdfContent.substring(0, 100) + '...');
        } else {
            // Limpiar contexto del PDF si el chat no tiene PDF
            pdfText = "";
            pdfContextForAI = "";
            pdfTextByPage = [];
            pdfDocument = null;
            isHtmlView = false;

            // Actualizar UI del PDF
            const pdfStatus = document.getElementById('pdfStatus');
            if (pdfStatus) {
                pdfStatus.innerHTML = '<i class="fas fa-info-circle"></i> Este chat no tiene PDF asociado';
            }

            // Ocultar controles del PDF
            const pdfControls = document.getElementById('pdfControls');
            if (pdfControls) {
                pdfControls.style.display = 'none';
            }

            // Limpiar visor del PDF
            const pdfViewer = document.getElementById('pdfViewer');
            if (pdfViewer) {
                pdfViewer.innerHTML = '';
            }

            console.log('[Chat] No PDF content in chat');
        }

        // Limpiar messages locales
        history = [];

        // Cargar messages en UI
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;

        chatMessages.innerHTML = '';

        messages.forEach(msg => {
            const isUser = msg.role === 'user';

            if (isUser) {
                // Renderizar mensaje de usuario
                chatMessages.innerHTML += `
                    <div class="flex flex-col items-end mb-8 animate-fadeIn w-full">
                        <div class="flex items-center gap-2 mb-1 mr-2">
                            <p class="message-label user-label">Tú</p>
                            <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                <span class="material-icons-round text-white text-[16px]">person</span>
                            </div>
                        </div>
                        <div class="user-bubble mr-10 chat-message-bubble">
                            ${sanitizeHTML(msg.content)}
                        </div>
                    </div>
                `;
            } else {
                // Renderizar mensaje de IA con referencias
                chatMessages.innerHTML += renderAIMessageWithReferences(msg.content, false, false);
            }

            // Agregar al history (mensajes estructurados para la API)
            history.push({ role: msg.role, content: msg.content });
        });

        // Activar clicks de referencias en todos los mensajes cargados
        wireReferenceClicks(chatMessages);

        // Actualizar lista para mostrar el chat activo
        await loadChatList();

        chatMessages.scrollTop = chatMessages.scrollHeight;

    } catch (error) {
        console.error('Error loading chat:', error);
    }
}

/**
 * Actualizar UI del chat según estado de autenticación
 */
function updateChatAuthUI() {
    const chatListPanel = document.getElementById('chatListPanel');
    const chatEmptyState = document.getElementById('chatEmptyState');
    const authNotification = document.getElementById('authNotification');

    console.log('[Chat] updateChatAuthUI - isLoggedIn:', isLoggedIn, 'currentUser:', currentUser ? currentUser.id : null);

    if (isLoggedIn && currentUser) {
        console.log('[Chat] Usuario logueado, cargando chats...');
        hideAuthNotification();
        loadChatList();
    } else {
        console.log('[Chat] Usuario NO logueado, mostrando estado vacío');
        if (chatListPanel) {
            chatListPanel.classList.add('hidden');
        }
        if (chatEmptyState) {
            chatEmptyState.classList.remove('hidden');
            chatEmptyState.style.display = 'flex';
        }
        if (authNotification) {
            authNotification.classList.remove('hidden');
            authNotification.style.display = 'block';
        }
        currentChatId = null;
        pendingUserMessages = [];
        hasAIResponded = false;
    }
}

// Inicializar auth al cargar
document.addEventListener('DOMContentLoaded', async () => {
    await initAuth();
    updateQuotaUI();
    resetSessionTimer();
    resetSessionTimer();

    // Monitorear actividad del usuario
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
        document.addEventListener(event, updateActivity, true);
    });

    // Cerrar modal al hacer clic fuera
    document.getElementById('authModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('authModal')) {
            closeAuthModal();
        }
    });
});

// Función para formatear fechas
function formatDate(dateString) {
    if (!dateString) return 'Fecha desconocida';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    return date.toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
