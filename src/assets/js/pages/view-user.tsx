import {type BreadcrumbItem} from "@/types";
import AppLayout from "@/layouts/app-layout.tsx";
import AddUserForm from "@/components/add-user-form.tsx";

const breadcrumbs: BreadcrumbItem[] = [];

export default function ViewUser() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <AddUserForm />
        </AppLayout>
    )
}
