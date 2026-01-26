// scripts.js - Motor de Citación y Análisis Neotesis Perú

function showSection(sectionId) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    const targetSection = document.getElementById(sectionId);
    if (targetSection) targetSection.classList.add('active');

    document.querySelectorAll('nav a').forEach(a => {
        a.classList.remove('active');
        // Si el href o el onclick coincide con el id de la sección
        if (a.getAttribute('onclick')?.includes(`'${sectionId}'`)) {
            a.classList.add('active');
        }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openWhatsApp() {
    window.open("https://wa.me/51900000000?text=Hola,%20necesito%20asesoría%20con%20mi%20tesis", "_blank");
}

// --- LÓGICA CALCULADORA DE MUESTRA ---
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

// --- UTILIDAD DE RED ROBUSTA (TRIPLE PROXY) ---
async function fetchWithProxy(url, asJson = true) {
    const proxies = [
        `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        `https://corsproxy.io/?${encodeURIComponent(url)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ];

    let lastError = null;
    for (let proxy of proxies) {
        try {
            console.log(`Buscando vía: ${proxy.split('?')[0]}`);
            const response = await fetch(proxy);
            if (response.ok) {
                const text = await response.text();
                let contents = text;

                if (proxy.includes("allorigins")) {
                    try {
                        const outer = JSON.parse(text);
                        contents = outer.contents;
                    } catch (e) { }
                }

                if (contents) {
                    if (asJson) {
                        try { return JSON.parse(contents); } catch (e) { return contents; }
                    }
                    return contents;
                }
            }
        } catch (e) {
            console.warn(`Bridge fallido: ${proxy.split('?')[0]}`);
            lastError = e;
        }
    }
    throw lastError || new Error("LIMIT_REACHED");
}

// --- LÓGICA DE CITACIÓN UNIFICADA ---
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
    t = t.replace(/([:.\?\!]\s+)([a-z0-9])/g, (m, p1, p2) => p1 + p2.toUpperCase());
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
        year: data.created?.["date-parts"]?.[0]?.[0] || "s. f.",
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

    // Procesar uno por uno para control de UI y evitar bloqueos de proxy
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

// Función auxiliar para centralizar la búsqueda en Alicia
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

// --- CHAT IA ---
const GROQ_API_KEY = "PLACEHOLDER_KEY_NETLIFY";
const MAX_QUOTA = 3;
const MAX_TOKENS = 100000;
const QUOTA_RESET_TIME = 24 * 60 * 60 * 1000; // 24 horas en ms
let pdfText = "";
let history = [];
let quotaInterval = null;

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
            sendBtn.style.width = 'auto'; // Ajuste para el texto largo
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

async function handlePdfUpload(input) {
    const file = input.files[0];
    if (!file) return;
    try {
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(' ') + " ";
        }
        pdfText = text.substring(0, 12000);
        document.getElementById('pdfStatus').innerText = "PDF listo.";
    } catch (e) { alert("Error PDF"); }
}

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
    chat.innerHTML += `<div class="msg user">${msg}</div>`;
    history.push({ role: "user", content: msg });

    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "system", content: "Asistente Neotesis Perú. Contexto: " + pdfText }, ...history]
            })
        });
        const responseData = await res.json();
        const reply = responseData.choices[0].message.content;
        chat.innerHTML += `<div class="msg ai">${reply}</div>`;
        history.push({ role: "assistant", content: reply });
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
        chat.innerHTML += `<div class="msg ai" style="color: #ef4444;">Error de conexión: ${e.message || 'Servicio no disponible'}. Revisa la consola para más detalles.</div>`;
    }
}
function handleEnter(e) { if (e.key === 'Enter') sendMessage(); }

