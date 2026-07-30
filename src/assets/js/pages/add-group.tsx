import {type BreadcrumbItem} from "@/types";
import {withAppLayout} from "@/layouts/with-app-layout";
import AddGroupForm from "@/components/add-group-form.tsx";

const breadcrumbs: BreadcrumbItem[] = [];

function AddGroup() {
    return (
        <AddGroupForm />
    )
}

export default withAppLayout(AddGroup, {breadcrumbs});
