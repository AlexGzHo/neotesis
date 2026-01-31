import { useState, useCallback } from 'react';
import { useSecureFetch } from './useSecureFetch';
import { api } from '../services/api';
import { sanitizeInput } from '../utils/sanitization';

export const useChat = (quota) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { secureFetch } = useSecureFetch();

  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content, timestamp: Date.now() }]);
  };

  const sendMessage = useCallback(async (content, pdfContext = []) => {
    if (!content.trim()) return;
    
    // Check quota
    if (quota && !quota.isAvailable) {
        setError("Límite de cuota excedido. Intenta más tarde.");
        return;
    }

    setLoading(true);
    setError(null);
    
    // Optimistic UI update
    const sanitizedContent = sanitizeInput(content);
    addMessage('user', sanitizedContent);

    try {
      // Consume quota
      if (quota) quota.incrementQuota();

      // Prepare context from PDF
      // context is array of {page, text}
      // We might need to select relevant chunks here or send all depending on backend
      // Assuming backend expects "context" or similar
      const contextString = pdfContext.map(p => `Página ${p.page}: ${p.text}`).join('\n\n');

      const requestConfig = api.chat.sendMessage({
        message: sanitizedContent,
        history: messages, // Send history for context if backend supports it
        context: contextString
      });

      const response = await secureFetch(requestConfig.url, {
        method: requestConfig.method,
        body: requestConfig.body
      });

      if (response && response.reply) {
          addMessage('ai', response.reply);
      } else {
          throw new Error("Respuesta inválida del servidor");
      }

    } catch (err) {
      console.error("Chat error:", err);
      setError("Error al procesar tu mensaje. Intenta nuevamente.");
      addMessage('system', "Error: No se pudo conectar con el asistente.");
    } finally {
      setLoading(false);
    }
  }, [messages, quota, secureFetch]);

  const clearChat = () => {
      setMessages([]);
      setError(null);
  };

  return {
    messages,
    loading,
    error,
    sendMessage,
    clearChat
  };
};
