import { useState, useCallback } from 'react';
import { useSecureFetch } from './useSecureFetch';
import { api } from '../services/api';
import { formatAPA } from '../utils/citation';

import { unifiedExtractMetadata } from '../utils/citationScraper';

export const useCitation = () => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const { secureFetch } = useSecureFetch();

    const fetchSingleCitation = useCallback(async (url) => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const data = await unifiedExtractMetadata(url, secureFetch);
            
            if (data.error) {
                throw new Error(data.text);
            }
            
            setResult(data.text);
        } catch (err) {
            console.error(err);
            setError(err.message || "Error al generar la cita.");
        } finally {
            setLoading(false);
        }
    }, [secureFetch]);

    return {
        fetchSingleCitation,
        loading,
        result,
        error
    };
};
