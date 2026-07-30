import {withAppLayout} from '@/layouts/with-app-layout';
import {type BreadcrumbItem} from '@/types';
import CatalogTree from "@/components/catalog/CatalogTree.tsx";

const breadcrumbs: BreadcrumbItem[] = [];

function Catalog() {
    return (
        <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            <CatalogTree/>
        </div>
    );
}

export default withAppLayout(Catalog, {breadcrumbs});
