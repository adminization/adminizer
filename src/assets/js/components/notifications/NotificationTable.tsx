import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Eye} from "lucide-react";
import {useEffect, useRef, useState} from "react";
import {INotification} from "../../../../interfaces/types.ts";
import {NotificationProps} from "@/types";
import {debounce} from 'lodash';

interface NotificationTableProps extends NotificationProps {
    loadingMore: boolean
    messages: Record<string, string>
}

export const NotificationTable = (
    {
        notifications,
        onMarkAsRead,
        onLoadMore,
        loadingMore,
        messages,
        hasMore = false,
    }: NotificationTableProps) => {
    const tableContent = useRef<HTMLTableElement>(null);
    const loadingRef = useRef(false);
    const [uniqueNotifications, setUniqueNotifications] = useState<INotification[]>([]);


    const debouncedLoadMore = useRef(
        debounce(() => {
            if (onLoadMore && hasMore && !loadingRef.current) {
                loadingRef.current = true;
                onLoadMore()
                loadingRef.current = false;
            }
        }, 300)
    ).current;

    // Removing duplicates by ID
    useEffect(() => {
        const uniqueIds = new Set();
        const filtered = notifications.filter(notif => {
            if (uniqueIds.has(notif.id)) return false;
            uniqueIds.add(notif.id);
            return true;
        });
        setUniqueNotifications(filtered);
    }, [notifications]);

    // Infinite scroll only if there is onLoadMore
    useEffect(() => {
        if (!onLoadMore) return;

        const handleScroll = () => {
            if (loadingRef.current || !hasMore) return;

            const scrollContainer = tableContent.current;
            if (!scrollContainer) return;

            const {scrollTop, scrollHeight, clientHeight} = scrollContainer;
            const scrollPosition = scrollTop + clientHeight;

            // Checking if we have reached the bottom
            if (scrollPosition >= scrollHeight - 600) {
                debouncedLoadMore();
            }
        };

        const scrollContainer = tableContent.current;
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handleScroll);

            // Cleaning
            return () => {
                scrollContainer.removeEventListener('scroll', handleScroll);
                debouncedLoadMore.cancel(); // Cancel pending debounced calls
            };
        }
    }, [hasMore, onLoadMore, debouncedLoadMore]);

    useEffect(() => {
        return () => {
            debouncedLoadMore.cancel();
        };
    }, [debouncedLoadMore]);

    const handleMarkAsRead = async (notificationClass: string, id: string) => {
        try {
            await onMarkAsRead(notificationClass, id);
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    return (
        <div>
            <Table wrapperHeight="max-h-[70vh]" ref={tableContent} className={`${loadingMore ? 'opacity-40' : ''}`}>
                <TableHeader className="sticky top-0 bg-background shadow z-1">
                    <TableRow
                        className={`grid grid-cols-[50px_1fr_2fr_200px]`}>
                        <TableHead className="p-2 text-left"></TableHead>
                        <TableHead className="p-2 text-left">{messages["Title"]}</TableHead>
                        <TableHead className="p-2 text-left">{messages["Message"]}</TableHead>
                        <TableHead className="p-2 text-left">{messages["Date"]}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {uniqueNotifications.map((notification) => (
                        <TableRow key={notification.id}
                                  className={`${!notification.read ? 'bg-chart-1/20 hover:bg-chart-1/20' : ''} grid grid-cols-[50px_1fr_2fr_200px]`}>
                            <TableCell className={`p-2 self-start pt-2.5`}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon"
                                                className={`size-4 ${notification.read ? 'opacity-50 pointer-events-none' : ''}`}
                                                onClick={() => handleMarkAsRead(notification.notificationClass, notification.id)}>
                                            <Eye className="text-primary"/>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="z-[1003]">
                                        <p>{messages["Make read"]}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TableCell>
                            <TableCell className={`p-2 self-start font-medium`}>
                                {notification.title}
                            </TableCell>
                            <TableCell
                                className={`p-2 self-start whitespace-break-spaces`}>
                                <div className="max-w-[500px] whitespace-break-spaces">
                                    {notification.message}
                                </div>
                            </TableCell>
                            <TableCell className={`p-2 self-start`}>
                                {new Date(notification.createdAt).toLocaleString()}
                            </TableCell>
                        </TableRow>
                    ))}
                    <TableRow>
                        {!hasMore && (
                            <TableCell colSpan={4}>
                                <div className="text-center py-2 font-medium">{messages["The end of the list has been reached"]}</div>
                            </TableCell>
                        )}
                    </TableRow>
                </TableBody>
            </Table>
        </div>
    );
};