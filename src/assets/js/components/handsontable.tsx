import { HotTable, HotColumn } from '@handsontable/react-wrapper';
import { registerAllModules } from 'handsontable/registry';
import { ColumnSettings, GridSettings } from "handsontable/settings";
import { useCallback, useEffect, useRef, useState } from 'react';
import { RowObject, CellChange } from "handsontable/common";
import { useAppearance } from "@/hooks/use-appearance";
import {
    registerLanguageDictionary,
    deDE, enUS, esMX, frFR, itIT, jaJP, koKR, nlNL, plPL, ptBR, ruRU, zhCN
} from 'handsontable/i18n';

registerAllModules();

const languageDictionaries: Record<string, {
    [p: string]: string | string[];
    languageCode: string;
}> = {
    'de': deDE, 'en': enUS, 'es': esMX, 'fr': frFR, 'it': itIT,
    'ja': jaJP, 'ko': koKR, 'nl': nlNL, 'pl': plPL, 'pt': ptBR,
    'ru': ruRU, 'zh': zhCN,
};

const docLang = document.documentElement.lang;
const lang = languageDictionaries[docLang] ?? languageDictionaries['en'];
registerLanguageDictionary(lang);

interface TableProps {
    config: GridSettings;
    data?: any[][] | RowObject[] | undefined;
    onChange: (data: any) => void;
    disabled?: boolean;
}

const HandsonTable = ({ config, data = [], onChange, disabled }: TableProps) => {
    const { appearance } = useAppearance();
    const [theme, setTheme] = useState<string>('ht-theme-main');
    const [visible, setVisible] = useState<boolean>(false);
    const hotTableRef = useRef<any>(null);

    // ✅ 1. Исправленная сигнатура afterChange (но с сохранением логики)
    const handleChange = useCallback((changes: CellChange[] | null, source: string) => {
        if (source === 'loadData' || !changes) return;
        const hotData = hotTableRef.current?.hotInstance?.getSourceData();
        onChange(hotData);
    }, [onChange]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (hotTableRef.current?.hotInstance) {
                hotTableRef.current.hotInstance.loadData(data ?? []);
                setVisible(true);
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [data]);

    useEffect(() => {
        setTheme(appearance === 'dark' ? 'ht-theme-main-dark' : 'ht-theme-main');
    }, [appearance]);

    const { columns, ...restConfig } = config;

    return (
        <div style={{ opacity: visible ? 1 : 0 }}>
            <HotTable
                {...(restConfig as any)}
                className={disabled ? 'pointer-events-none opacity-50' : ''}
                themeName={theme}
                language={lang.languageCode}
                ref={hotTableRef}
                afterChange={handleChange}
            >
                {Array.isArray(columns) && columns.map((item: ColumnSettings) => (
                    <HotColumn
                        key={String(item.data)}
                        data={item.data}
                        {...(item as any)}
                    />
                ))}
            </HotTable>
        </div>
    );
};

export default HandsonTable;