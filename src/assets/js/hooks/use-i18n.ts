import {usePage} from '@inertiajs/react';
import {SharedData} from '@/types';

type TranslationMap = Record<string, string>;

interface UseI18nOptions {
    page?: TranslationMap;
}

export function useI18n(options?: UseI18nOptions) {
    const page = usePage<SharedData>();
    const pageProps = page.props as SharedData;

    const common = pageProps.i18n?.common || {};
    const pageMessages = options?.page || pageProps.i18n?.page || pageProps.i18nPage || {};

    const t = (key: string, fallback?: string): string => {
        return (
            pageMessages[key]
            || common[key]
            || fallback
            || key
        );
    };

    return {
        t,
        locale: pageProps.i18n?.locale
    };
}
