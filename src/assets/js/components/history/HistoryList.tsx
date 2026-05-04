import { FC, useEffect, useState } from "react"
import axios from "axios";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HistoryActionsAP } from "src/models/HistoryActionsAP";
import { Button } from "@/components/ui/button";
import { Braces, LoaderCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DiffViewer } from "@/components/history/DiffViewer";
import { UserAP } from "src/models/UserAP";
import { useI18n } from "@/hooks/use-i18n";

interface HistoryListProps {
    modelName: string,
    modelId: number | string
    handleWatchHistory: (data: Record<string, any>) => void
}

export type HistoryItem = Omit<HistoryActionsAP, 'user'> & {
    user: UserAP;
    displayName: string;
};

const HistoryList: FC<HistoryListProps> = ({ modelName, modelId, handleWatchHistory }) => {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [diffOpen, setDiffOpen] = useState(false);
    const [diffItem, setDiffItem] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const storageKey = 'currentHistoryView';
    const { t } = useI18n();
    const diffLabel = t("Diff");
    
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true); // Enable the loader before the request
            try {
                const res = await axios.post(`${window.routePrefix}/history/get-model-history`, {
                    modelName,
                    modelId
                });
                
                if (res.data.data) {
                    setHistory(res.data.data);
                }
            } catch (e) {
                console.log(e);
            } finally {
                setLoading(false); // Disable the loader after completion
            }
        };
        fetchData();
    }, [modelName, modelId]);

    const watchHistory = async (id: string | number) => {
        try {
            const res = await axios.post(`${window.routePrefix}/history/get-model-fields`, {
                historyId: id
            })
            
            if (res.data.data) {
                localStorage.setItem(storageKey, id.toString());

                handleWatchHistory(res.data.data);
            }
        } catch (e) {
            console.log(e);
        }
    };

    const isCurrent = (item: HistoryItem) => {
    const localCurrentId = localStorage.getItem(storageKey);
    if (localCurrentId) {
        return localCurrentId === item.id.toString();
    }
    return item.isCurrent;
};

    return (
        <div className="relative h-full">
            <div className="h-full overflow-y-auto mt-5 pr-5">
                <Table wrapperHeight="max-h-full">
                    <TableHeader className="sticky top-0 bg-background shadow">
                        <TableRow>
                            <TableHead className="p-2 text-left">{t("Date")}</TableHead>
                            <TableHead className="p-2 text-left">{t("Event")}</TableHead>
                            <TableHead className="p-2 text-left">{t("User")}</TableHead>
                            <TableHead className="p-2 text-left">{diffLabel}</TableHead>
                            <TableHead className="p-2 text-left"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="p-10 text-center">
                                    <LoaderCircle className="mx-auto size-8 animate-spin" />
                                </TableCell>
                            </TableRow>
                        ) : history.length > 0 ? (
                            history.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="p-2 self-start pt-2.5">
                                        {new Date(item.createdAt).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="p-2 self-start pt-2.5 capitalize">
                                        {item.action}
                                    </TableCell>
                                    <TableCell className="p-2 self-start pt-2.5 max-w-[250px] whitespace-break-spaces">
                                        <div className="max-w-[500px] whitespace-break-spaces font-medium text-chart-3">
                                            {item.user.login}
                                        </div>
                                    </TableCell>
                                    <TableCell className="p-2 align-middle">
                                        <Button variant="green" size="sm" onClick={() => {
                                            setDiffItem(item.diff);
                                            setDiffOpen(true);
                                        }}>
                                            <Braces />
                                        </Button>
                                    </TableCell>
                                    <TableCell className="p-2 align-middle text-center">
                                        {isCurrent(item) ? (
                                            <span className="font-medium">{t("Current")}</span>
                                        ) : (
                                            <Button variant="outline" size="sm" onClick={() => watchHistory(item.id)}>{t("Watch")}</Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="p-4 text-center font-medium text-muted-foreground">
                                    {t("There is no history")}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                <Dialog open={diffOpen} onOpenChange={(open) => {
                    setDiffOpen(open);
                    if (!open) {
                        setTimeout(() => {
                            document.body.removeAttribute('style');
                        }, 300);
                    }
                }}>
                    <DialogContent className="z-[1022] sm:max-w-[60vw]">
                        <DialogHeader>
                            <DialogTitle>{diffLabel}</DialogTitle>
                        </DialogHeader>
                        <DiffViewer
                            changes={diffItem}
                            className="max-h-[80vh] overflow-auto sm:max-w-[60vw] w-full"
                        />
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

export default HistoryList;
