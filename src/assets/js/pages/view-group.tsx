import {type BreadcrumbItem} from "@/types";
import AppLayout from "@/layouts/app-layout.tsx";
import AddGroupForm from "@/components/add-group-form.tsx";

const breadcrumbs: BreadcrumbItem[] = [];

export default function ViewGroup() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <AddGroupForm />
        </AppLayout>
    );
}
