import {withAppLayout} from "@/layouts/with-app-layout";
import type {BreadcrumbItem} from "@/types";
import ViewAll from "@/components/notifications/ViewAll.tsx";

const breadcrumbs: BreadcrumbItem[] = [];
const Notification = () => {
    return (
        <ViewAll />
    )
}
export default withAppLayout(Notification, {breadcrumbs})
