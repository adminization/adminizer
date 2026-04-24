import AppLayout from "@/layouts/app-layout"
import ListTable from "@/components/list-table";
import type {BreadcrumbItem} from "@/types";

const breadcrumbs: BreadcrumbItem[] = [];

const list = () => {
    return(
        <AppLayout breadcrumbs={breadcrumbs} className="overflow-auto h-[calc(100svh-16px)]">
            <ListTable />
        </AppLayout>
    )
}
export default list
