import {type BreadcrumbItem, Field} from "@/types";
import AppLayout from "@/layouts/app-layout.tsx";
import AddForm from "@/components/add-form.tsx";
import {usePage} from "@inertiajs/react";

export interface AddProps {
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
    history: boolean;
    btnSave: {
        title: string;
    },
    btnHistory: {
        title: string,
    },
    postLink: string,
    [key: string]: unknown;
    model: string
}
const breadcrumbs: BreadcrumbItem[] = [];

export default function Add() {
    const page = usePage<AddProps>();
    return (
        <AppLayout breadcrumbs={breadcrumbs} className="overflow-auto h-[calc(100svh-16px)]">
            <AddForm page={page} catalog={false}/>
        </AppLayout>
    )
}
