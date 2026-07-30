import { SidebarProvider } from '@/components/ui/sidebar';
import {memo, useState} from 'react';

interface AppShellProps {
    children: React.ReactNode;
    variant?: 'header' | 'sidebar';
}

const AppShell = memo(({ children, variant = 'header' }: AppShellProps)=> {
    const [isOpen, setIsOpen] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('sidebar') !== 'false' : true));

    const handleSidebarChange = (open: boolean) => {
        setIsOpen(open);

        if (typeof window !== 'undefined') {
            localStorage.setItem('sidebar', String(open));
        }
    };

    if (variant === 'header') {
        return <div className="flex min-h-screen w-full flex-col">{children}</div>;
    }
    return (
        <SidebarProvider
            className="h-svh overflow-hidden"
            defaultOpen={isOpen}
            open={isOpen}
            onOpenChange={handleSidebarChange}
        >
            {children}
        </SidebarProvider>
    );
})
export default AppShell
