import {createContext} from "react";

interface CatalogContextProps {
    messages: Record<string, string>;
}

export const CatalogContext = createContext<CatalogContextProps>({
    messages: {},
});