import {Link} from "@inertiajs/react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {useAdminContext} from "@/shell";

interface ContextDemoPageProps {
    data: { title: string; text: string; links?: { title: string; href: string }[] };
}

export default function ContextDemoPage({data}: ContextDemoPageProps) {
    const {context} = useAdminContext();
    return (
        <Card>
            <CardHeader>
                <CardTitle>{data.title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p>{data.text}</p>
                {data.links?.map((link) => (
                    <p key={link.href} style={{marginTop: 8}}>
                        <Link href={link.href} style={{textDecoration: "underline"}}>{link.title}</Link>
                    </p>
                ))}
                <p style={{opacity: 0.6, marginTop: 8, fontSize: 13}}>
                    context: <code>{context?.id}</code> · prefix: <code>{context?.prefix}</code> · layout root: <code>{context?.layout.root}</code>
                    {context?.layout.layers.length ? <> · layers: <code>{context.layout.layers.length}</code></> : null}
                </p>
            </CardContent>
        </Card>
    );
}
