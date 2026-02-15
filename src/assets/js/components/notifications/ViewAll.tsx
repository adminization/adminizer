import { SharedData } from "@/types";
import { router, usePage } from "@inertiajs/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { LoaderCircle } from "lucide-react";
import General from "@/components/notifications/General.tsx";
import { useNotifications } from '@/contexts/NotificationContext';
import { INotification } from '../../../../interfaces/types';
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { debounce } from "lodash-es";

interface NotificationProps extends SharedData {
    title: string
    tooltip: string
    notWidgets: string
    notFound: string
    actionsTitles: Record<string, string>
    searchPlaceholder: string
}

const ViewAll = () => {
    const page = usePage<NotificationProps & { url: string }>();
    const {
        allNotifications,
        markAsRead,
        markAllAsRead,
        tabs,
        initTab,
        search,
        fetchAllNotifications,
        paginateNotifications,
        refreshBellNotifications,
        messages
    } = useNotifications();
    const [localLoading, setLocalLoading] = useState(true);
    const [filteredNotifications, setFilteredNotifications] = useState<INotification[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [readLoading, setReadLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    // Use ref to store the current skip
    const currentSkipRef = useRef(20);

    const [activeTab, setActiveTab] = useState<string>('');


    useEffect(() => {
        if (!tabs || tabs.length === 0) return;

        const url = new URL(page.url, window.location.origin);
        const typeParam = url.searchParams.get('type');

        // Set active tab only when tabs are available
        if (typeParam && tabs.some(tab => tab.notificationClass === typeParam)) {
            setActiveTab(typeParam);
        } else {
            setActiveTab(initTab ?? tabs[0]?.notificationClass);
        }
    }, [tabs, page.url]);

    // Loading data when changing the active tab
    useEffect(() => {
        const loadData = async () => {
            setLocalLoading(true);
            currentSkipRef.current = 20; // Resetting ref
            setHasMore(true);
            await fetchAllNotifications(activeTab);
            setTimeout(() => {
                setLocalLoading(false);
            }, 0)
        };
        loadData();
    }, [activeTab]);

    // Filtering notifications
    useEffect(() => {
        const filtered = allNotifications.filter(notif =>
            notif.notificationClass === activeTab
        );
        setFilteredNotifications(filtered);
    }, [allNotifications, activeTab]);

    const handleTabChange = async (tab: string) => {
        router.get(page.url, { type: tab }, {
            preserveState: true,
            preserveScroll: true,
            replace: true
        });

    };

    const handleMarkAsRead = async (notificationClass: string, id: string) => {
        try {
            await markAsRead(notificationClass, id);
            await refreshBellNotifications();
        } catch (error) {
            console.error('Error marking as read:', error);
            throw error;
        }
    };

    const markAllRead = async () => {
        try {
            setReadLoading(true);
            await markAllAsRead();
            await refreshBellNotifications();
            setReadLoading(false)
        } catch (error) {
            console.log(error);
        }
    }

    const handleLoadMore = useCallback(async () => {
        if (!hasMore || localLoading) return;
        setLoadingMore(true);
        const newNotifications = await paginateNotifications(activeTab, currentSkipRef.current);

        if (newNotifications.length < 20) {
            setHasMore(false);
        }

        // Update both values
        currentSkipRef.current = currentSkipRef.current + 20;
        setLoadingMore(false)
    }, [hasMore, localLoading, activeTab, paginateNotifications]);

    const renderContent = () => {
        if (localLoading) {
            return <LoaderCircle className="mx-auto mt-14 size-8 animate-spin" />;
        }
        if (!localLoading && filteredNotifications.length > 0) {
            return <General notifications={filteredNotifications}
                onMarkAsRead={handleMarkAsRead}
                onLoadMore={handleLoadMore}
                messages={messages}
                loadingMore={loadingMore}
                hasMore={hasMore}
            />
        } else {
            return <div className="text-center font-medium mt-8">No notifications found</div>;
        }
    };

    const performSearch = async (s: string) => {
        currentSkipRef.current = 20
        setHasMore(true)
        setLocalLoading(true);
        await search(s, activeTab)
        setTimeout(() => {
            setLocalLoading(false)
        }, 0)
    }

    const handleSearch = debounce(performSearch, 500)

    return (
        <div className="flex h-auto flex-1 flex-col gap-4 rounded-xl p-4">
            <div className="flex flex-col gap-4">
                <h1 className="font-bold text-xl">{page.props.title}</h1>
                <div className="flex justify-between items-center">
                    <Input
                        type="search"
                        placeholder={messages["Search"]}
                        onChange={(e) => {
                            handleSearch(e.target.value)
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                performSearch(e.currentTarget.value);
                            }
                        }}
                        className="w-[200px] p-2 border rounded"
                    />
                    <div className="flex items-center gap-2">
                        {readLoading && <LoaderCircle className="size-6 animate-spin" />}
                        <Button variant="green" size="sm" onClick={markAllRead}>{messages["Make all read"]}</Button>
                    </div>
                </div>
            </div>

            <Tabs value={activeTab} className="w-full" onValueChange={handleTabChange}>
                <TabsList className="w-full mb-4">
                    {tabs?.map(tab => (
                        <TabsTrigger
                            key={tab.notificationClass}
                            value={tab.notificationClass}
                            disabled={localLoading}
                            className="capitalize"
                        >
                            {tab.displayName}
                        </TabsTrigger>
                    ))}
                </TabsList>
                {tabs?.map(tab => (
                    <TabsContent key={tab.notificationClass} value={tab.notificationClass}>{
                        renderContent()
                    }</TabsContent>
                ))}
            </Tabs>
        </div>
    );
}

export default ViewAll;