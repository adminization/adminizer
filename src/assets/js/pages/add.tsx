import {type BreadcrumbItem, Field} from "@/types";
import {withAppLayout} from "@/layouts/with-app-layout";
import AddForm from "@/components/add-form.tsx";
import {usePage} from "@inertiajs/react";
import {useEffect} from "react";
import {Toaster} from "@/components/ui/sonner.tsx";
import {toast} from "sonner";

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

function Add() {
    const page = usePage<AddProps>();

    useEffect(() => {
        const flash = page.props.flash as Record<string, string> | undefined;
        if (!flash) return;

        if (flash.success) {
            toast.success(flash.success);
        }
        if (flash.error) {
            toast.error(flash.error);
        }
    }, [page.props.flash]);

    return (
        <>
            <Toaster position="top-center" richColors closeButton/>
            <AddForm page={page} catalog={false}/>
        </>
    )
}

export default withAppLayout(Add, {breadcrumbs, className: 'overflow-auto h-[calc(100svh-16px)]'});
