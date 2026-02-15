import {useState} from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Bell, Eye, LoaderCircle} from "lucide-react";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import MaterialIcon from "@/components/material-icon.tsx";
import {Link} from "@inertiajs/react";
import {useNotifications} from '@/contexts/NotificationContext';
import {router} from '@inertiajs/react'

export function NotificationCenter() {

    const {bellNotifications, markAsRead, unreadCount, refreshBellNotifications, messages} = useNotifications();
    const [Rloading, setRLoading] = useState(false);

    const handleMarkAsRead = async (notificationClass: string, id: string) => {
        setRLoading(true);
        try {
            await markAsRead(notificationClass, id);
            // After successful marking, update the bell
            await refreshBellNotifications();
        } catch (error) {
            console.error('Error marking as read:', error);
        } finally {
            setRLoading(false);
        }
    };

    const getRelativeTime = (date: string | Date): string => {
        const now = new Date();
        const dateObj = new Date(date);

        const diffInMs = now.getTime() - dateObj.getTime();
        const diffInSeconds = Math.floor(diffInMs / 1000);

        const rtf = new Intl.RelativeTimeFormat('en', {numeric: 'auto'});

        if (diffInSeconds < 60) {
            return rtf.format(-diffInSeconds, 'second');
        }

        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return rtf.format(-diffInMinutes, 'minute');
        }

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return rtf.format(-diffInHours, 'hour');
        }

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 30) {
            return rtf.format(-diffInDays, 'day');
        }

        const diffInMonths = Math.floor(diffInDays / 30);
        if (diffInMonths < 12) {
            return rtf.format(-diffInMonths, 'month');
        }

        const diffInYears = Math.floor(diffInMonths / 12);
        return rtf.format(-diffInYears, 'year');
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild className="cursor-pointer data-[state=open]:bg-sidebar-accent">
                <Button variant="ghost" className="relative">
                    <Bell/>
                    {unreadCount > 0 &&
                        <div className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-destructive"></div>}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className={`z-[1002] p-2`} align="end" onCloseAutoFocus={e => e.preventDefault()}>
                <DropdownMenuGroup className={`${Rloading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {bellNotifications.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                            No notifications
                        </div>
                    ) : (
                        bellNotifications.map(notification => (
                            <div key={notification.id}>
                                <DropdownMenuItem asChild className="cursor-pointer"
                                                  onSelect={e => {
                                                      e.preventDefault()
                                                      router.visit(`${window.routePrefix}/notifications?type=${notification.notificationClass}`)
                                                  }}>
                                    <div
                                        className="grid grid-cols-[32px_250px] grid-rows-[auto_1fr] items-start gap-x-4 gap-y-2">
                                        {notification.icon ? (
                                            <MaterialIcon name={notification.icon.icon}
                                                          style={{color: notification.icon.iconColor}}
                                                          className="!text-[32px]"/>
                                        ) : (
                                            <div></div>
                                        )}
                                        <div className="flex flex-col">
                                            <span className="font-medium">{notification.title}</span>
                                            <span className="truncate">{notification.message}</span>
                                        </div>
                                        <div className="col-start-2 flex justify-between flex-nowrap items-center">
                                            <div className="flex flex-nowrap gap-2 items-center">
                                                <div>{getRelativeTime(notification.createdAt)}</div>
                                            </div>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="size-4"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleMarkAsRead(notification.notificationClass, notification.id)
                                                            }}>
                                                        <Eye className="text-primary"/>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="left" className="z-[1003]">
                                                    <p>{messages["Make read"]}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </div>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator/>
                            </div>
                        ))
                    )}
                </DropdownMenuGroup>
                <Button variant="secondary" asChild>
                    <Link href={`${window.routePrefix}/notifications`}
                          className={`w-full ${Rloading ? 'opacity-50 pointer-events-none' : ''}`}>
                        {messages["View All"]}
                        {Rloading &&
                            <LoaderCircle className="h-4 w-4 animate-spin"/>}
                    </Link>
                </Button>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}