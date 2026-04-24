import { useState, useEffect } from 'react';
import axios from 'axios';

interface FilterTranslations {
    [key: string]: string;
}

export function useFilterTranslations(modelName: string) {
    const [translations, setTranslations] = useState<FilterTranslations>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadTranslations = async () => {
            if (!modelName) return;

            setLoading(true);
            try {
                const response = await axios.get(`/adminizer/model/${modelName}/filter/locales`);
                setTranslations(response.data.data || {});
            } catch (error) {
                console.error('Error loading filter translations:', error);
            } finally {
                setLoading(false);
            }
        };

        loadTranslations();
    }, [modelName]);

    const t = (key: string): string => {
        return translations[key] || key;
    };

    return { t, loading };
}
