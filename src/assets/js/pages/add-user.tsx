import {type BreadcrumbItem} from "@/types";
import {withAppLayout} from "@/layouts/with-app-layout";
import AddUserForm from "@/components/add-user-form.tsx";

const breadcrumbs: BreadcrumbItem[] = [];

function AddUser() {
    return (
        <AddUserForm />
    )
}

export default withAppLayout(AddUser, {breadcrumbs});
