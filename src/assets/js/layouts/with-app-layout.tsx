import {type ComponentType, type ReactNode} from 'react';
import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';

type PersistentPage<Props extends object> = ComponentType<Props> & {
    layout?: (page: ReactNode) => ReactNode;
};

interface AppLayoutOptions {
    breadcrumbs?: BreadcrumbItem[];
    className?: string;
}

/**
 * Keeps the admin shell mounted while Inertia replaces the page content.
 */
export const withAppLayout = <Props extends object>(
    Page: ComponentType<Props>,
    options: AppLayoutOptions = {},
): PersistentPage<Props> => {
    const persistentPage = Page as PersistentPage<Props>;
    persistentPage.layout = (page) => <AppLayout {...options}>{page}</AppLayout>;
    return persistentPage;
};
