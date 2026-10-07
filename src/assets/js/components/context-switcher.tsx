import {Link, usePage} from '@inertiajs/react';
import {Check, ChevronsUpDown} from 'lucide-react';
import MaterialIcon from '@/components/material-icon';
import {Button} from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {type SharedData} from '@/types';
import {useIsMobile} from '@/hooks/use-mobile';
import {cn} from '@/lib/utils';

type SectionLink = {
    id: string;
    title: string;
    link: string;
    icon?: string;
    type?: 'blank' | 'self';
    subItems?: SectionLink[];
};

const DEFAULT_CONTEXT_ICON = 'rocket_launch';

/**
 * Switches between layout contexts (`adminContexts` shared prop). Entering a
 * context is a plain visit to its URL: the server answers with that context's
 * menu and layout. Custom header sections (`config.sections`) follow the
 * contexts as ordinary links. Works with or without a SidebarProvider.
 */
export function ContextSwitcher({className, side = 'bottom'}: { className?: string; side?: 'bottom' | 'right' }) {
    const page = usePage<SharedData>();
    const {adminContext: context, adminContexts: contexts = [], brand} = page.props;
    // A menu opened to the right of the mobile sidebar sheet is off-screen.
    const isMobile = useIsMobile();
    // The first `section` entry is the legacy link to the panel root, which
    // the default context already stands for.
    const sections = ((page.props.section as SectionLink[] | null) ?? []).slice(1)
        .flatMap((section) => section.subItems?.length ? section.subItems : [section]);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className={cn('w-full justify-start px-2! cursor-pointer', className)}>
                    <MaterialIcon name={context?.icon ?? DEFAULT_CONTEXT_ICON} className="!text-[18px]"/>
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap group-data-[state=collapsed]:hidden">
                        {context?.title ?? brand}
                    </span>
                    <ChevronsUpDown className="ml-auto group-data-[state=collapsed]:hidden"/>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side={isMobile ? 'bottom' : side} align="start" className="min-w-56 z-[1003]">
                <DropdownMenuLabel className="text-xs text-muted-foreground">{brand}</DropdownMenuLabel>
                {contexts.map((item) => (
                    <DropdownMenuItem key={item.id} asChild>
                        <Link href={item.link} className="flex gap-2 items-center cursor-pointer">
                            <MaterialIcon name={item.icon ?? DEFAULT_CONTEXT_ICON} className="!text-[18px]"/>
                            <span>{item.title}</span>
                            {item.id === context?.id && <Check className="ml-auto size-4"/>}
                        </Link>
                    </DropdownMenuItem>
                ))}
                {sections.length > 0 && <DropdownMenuSeparator/>}
                {sections.map((item) => (
                    <DropdownMenuItem key={item.id} asChild>
                        {item.type === 'blank' ? (
                            <a href={item.link} target="_blank" rel="noreferrer" className="flex gap-2 items-center">
                                {item.icon && <MaterialIcon name={item.icon} className="!text-[18px]"/>}
                                <span>{item.title}</span>
                            </a>
                        ) : (
                            <Link href={item.link} className="flex gap-2 items-center">
                                {item.icon && <MaterialIcon name={item.icon} className="!text-[18px]"/>}
                                <span>{item.title}</span>
                            </Link>
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
