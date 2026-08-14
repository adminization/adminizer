import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";

interface RecordScopeTestProps {
    data: {
        available: boolean;
        availableTests: Array<{
            id: string;
            title: string;
        }>;
    };
}

export default function RecordScopeTest({data}: RecordScopeTestProps) {
    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>Проверка доступа к записям Test</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-xl font-bold">{data.available ? "Доступно" : "Недоступно"}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Доступные записи Test</CardTitle>
                </CardHeader>
                <CardContent>
                    {data.availableTests.length ? (
                        <ul className="list-disc space-y-1 pl-5">
                            {data.availableTests.map((test) => <li key={test.id}>{test.title}</li>)}
                        </ul>
                    ) : <p className="text-muted-foreground">Нет доступных записей</p>}
                </CardContent>
            </Card>
        </div>
    );
}
