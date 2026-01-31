import { useState, useCallback } from 'react';
import { sanitizeInput } from '../utils/sanitization';

export const useSecureFetch = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const secureFetch = useCallback(async (url, options = {}) => {
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('neotesis_token');
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Optional: Sanitize deep if needed, but usually we sanitize on display
      // For now returning raw data, sanitization should happen at display or specific hooks

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { secureFetch, loading, error };
};
