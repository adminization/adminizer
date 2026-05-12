import {
    createContext,
    FC,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { apiHttp } from "@/lib/http-client";
import { LoaderCircle } from "lucide-react";
import {
    DialogStack,
    DialogStackBody,
    DialogStackContent,
    DialogStackHandle,
    DialogStackOverlay,
} from "@/components/ui/dialog-stack";
import AddForm from "@/components/add-form";
import { AddProps } from "@/pages/add";

type RelationEntry = {
    model: string;
    id: string | number | null;
    props: AddProps | null;
    loading: boolean;
    error?: string;
};

type RelationStackContextValue = {
    open: (model: string, id: string | number) => void;
    openCreate: (model: string) => void;
};

const RelationStackContext = createContext<RelationStackContextValue | null>(null);

export const useRelationStack = (): RelationStackContextValue | null => {
    return useContext(RelationStackContext);
};

const RelationPanel: FC<{ entry: RelationEntry; onSaved: () => void }> = ({ entry, onSaved }) => {
    if (entry.loading || !entry.props) {
        return (
            <div className="flex items-center justify-center h-full w-full">
                <LoaderCircle className="h-6 w-6 animate-spin" />
            </div>
        );
    }
    if (entry.error) {
        return <div className="p-4 text-red-500">{entry.error}</div>;
    }
    return (
        <div className="h-full">
            <AddForm
                page={{ props: entry.props }}
                catalog={true}
                callback={() => onSaved()}
            />
        </div>
    );
};

const RelationDialogStackProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const dialogRef = useRef<DialogStackHandle>(null);
    const [stack, setStack] = useState<RelationEntry[]>([]);
    const prevLenRef = useRef(0);

    const loadEntry = useCallback(async (index: number, model: string, id: string | number | null) => {
        try {
            const url = id === null
                ? `${window.routePrefix}/model/${model}/add?without_layout=true`
                : `${window.routePrefix}/model/${model}/edit/${id}?without_layout=true`;
            const res = await apiHttp.get<any>(url);
            const props = res.data?.props ?? res.data;
            setStack((prev) => {
                const next = [...prev];
                if (next[index] && next[index].model === model && next[index].id === id) {
                    next[index] = { ...next[index], loading: false, props };
                }
                return next;
            });
        } catch (e: any) {
            setStack((prev) => {
                const next = [...prev];
                if (next[index] && next[index].model === model && next[index].id === id) {
                    next[index] = { ...next[index], loading: false, error: e?.message || "Error" };
                }
                return next;
            });
        }
    }, []);

    const open = useCallback(
        (model: string, id: string | number) => {
            setStack((prev) => {
                const nextIndex = prev.length;
                const newEntry: RelationEntry = { model, id, props: null, loading: true };
                loadEntry(nextIndex, model, id);
                return [...prev, newEntry];
            });
        },
        [loadEntry]
    );

    const openCreate = useCallback(
        (model: string) => {
            setStack((prev) => {
                const nextIndex = prev.length;
                const newEntry: RelationEntry = { model, id: null, props: null, loading: true };
                loadEntry(nextIndex, model, null);
                return [...prev, newEntry];
            });
        },
        [loadEntry]
    );

    // When stack grows, open dialog (first entry) or advance to next panel
    useEffect(() => {
        const prev = prevLenRef.current;
        const cur = stack.length;
        if (cur > prev) {
            if (prev === 0) {
                dialogRef.current?.open();
            } else {
                for (let i = 0; i < cur - prev; i++) {
                    dialogRef.current?.next();
                }
            }
        }
        prevLenRef.current = cur;
    }, [stack.length]);

    const handleDialogOpenChange = useCallback((isOpen: boolean) => {
        if (!isOpen) {
            setStack([]);
            prevLenRef.current = 0;
        }
    }, []);

    const handleSaved = useCallback(() => {
        setStack((prev) => {
            if (prev.length <= 1) {
                dialogRef.current?.close();
                prevLenRef.current = 0;
                return [];
            }
            dialogRef.current?.prev();
            prevLenRef.current = prev.length - 1;
            return prev.slice(0, -1);
        });
    }, []);

    const ctxValue = useMemo<RelationStackContextValue>(() => ({ open, openCreate }), [open, openCreate]);

    return (
        <RelationStackContext.Provider value={ctxValue}>
            {children}
            <DialogStack ref={dialogRef} onOpenChange={handleDialogOpenChange}>
                <DialogStackOverlay />
                {stack.length > 0 && (
                    <DialogStackBody>
                        {stack.map((entry, idx) => (
                            <DialogStackContent key={`${entry.model}-${entry.id}-${idx}`}>
                                <RelationPanel entry={entry} onSaved={handleSaved} />
                            </DialogStackContent>
                        ))}
                    </DialogStackBody>
                )}
            </DialogStack>
        </RelationStackContext.Provider>
    );
};

export default RelationDialogStackProvider;
