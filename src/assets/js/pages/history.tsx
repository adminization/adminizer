import ViewAll from "@/components/history/all/ViewAll";
import {withAppLayout} from "@/layouts/with-app-layout";
import type {BreadcrumbItem} from "@/types";

const breadcrumbs: BreadcrumbItem[] = [];

const HistoryList = () => {
    return(
        <ViewAll/>
    )
}

export default withAppLayout(HistoryList, {breadcrumbs});
