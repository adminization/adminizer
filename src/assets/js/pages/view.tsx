import {type BreadcrumbItem, Field} from "@/types";
import AppLayout from "@/layouts/app-layout.tsx";
import ViewForm from "@/components/view-form.tsx";
import {usePage} from "@inertiajs/react";

export interface ViewProps {
    actions: {
        link: string;
        id: string;
        title: string;
        icon: string;
    }[];
    notFound?: string
    search?: string,
    btnBack: {
        title: string;
        link: string;
    };
    fields: Field[];
    edit: boolean;
    view: boolean;
    btnSave: {
        title: string;
    },
    postLink: string,
    [key: string]: unknown;
}

const breadcrumbs: BreadcrumbItem[] = [];

export default function View() {
    const page = usePage<ViewProps>();
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <ViewForm page={page} />
        </AppLayout>
    )
}
