import {withAppLayout} from "@/layouts/with-app-layout"
import ListTable from "@/components/list-table";
import type {BreadcrumbItem} from "@/types";

const breadcrumbs: BreadcrumbItem[] = [];

const list = () => {
    return(
        <ListTable />
    )
}
export default withAppLayout(list, {breadcrumbs, className: 'overflow-auto h-[calc(100svh-16px)]'})
