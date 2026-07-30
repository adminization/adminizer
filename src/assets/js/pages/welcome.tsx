import {withAppLayout} from '@/layouts/with-app-layout';
import {type BreadcrumbItem, SharedData} from '@/types';
import {usePage} from "@inertiajs/react";

const breadcrumbs: BreadcrumbItem[] = [];

interface WelcomeProps extends SharedData {
    text?: string,
    title?: string
}

function Dashboard() {
    const page = usePage<WelcomeProps>()
    return (
        <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            {page.props.title && <div className="text-3xl mb-8">{page.props.title}</div>}
            <div className="text-3xl mb-8">Adminizer</div>
            {page.props.text &&
                <div dangerouslySetInnerHTML={{__html: page.props.text}}/>
            }
        </div>
    );
}

export default withAppLayout(Dashboard, {breadcrumbs});
