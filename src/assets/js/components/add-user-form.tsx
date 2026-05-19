import { type SharedData } from '@/types';
import { Link, useForm, usePage } from "@inertiajs/react";
import { Icon } from "@/components/icon.tsx";
import { LoaderCircle, MoveLeft, Info, RefreshCw, Copy, Key } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { FormEventHandler, useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import InputError from "@/components/input-error.tsx";
import MaterialIcon from "@/components/material-icon.tsx";
import { adminApi } from '@/lib/admin-api';
import { toast } from "sonner";

type value = string | boolean | Date | Record<string, string>[]

interface AddUserFormProps extends SharedData {
    edit: boolean;
    view: boolean;
    btnBack: {
        title: string;
        link: string;
    },
    passwordError: string
    btnSave: {
        title: string;
    },
    postLink: string,
    head: string,
    groupHead: string,
    userPretend: {
        label: string,
        postLink: string,
    }
    fields: Field[]
    groups: Field[]
    locales: Record<string, string>[]
    apiKey?: string;
}

interface Field {
    label: string;
    type: string;
    name: string;
    tooltip?: string;
    value: value;
}

export default function AddUserForm() {
    const page = usePage<AddUserFormProps>()
    const [timezones, setTimezones] = useState<Record<string, string>[]>()

    const { fields, groups, auth } = page.props;
    const [showApiKey, setShowApiKey] = useState(false);
    const [currentApiKey, setCurrentApiKey] = useState<string | undefined>(page.props.apiKey);
    const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
    const {
        data,
        setData,
        errors,
        setError,
        clearErrors,
        post,
        processing,
    } = useForm<Required<Record<string, value>>>({
        ...Object.fromEntries(fields.map(field => [field.name, field.value])),
        ...Object.fromEntries(groups.map(group => [group.name, group.value]))
    });

    useEffect(() => {
        const getTimezones = async () => {
            const data = await adminApi.get<any>(`${window.routePrefix}/get-timezones`)
            setTimezones(data.data.timezones)
        }
        getTimezones()
    }, [])

    const getField = (name: string) => {
        return page.props.fields.find(field => field.name === name);
    }

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (data.userPassword !== data.repeatUserPassword) {
            setError('repeatUserPassword', page.props.passwordError)
            return
        }
        post(page.props.postLink);
    };

    const handleChangeDate = (fieldName: string, value: value) => {
        clearErrors()
        setData(fieldName, value);
    }

    const handleRegenerateApiKey = async () => {
        try {
            const response = await adminApi.post<any>('/adminizer/api/user-key/regenerate');
            setCurrentApiKey(response.data.apiKey);
            toast.success('User API key regenerated');
        } catch (error) {
            console.error('Failed to regenerate user API key:', error);
            toast.error('Failed to regenerate user API key');
        }
        setShowRegenerateDialog(false);
    };

    const copyApiKey = async () => {
        if (!currentApiKey) return;
        try {
            await navigator.clipboard.writeText(currentApiKey);
            toast.success('API key copied to clipboard');
        } catch (err) {
            toast.error('Failed to copy');
        }
    };

    return (
        <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            <div className="w-full sticky z-[1001] py-4 pb-8 top-0 h-fit bg-background flex gap-4">
                <Button className="mb-3 w-fit" asChild>
                    <Link href={page.props.btnBack.link}>
                        <Icon iconNode={MoveLeft} />
                        {page.props.btnBack.title}
                    </Link>
                </Button>
                <Button variant="green" type="submit" className="w-fit" form="addUserForm"
                    disabled={processing || page.props.view}>
                    {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    {page.props.btnSave.title}
                </Button>
            </div>
            <form id="addUserForm" onSubmit={submit} className={page.props.view ? 'cursor-not-allowed' : ''}>
                <div className="flex flex-col gap-10 max-w-[1144px]">
                    <h2 className="font-bold text-xl">{page.props.head}</h2>
                    <div className="flex-col xl:flex-row flex gap-16">
                        <div className="basis-1/2 flex flex-col gap-6">
                            <div className="grid gap-4">
                                <Label htmlFor={getField('login')?.name}>{getField('login')?.label}</Label>
                                <Input
                                    id={getField('login')?.name}
                                    type="text"
                                    required
                                    tabIndex={1}
                                    autoComplete="username"
                                    value={data.login as string}
                                    onChange={(e) => handleChangeDate('login', e.target.value)}
                                    disabled={processing || page.props.view}
                                    placeholder={getField('login')?.label}
                                />
                            </div>
                            <div className="grid gap-4">
                                <Label htmlFor={getField('fullName')?.name}>{getField('fullName')?.label}</Label>
                                <Input
                                    id={getField('fullName')?.name}
                                    type="text"
                                    required
                                    tabIndex={1}
                                    autoComplete="additional-name"
                                    value={data.fullName as string}
                                    onChange={(e) => handleChangeDate('fullName', e.target.value)}
                                    disabled={processing || page.props.view}
                                    placeholder={getField('fullName')?.label}
                                />
                            </div>
                            <div className="grid gap-4">
                                <Label htmlFor={getField('email')?.name}>{getField('email')?.label}</Label>
                                <Input
                                    id={getField('email')?.name}
                                    type="email"
                                    required
                                    tabIndex={1}
                                    autoComplete="email"
                                    value={data.email as string}
                                    onChange={(e) => handleChangeDate('email', e.target.value)}
                                    disabled={processing || page.props.view}
                                    placeholder={getField('email')?.label}
                                />
                            </div>
                        </div>
                        <div className="basis-1/2 flex flex-col gap-6">
                            <div className="grid gap-4">
                                <Label htmlFor={getField('timezone')?.name}>{getField('timezone')?.label}</Label>
                                <Select onValueChange={(value) => handleChangeDate('timezone', value)}
                                    defaultValue={data.timezone as string} disabled={processing || page.props.view}>
                                    <SelectTrigger className="w-full cursor-pointer">
                                        <SelectValue placeholder={getField('timezone')?.name} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(timezones ?? []).map((option) => (
                                            <SelectItem value={option.value}
                                                key={option.value}>{option.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div
                                className="flex flex-col md:flex-row justify-start gap-4 xl:justify-between items-start md:items-center">
                                {getField('date') && (
                                    <div className="grid gap-4">
                                        <Label htmlFor={getField('date')?.name}>{getField('date')?.label}</Label>
                                        <Input
                                            id={getField('date')?.name}
                                            type="date"
                                            className="max-w-fit"
                                            tabIndex={1}
                                            value={data.date as string}
                                            onChange={(e) => handleChangeDate('date', e.target.value)}
                                            disabled={processing}
                                        />
                                    </div>
                                )}
                                <div className="flex gap-6">
                                    {getField('isAdmin') && (
                                        <div className="grid gap-4">
                                            <Label className="cursor-pointer"
                                                htmlFor={getField('isAdmin')?.name}>{getField('isAdmin')?.label}</Label>
                                            <Checkbox
                                                id={getField('isAdmin')?.name}
                                                className="cursor-pointer size-5"
                                                disabled={processing || page.props.view}
                                                checked={data.isAdmin as boolean}
                                                onCheckedChange={(value) => handleChangeDate('isAdmin', value)}
                                            />
                                        </div>
                                    )}
                                    {getField('isConfirmed') && (
                                        <div className="grid gap-4">
                                            <Label className="cursor-pointer"
                                                htmlFor={getField('isConfirmed')?.name}>{getField('isConfirmed')?.label}</Label>
                                            <Checkbox
                                                id={getField('isConfirmed')?.name}
                                                className="cursor-pointer size-5"
                                                disabled={processing || page.props.view}
                                                checked={data.isConfirmed as boolean}
                                                onCheckedChange={(value) => handleChangeDate('isConfirmed', value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            {getField('locale') && (
                                <div className="grid gap-4">
                                    <Label htmlFor={getField('locale')?.name}>{getField('locale')?.label}</Label>
                                    <Select onValueChange={(value) => handleChangeDate('locale', value)}
                                        defaultValue={data.locale as string}
                                        disabled={processing || page.props.view}>
                                        <SelectTrigger className="w-full cursor-pointer">
                                            <SelectValue placeholder={getField('locale')?.name} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(page.props.locales ?? []).map((option) => (
                                                <SelectItem value={option.value}
                                                    key={option.value}>{option.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    </div>
                    {auth.user.isAdministrator && (
                        <Button className="w-fit" asChild variant="outline">
                            <Link href={page.props.userPretend.postLink} method="post" data={{ login: data.login, pretend: true }}>
                                <MaterialIcon name="masks" className="!text-[18px]" />
                                {page.props.userPretend.label}
                            </Link>
                        </Button>
                    )}
                    <div className="flex gap-3">
                        <label className="font-bold text-xl">{getField('userPassword')?.label}</label>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger onClick={(e) => e.preventDefault()}>
                                    <Icon iconNode={Info} className="text-primary w-5 h-5 cursor-pointer" />
                                </TooltipTrigger>
                                <TooltipContent align="center" side="top">
                                    <p>{getField('userPassword')?.tooltip}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <div className="grid grid-col-1 lg:grid-cols-2 grid-rows-2 gap-x-16 gap-y-6">
                        <div className="grid gap-4 col-span-1">
                            <Label
                                htmlFor={getField('userPassword')?.name}>{getField('userPassword')?.label}</Label>
                            <Input
                                id={getField('userPassword')?.name}
                                type="password"
                                required={!page.props.edit}
                                tabIndex={1}
                                autoComplete="new-password"
                                value={data.password as string}
                                onChange={(e) => handleChangeDate('userPassword', e.target.value)}
                                disabled={processing || page.props.view}
                                placeholder={getField('userPassword')?.label}
                            />
                        </div>
                        <div className="grid gap-4 col-span-1 col-start-1">
                            <Label
                                htmlFor={getField('repeatUserPassword')?.name}>{getField('repeatUserPassword')?.label}</Label>
                            <Input
                                id={getField('repeatUserPassword')?.name}
                                type="password"
                                required={!page.props.edit}
                                tabIndex={1}
                                autoComplete="new-password"
                                value={data.repeatUserPassword as string}
                                onChange={(e) => handleChangeDate('repeatUserPassword', e.target.value)}
                                disabled={processing || page.props.view}
                                placeholder={getField('repeatUserPassword')?.label}
                            />
                            <InputError message={errors.repeatUserPassword} />
                        </div>
                    </div>
                    {page.props.groups.length > 0 && (
                        <>
                            <h2 className="font-bold text-xl">{page.props.groupHead}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-5 xl:grid-cols-6 gap-4">
                                {page.props.groups.map(group => (
                                    <div className="grid gap-4" key={group.name}>
                                        <Label className="cursor-pointer"
                                            htmlFor={group.name}>{group.label}</Label>
                                        <Checkbox
                                            id={group.name}
                                            disabled={processing || page.props.view}
                                            className="cursor-pointer size-5"
                                            checked={data[group.name] as boolean}
                                            onCheckedChange={(value) => handleChangeDate(group.name, value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* User API Key Section — only in edit mode */}
                    {page.props.edit && !page.props.view && (
                        <>
                            <h2 className="font-bold text-xl flex items-center gap-2">
                                <Key className="w-5 h-5" />
                                User API Key (for feeds)
                            </h2>
                            <div className="flex flex-col gap-4">
                                {currentApiKey && (
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 text-sm bg-muted px-3 py-2 rounded font-mono truncate">
                                            {showApiKey ? currentApiKey : '••••••••••••••••••••••••'}
                                        </code>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            type="button"
                                            onClick={() => setShowApiKey(!showApiKey)}
                                        >
                                            {showApiKey ? 'Hide' : 'Show'}
                                        </Button>
                                        {showApiKey && (
                                            <Button variant="outline" size="sm" type="button" onClick={copyApiKey}>
                                                <Copy className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    type="button"
                                    className="w-fit"
                                    onClick={() => setShowRegenerateDialog(true)}
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Regenerate User API Key
                                </Button>
                                <p className="text-sm text-muted-foreground">
                                    Regenerating this key will invalidate all existing feed URLs.
                                    You will need to update the <code className="bg-muted px-1 text-xs">?userKey=</code> parameter in all feed links.
                                </p>
                            </div>
                        </>
                    )}
                    {/* Regenerate API Key Confirmation Dialog */}
                    {showRegenerateDialog && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                            <div className="bg-background rounded-lg shadow-lg max-w-md w-full p-6">
                                <h3 className="text-lg font-semibold mb-2">Regenerate User API Key</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    This will invalidate all existing feed URLs. You will need to update them with the new userKey.
                                </p>
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" type="button" onClick={() => setShowRegenerateDialog(false)}>
                                        Cancel
                                    </Button>
                                    <Button variant="destructive" type="button" onClick={handleRegenerateApiKey}>
                                        Regenerate
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}


