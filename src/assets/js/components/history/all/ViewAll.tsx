import { Button } from "@/components/ui/button";
import { SharedData } from "@/types";
import { usePage } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Braces, CalendarIcon, LoaderCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { HistoryItem } from "@/components/history/HistoryList";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { format } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DiffViewer } from "@/components/history/DiffViewer";
import { enUS, de, ru, es, fr } from 'date-fns/locale';

interface HistoryProps extends SharedData {
    title: string,
    models: {
        name: string,
        title: string
    }[],
    users: {
        name: string
    }[],
    messages: Record<string, string>
}

const getLocaleFromHTML = () => {
  const lang = document.documentElement.lang;
  if (lang?.startsWith('ru')) return ru;
  if (lang?.startsWith('en')) return enUS;
  if (lang?.startsWith('de')) return de;
  if (lang?.startsWith('es')) return es;
  if (lang?.startsWith('fr')) return fr;
  // Add others if necessary
  return enUS;
};


const ViewAll = () => {
    const page = usePage<HistoryProps>();
    const [history, setHistory] = useState<HistoryItem[]>([])
    const [diffItem, setDiffItem] = useState<any>(null);
    const [diffOpen, setDiffOpen] = useState(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [activeModel, setActiveModel] = useState<string>('all')
    const [offset, setOffset] = useState<number>(0);
    const [limit] = useState<number>(15);
    const [hasMore, setHasMore] = useState<boolean>(true);
    const [loadingMore, setLoadingMore] = useState<boolean>(false);
    const tableContainerRef = useRef<HTMLTableElement>(null);
    const [selectedUser, setSelectedUser] = useState<string>('all');
    const [date, setDate] = useState<DateRange | undefined>(undefined)
    const messages = page.props.messages
    
    const fetchHistory = async (offset: number, model: string = 'all', user: string = 'all', reset = false, dateRange: DateRange | undefined) => {
        setLoadingMore(true);
        try {
            const res = await axios.post(`${window.routePrefix}/history/view-all`, {
                model,
                offset,
                limit,
                user,
                from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : null,
                to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : null,
            });

            const data = res.data.data;
        
            
            if (reset) {
                setHistory(data);
            } else {
                setHistory(prev => [...prev, ...data]);
            }

            setHasMore(!(data.length < limit));
            setOffset(offset);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        setHistory([]);
        setOffset(0);
        setHasMore(true);
        fetchHistory(0, activeModel, selectedUser, true, date);
        setLoading(false);
    }, [activeModel, selectedUser]);

    useEffect(() => {
        const container = tableContainerRef.current;
        if (!container) return;

        const handleScroll = async () => {

            if (loadingMore || !hasMore) return;
            if (container.scrollHeight - container.scrollTop <= container.clientHeight + 5) {
                await fetchHistory(offset + limit, activeModel, selectedUser, false, date);
            }
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [loadingMore, hasMore, offset, limit, activeModel, selectedUser, date]);

    const handleChange = (model: string, user: string) => {
        setActiveModel(model);
        setSelectedUser(user);
        setLoading(true);
        setHistory([]);
        setOffset(0);
        setHasMore(true);
        setLoading(false);
    };

    const handleSearch = () => {
        setLoading(true);
        setHistory([]);
        setOffset(0);
        setHasMore(true);
        setLoading(false);
        fetchHistory(0, activeModel, selectedUser, true, date);
    };

    const handleReset = () => {
        setDate(undefined);
        setLoading(true);
        setHistory([]);
        setOffset(0);
        setHasMore(true);
        setLoading(false);
        fetchHistory(0, activeModel, selectedUser, true, undefined);
    };

    return (
        <div className="flex h-auto flex-1 flex-col gap-4 rounded-xl p-4">
            <div className="flex flex-col gap-4">
                <h1 className="font-bold text-xl">{page.props.title}</h1>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="models">{messages["Models"]}</Label>
                    <div className="flex flex-wrap gap-4">
                        <div>
                            <Button
                                variant={activeModel === 'all' ? 'default' : 'outline'}
                                className="border-1"
                                onClick={() => {
                                    handleChange('all', selectedUser)
                                }}
                            >
                                {messages["All"]}
                            </Button>
                        </div>
                        {page.props.models.map(model => (
                            <div key={model.name}>
                                <Button
                                    variant={activeModel === model.name ? 'default' : 'outline'}
                                    className="border-1 capitalize"
                                    onClick={() => {
                                        handleChange(model.name, selectedUser)
                                    }}
                                >
                                    {model.title}
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex gap-4">
                    {page.props.users.length > 0 && <div className="flex flex-col grow-1 gap-2 max-w-[250px]">
                        <Label htmlFor="users">{messages["Users"]}</Label>
                        <Select
                            onValueChange={(value: string) => {
                                handleChange(
                                    activeModel,
                                    value
                                )
                            }}
                            value={selectedUser}
                        >
                            <SelectTrigger className="w-full cursor-pointer min-h-10 scroll-pt-30 scroll-mt-30" id="users">
                                <SelectValue placeholder={messages["Users"]} />
                            </SelectTrigger>
                            <SelectContent className="z-[9999999]">
                                <SelectItem value="all" key="all">
                                    {messages["All"]}
                                </SelectItem>
                                {page.props.users.map(user => (
                                    <SelectItem value={String(user.name)} key={String(user.name)}>
                                        {user.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="date-picker-range">{messages["Date"]}</Label>
                        <div className="flex items-center gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        id="date-picker-range"
                                        className="justify-start px-2.5 font-normal h-[40px]"
                                    >
                                        <CalendarIcon />
                                        {date?.from ? (
                                            date.to ? (
                                                <>
                                                    {format(date.from, "LLL dd, y")} -{" "}
                                                    {format(date.to, "LLL dd, y")}
                                                </>
                                            ) : (
                                                format(date.from, "LLL dd, y")
                                            )
                                        ) : (
                                            <span>{messages["Pick a date"]}</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="range"
                                        locale={getLocaleFromHTML()}
                                        defaultMonth={date?.from}
                                        selected={date}
                                        onSelect={setDate}
                                        numberOfMonths={2}
                                    />
                                </PopoverContent>
                            </Popover>
                            <Button
                                variant="default"
                                size="default"
                                onClick={handleSearch}
                                className="h-[40px]"
                                disabled={date === undefined}
                            >
                                {messages["Search"]}
                            </Button>
                            <Button
                                variant="outline"
                                size="default"
                                onClick={handleReset}
                                className="h-[40px]"
                                disabled={date === undefined}
                            >
                                {messages["Reset"]}
                            </Button>
                        </div>
                    </div>
                </div>
                <Table wrapperHeight="max-h-[55vh]" ref={tableContainerRef}>
                    <TableHeader className="sticky top-0 bg-background shadow">
                        <TableRow>
                            <TableHead className="p-2 text-left">{messages["Date"]}</TableHead>
                            <TableHead className="p-2 text-left">{messages["Model"]}</TableHead>
                            <TableHead className="p-2 text-left">{messages["Name"]}</TableHead>
                            <TableHead className="p-2 text-left">{messages["Event"]}</TableHead>
                            <TableHead className="p-2 text-left">{messages["User"]}</TableHead>
                            <TableHead className="p-2 text-left">{messages["Diff"]}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {history.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="p-2 self-start pt-2.5">
                                    {new Date(item.createdAt).toLocaleString()}
                                </TableCell>
                                <TableCell className="p-2 self-start pt-2.5 capitalize">
                                    {item.modelName}
                                </TableCell>
                                <TableCell className="p-2 self-start pt-2.5">
                                    {item.displayName}
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
                            </TableRow>
                        ))}
                        {loadingMore && (
                            <TableRow>
                                <TableCell colSpan={6} className="p-4 text-center">
                                    <LoaderCircle className="mx-auto size-5 animate-spin" />
                                </TableCell>
                            </TableRow>
                        )}

                        {!loadingMore && !hasMore && history.length > 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="p-4 text-left sm:text-center font-medium text-muted-foreground">
                                    {messages["The end of the list has been reached"]}
                                </TableCell>
                            </TableRow>
                        )}

                        {!loadingMore && !loading && history.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="p-4 text-left sm:text-center font-medium text-muted-foreground">
                                    {messages["There are no records to display"]}
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
                            <DialogTitle>Diff</DialogTitle>
                        </DialogHeader>
                        <DiffViewer changes={diffItem} className="max-h-[80vh] overflow-auto sm:max-w-[60vw] w-full" />
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    )
}
export default ViewAll;