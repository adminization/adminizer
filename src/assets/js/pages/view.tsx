import {type BreadcrumbItem} from "@/types";
import AppLayout from "@/layouts/app-layout.tsx";
import AddForm from "@/components/add-form.tsx";
import {usePage} from "@inertiajs/react";
import type {AddProps} from "./add";

const breadcrumbs: BreadcrumbItem[] = [];

export default function View() {
    const page = usePage<AddProps>();
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <AddForm page={page} catalog={false}/>
        </AppLayout>
    );
}
