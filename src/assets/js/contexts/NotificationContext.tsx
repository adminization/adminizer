import React, { createContext, useContext, useState, useEffect } from 'react';
import { INotification } from '../../../interfaces/types';
import {usePage} from "@inertiajs/react";
import {SharedData} from "@/types";
import {adminApi} from '@/lib/admin-api';

interface NotifTabs {
    displayName: string,
    notificationClass: string
}

interface NotificationContextType {
    bellNotifications: INotification[];
    allNotifications: INotification[];
    unreadCount: number;
    markAsRead: (notificationClass: string, id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    fetchAllNotifications: (type: string) => Promise<INotification[]>;
    paginateNotifications: (type: string, skip: number) => Promise<INotification[]>;
    search: (s: string, type: string) => Promise<void>;
    getTabs: () => Promise<void>;
    getLocale: () => Promise<void>;
    messages: Record<string, string>;
    tabs: NotifTabs[] | null;
    initTab: string
    loading: boolean;
    refreshBellNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [bellNotifications, setBellNotifications] = useState<INotification[]>([]);
    const [sseNotifications, setSseNotifications] = useState<INotification[]>([]);
    const [loadedNotifications, setLoadedNotifications] = useState<INotification[]>([]);
    const [loading, setLoading] = useState(false);
    const [tabs, setTabs] = useState<NotifTabs[] | null>(null);
    const [initTab, setInitTab] = useState<string>('');
    const page = usePage<SharedData>()
    const [messages, setMessages] = useState<Record<string, string>>({});

    const allNotifications = [...sseNotifications, ...loadedNotifications];

    const fetchBellNotifications = async () => {
        try {
            const res = await adminApi.getJson<INotification[]>(`${window.routePrefix}/notifications/api`, {
                params: { unreadOnly: true, limit: 4 }
            });
            setBellNotifications(res.data);
        } catch (error) {
            console.error('Error fetching bell notifications:', error);
        }
    };

    const getLocale = async () => {
        try {
            const res = await adminApi.postJson<Record<string, string>>(`${window.routePrefix}/notifications`);
            setMessages(res.data);
        } catch (error) {
            console.log(error)
        }
    }

    const refreshBellNotifications = async () => {
        await fetchBellNotifications();
    };

    const getTabs = async () => {
        try {
            const res = await adminApi.getJson<{activeServices: NotifTabs[]; initTab: string}>(`${window.routePrefix}/notifications/api/get-classes`);
            if (res.data){
                setTabs(res.data.activeServices)
                setInitTab(res.data.initTab)
            }
        } catch (error) {
            console.error('Error fetching tabs:', error);
        }
    }

    const search = async (s: string, type: string) => {
        try {
            if (!s) {
                await fetchAllNotifications(type);
                return;
            }

            const res = await adminApi.postJson<INotification[]>(`${window.routePrefix}/notifications/api/search`, {
                s: s,
                notificationClass: type
            });
            setLoadedNotifications(res.data);
        } catch (error) {
            console.error('Error searching notifications:', error);
        }
    }

    const fetchAllNotifications = async (type: string) => {
        setLoading(true);
        try {
            const url = `${window.routePrefix}/notifications/api/${type}`
            const res = await adminApi.getJson<INotification[]>(url, {params: {limit: 20, skip: 0, unreadOnly: false}});

            // Clearing SSE notifications when loading a new tab
            setSseNotifications([]);
            setLoadedNotifications(res.data);
            return res.data;
        } catch (error) {
            console.error('Error fetching all notifications:', error);
            return [];
        } finally {
            setLoading(false);
        }
    };

    const paginateNotifications = async (type: string, skip: number) => {
        try {
            const url = `${window.routePrefix}/notifications/api/${type}`
            const res = await adminApi.getJson<INotification[]>(url, {params: {limit: 20, skip, unreadOnly: false}});

            setLoadedNotifications(prev => [...prev, ...res.data]);
            return res.data;
        } catch (error) {
            console.error('Error paginating notifications:', error);
            return [];
        }
    }

    useEffect(() => {
        if(!page.props.notifications) return

        getLocale()

        fetchBellNotifications();

        const eventSource = new EventSource(`${window.routePrefix}/notifications/api/stream`);

        eventSource.addEventListener('connected', (event) => {
            const data = JSON.parse((event as MessageEvent).data);
            console.log('Connected event:', data);
            getTabs()
        });

        eventSource.addEventListener('notification', (event) => {
            const data = JSON.parse((event as MessageEvent).data);
            setSseNotifications(prev => [data, ...prev]);
            setBellNotifications(prev => [data, ...prev].slice(0, 4));
        });

        eventSource.onerror = () => {
            console.error('SSE connection error');
        };

        return () => eventSource.close();
    }, []);

    const markAsRead = async (notificationClass: string, id: string) => {
        try {
            await adminApi.putJson(`${window.routePrefix}/notifications/api/${notificationClass}/${id}/read`, {});

            // Update all notification lists
            setSseNotifications(prev =>
                prev.map(notif =>
                    notif.id === id ? { ...notif, read: true } : notif
                )
            );

            setLoadedNotifications(prev =>
                prev.map(notif =>
                    notif.id === id ? { ...notif, read: true } : notif
                )
            );

            setBellNotifications([]);

        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await adminApi.putJson(`${window.routePrefix}/notifications/api/read-all`, {});
            setSseNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
            setLoadedNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
            await fetchBellNotifications();
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    }

    const unreadCount = bellNotifications.filter(n => !n.read).length;

    return (
        <NotificationContext.Provider value={{
            bellNotifications,
            allNotifications,
            unreadCount,
            getTabs,
            tabs,
            initTab,
            search,
            markAsRead,
            markAllAsRead,
            getLocale,
            messages,
            fetchAllNotifications,
            paginateNotifications,
            loading,
            refreshBellNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
