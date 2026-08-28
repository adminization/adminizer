import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";

interface DemoRecord {
    index: number;
    id: string;
    title: string;
}

interface DemoGroup {
    name: string;
    description: string;
    exists: boolean;
    rights: string[];
}

interface DemoUser {
    login: string;
    isAdministrator: boolean;
    groups: string[];
    allowed: string[];
    grantedTotal: number;
}

interface RecordScopeTestProps {
    data: {
        token: string;
        totalRecords: number;
        seeded: boolean;
        records: DemoRecord[];
        groups: DemoGroup[];
        users: DemoUser[];
        current: {
            login: string;
            isAdministrator: boolean;
            groups: string[];
            visibleCount: number;
            visible: Array<{id: string; title: string}>;
        };
    };
}

/** One cell of the matrix: the answer `hasPermission` gave for this user and this record. */
function Verdict({allowed}: {allowed: boolean}) {
    return allowed
        ? <span className="font-bold text-green-600">✓</span>
        : <span className="text-muted-foreground">·</span>;
}

export default function RecordScopeTest({data}: RecordScopeTestProps) {
    const {current} = data;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        Токен на отдельные записи
                        <Badge variant={data.seeded ? "default" : "destructive"}>
                            {data.seeded ? "демо-данные на месте" : "нет демо-данных"}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <p>
                        Токен <code>{data.token}</code> выдаётся не на модель целиком, а на конкретные записи
                        Test: группа хранит список их id, а <code>check</code> токена пускает только к ним.
                        Всего записей Test — {data.totalRecords}, демо занимает первые {data.records.length}.
                    </p>
                    {!data.seeded && (
                        <p className="text-destructive">
                            Демо-группы пусты — в таблице Test нет записей. Запустите фикстуру
                            с сидом: <code>npm run start:seed</code>.
                        </p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Матрица доступа</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Пользователь</TableHead>
                                <TableHead>Группы</TableHead>
                                {data.records.map((record) => (
                                    <TableHead key={record.id} className="text-center">#{record.index}</TableHead>
                                ))}
                                <TableHead className="text-right">Всего записей</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.users.map((user) => (
                                <TableRow key={user.login}>
                                    <TableCell className="font-medium">
                                        {user.login}
                                        {user.isAdministrator && <Badge className="ml-2" variant="secondary">админ</Badge>}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{user.groups.join(", ") || "—"}</TableCell>
                                    {data.records.map((record) => (
                                        <TableCell key={record.id} className="text-center">
                                            <Verdict allowed={user.allowed.includes(record.id)}/>
                                        </TableCell>
                                    ))}
                                    <TableCell className="text-right">{user.grantedTotal}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <p className="text-sm text-muted-foreground">
                        Каждая клетка — это ответ <code>accessRights.hasPermission(token, user, {"{testId}"})</code>.
                        Группы дают пересекающиеся наборы, поэтому user2 состоит в обеих и видит их объединение,
                        а pass не состоит ни в одной и не видит ничего.
                    </p>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Демо-записи Test</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ol className="space-y-1 text-sm">
                            {data.records.map((record) => (
                                <li key={record.id}>
                                    <span className="text-muted-foreground">#{record.index}</span> {record.title}
                                </li>
                            ))}
                        </ol>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Кто что выдаёт</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        {data.groups.map((group) => (
                            <div key={group.name}>
                                <p className="font-medium">{group.name}</p>
                                <p className="text-muted-foreground">{group.description}</p>
                                <p className="text-muted-foreground">
                                    {group.exists
                                        ? `записей в гранте: ${group.rights.length}`
                                        : "группа не создана"}
                                </p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Ваш доступ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <p>
                        <span className="font-medium">{current.login}</span>
                        {current.groups.length > 0 && <span className="text-muted-foreground"> · {current.groups.join(", ")}</span>}
                    </p>
                    <p className="text-xl font-bold">{current.visibleCount} из {data.totalRecords}</p>
                    {current.isAdministrator ? (
                        <p className="text-muted-foreground">
                            Администратор проходит любую проверку прав, поэтому здесь видны все записи.
                            Чтобы увидеть работу токена, войдите под user1, user2, user3 или pass.
                        </p>
                    ) : current.visible.length ? (
                        <ul className="list-disc space-y-1 pl-5">
                            {current.visible.map((record) => <li key={record.id}>{record.title}</li>)}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground">
                            Ни одна запись не открыта: ваши группы не выдают токен <code>{data.token}</code>.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
