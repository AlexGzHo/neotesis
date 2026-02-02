const fetch = require('node-fetch');
const { SECURITY_CONFIG } = require('../config/security.config');
const { securityLogger } = require('../utils/logger');

class AIService {
    constructor() {
        this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    }

    /**
     * Generates a title for a chat based on the first message
     */
    generateTitle(firstMessage) {
        if (!firstMessage || typeof firstMessage !== 'string') {
            return 'Nuevo Chat';
        }

        const title = firstMessage.substring(0, 50).trim().replace(/\s+/g, ' ');
        return title.length < firstMessage.length ? title + '...' : title;
    }

    /**
     * Constructs the system prompt based on context
     */
    buildMessages(userMessages, pdfContext) {
        const messages = [];

        if (pdfContext && pdfContext.trim().length > 0) {
            messages.push({
                role: 'system',
                content: `-Eres un asistente académico experto que responde ÚNICAMENTE con información extraída del PDF cargado.

Reglas estrictas:
- No describas la estructura del documento.
- No menciones índices, secciones, figuras ni organización del PDF.
- No digas "el documento", "el PDF", "este material".
- Responde directamente al contenido como si fuera conocimiento propio.
- Ve directo al tema sin introducciones generales.
- Prioriza definiciones claras, explicaciones concretas y conceptos clave.
- Si el usuario hace una pregunta, responde solo lo que se pregunta.

Estilo de respuesta:
- Directo
- Conciso
- Enfocado en el contenido
- Sin lenguaje meta o descriptivo del archivo

Contexto del PDF:
${pdfContext}`
            });
        } else {
            messages.push({
                role: 'system',
                content: 'Eres un asistente académico de Neotesis Perú. Ayuda a los estudiantes con sus consultas académicas de manera clara y precisa.'
            });
        }

        messages.push(...userMessages);
        return messages;
    }

    /**
     * Executes the call to Groq API with retries/fallback
     */
    async generateResponse(messages, clientIP) {
        const primaryModel = SECURITY_CONFIG.AI_MODELS.PRIMARY;
        const secondaryModel = SECURITY_CONFIG.AI_MODELS.SECONDARY;
        const apiKey = SECURITY_CONFIG.GROQ_API_KEY;

        if (!apiKey) {
            throw new Error('GROQ_API_KEY_MISSING');
        }

        const tryGroqAPI = async (model) => {
            return await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 2048
                })
            });
        };

        securityLogger.info('Sending request to Groq API', { ip: clientIP, model: primaryModel });

        let response = await tryGroqAPI(primaryModel);

        if (response.status === 429) {
            securityLogger.warn('Primary model rate limited, trying secondary', { ip: clientIP, primaryModel });
            response = await tryGroqAPI(secondaryModel);
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw {
                status: response.status,
                message: errorText,
                isApiError: true
            };
        }

        const data = await response.json();

        if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
            throw {
                status: 500,
                message: 'Invalid API response structure',
                isApiError: true
            };
        }

        return data;
    }
}

module.exports = new AIService();
