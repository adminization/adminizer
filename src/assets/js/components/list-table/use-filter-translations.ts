import { useI18n } from '@/hooks/use-i18n';

export function useFilterTranslations(_modelName: string) {
    const { t } = useI18n();
    return { t, loading: false };
}
