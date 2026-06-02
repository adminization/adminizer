import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {toast} from "sonner";
import axios from "@/lib/axios-compat";
import {Toaster} from "@/components/ui/sonner";
import {router} from "@inertiajs/react";
import DeleteModal from "@/components/modals/del-modal";

interface Module {
    name: string;
    version: string;
    state: string;
}

interface ModuleManagerProps {
    data: {
        modules: Module[];
    };
}

export default function ModuleManager({data}: ModuleManagerProps) {
    const [modules, setModules] = useState<Module[]>(data.modules);

    const handleToggle = async (name: string, currentState: string) => {
        const action = currentState === 'enabled' ? 'disable' : 'enable';
        try {
            await axios.post(`${window.routePrefix}/module-manager/${action}`, {name});
            toast.success(`Модуль ${name} успешно ${action === 'enable' ? 'включён' : 'выключен'}.`);
            setModules(prevModules =>
                prevModules.map(mod =>
                    mod.name === name
                        ? {...mod, state: action === 'enable' ? 'enabled' : 'disabled'}
                        : mod
                )
            );
            router.reload()
        } catch (e) {
            toast.error(`Ошибка при ${action === 'enable' ? 'включении' : 'выключении'} модуля ${name}.`);
        }

    };

    const handleUnregister = async (name: string) => {
        console.log('handleUnregister called for:', name);
        try {
            await axios.post(`${window.routePrefix}/module-manager/unregister`, {name});
            toast.success(`Модуль ${name} успешно удалён.`);
            setModules(prevModules => prevModules.filter(mod => mod.name !== name));
            router.reload();
        } catch (e) {
            toast.error(`Ошибка при удалении модуля ${name}.`);
        }
    };

    return (
        <>
            <Toaster position="top-center" richColors closeButton/>
            <Card className="py-4">
                <CardHeader>
                    <CardTitle>Менеджер модулей</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Имя</TableHead>
                                <TableHead>Версия</TableHead>
                                <TableHead>Статус</TableHead>
                                <TableHead>Действия</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {modules.map((mod) => (
                                <TableRow key={mod.name}>
                                    <TableCell>{mod.name}</TableCell>
                                    <TableCell>{mod.version}</TableCell>
                                    <TableCell>
                                    <span
                                        className={`px-2 py-1 rounded text-xs font-medium ${mod.state === 'enabled' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{mod.state}</span>
                                    </TableCell>
                                    <TableCell className="flex gap-x-4">
                                        <Button
                                            onClick={() => handleToggle(mod.name, mod.state)}
                                            variant={mod.state === 'enabled' ? "destructive" : "default"}
                                            size="sm"
                                        >
                                            {mod.state === 'enabled' ? 'Выключить' : 'Включить'}
                                        </Button>
                                        <DeleteModal
                                            btnTitle="Удалить"
                                            variant="destructive"
                                            btnCLass=""
                                            handleDelete={() => handleUnregister(mod.name)}
                                            isLink={false}
                                            delModal={{
                                                yes: 'Да',
                                                no: 'Нет',
                                                text: `Вы уверены, что хотите удалить модуль ${mod.name}? Это действие нельзя отменить.`
                                            }}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </>
    );
}
