import {withAppLayout} from '@/layouts/with-app-layout';
import {type BreadcrumbItem} from '@/types';
import WidgetLayout from "@/components/widgets/widgets-layout.tsx";

const breadcrumbs: BreadcrumbItem[] = [];

function Dashboard() {
    return (
        <WidgetLayout />
    );
}

export default withAppLayout(Dashboard, {breadcrumbs});
