import {Link, useForm, usePage} from "@inertiajs/react";
import {SharedData} from "@/types";
import {Button} from "@/components/ui/button.tsx";
import {Icon} from "@/components/icon.tsx";
import {Info, LoaderCircle, MoveLeft} from "lucide-react";
import {FC, FormEventHandler, memo, useCallback, useState} from "react";
import {Label} from "@/components/ui/label.tsx";
import {Input} from "@/components/ui/input.tsx";
import {Checkbox} from "@/components/ui/checkbox.tsx";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {CheckedState} from "@radix-ui/react-checkbox";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover.tsx";
import {adminApi} from "@/lib/admin-api.ts";

type value = string | boolean | Date | string[] | Record<string, string>[]

interface PermissionOptions {
    rights: string[];
}

interface Field {
    label: string;
    type: string;
    name: string;
    tooltip?: string;
    value: value;
    options?: {
        permissionOptions?: PermissionOptions;
    };
}

interface groupedTokens {
    header: string,
    fields: Field[]
}

interface AddGroupProps extends SharedData {
    edit: boolean;
    view: boolean;
    btnBack: {
        title: string;
        link: string;
    },
    btnSave: {
        title: string;
    },
    postLink: string,
    head: string,
    userHead: string,
    fields: Field[],
    users: Field[]
    groupedTokens: groupedTokens[]
}

interface CheckboxFieldProps {
    field: Field
    disabled: boolean;
    value: boolean
    onCheckedChange: (name: string, value: CheckedState) => void;
    tooltip?: boolean;
}

const CheckboxField: FC<CheckboxFieldProps> = memo(({field, disabled, value, onCheckedChange, tooltip}) => {

    const handleChange = useCallback((value: CheckedState) => {
        onCheckedChange(field.name, value);
    }, [field.name, onCheckedChange]);

    return (
        <div className="flex gap-3 items-center">
            <Checkbox
                id={field.name}
                className="cursor-pointer size-5"
                disabled={disabled}
                checked={value}
                onCheckedChange={handleChange}
            />
            <div className="flex gap-3">
                <Label className="cursor-pointer"
                       htmlFor={field.name}>{field.label}</Label>
                {tooltip &&
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger onClick={(e) => e.preventDefault()}>
                                <Icon iconNode={Info}
                                      className="text-primary w-5 h-5 cursor-pointer"/>
                            </TooltipTrigger>
                            <TooltipContent align="center" side="top">
                                <p>{field.tooltip}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                }
            </div>
        </div>
    )
})

interface PermissionOptionsFieldProps extends CheckboxFieldProps {
    onRightsChange: (name: string, value: string[]) => void;
}

interface PermissionOption {
    id: string;
    name: string;
    description?: string;
}

const PermissionOptionsField: FC<PermissionOptionsFieldProps> = memo(({
    field, disabled, value, onCheckedChange, onRightsChange,
}) => {
    const permissionOptions = field.options?.permissionOptions;
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<PermissionOption[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!permissionOptions) {
        return <CheckboxField field={field} disabled={disabled} value={value} onCheckedChange={onCheckedChange} tooltip/>;
    }

    const rightsFieldName = `token-record-rights-${field.name.slice("token-checkbox-".length)}`;
    const selectedRights = permissionOptions.rights;

    const loadOptions = async () => {
        if (options || loading) return;

        setLoading(true);
        setError(null);
        try {
            const tokenId = field.name.slice("token-checkbox-".length);
            const response = await adminApi.getJson<{options: PermissionOption[]}>(
                `${window.routePrefix}/access-rights/permission-options`,
                {params: {tokenId}},
            );
            setOptions(response.data.options);
        } catch {
            setError("Не удалось загрузить варианты разрешения");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (open) void loadOptions();
    };

    const toggleRecord = (recordId: string, checked: CheckedState) => {
        const nextRights = checked === true
            ? Array.from(new Set([...selectedRights, recordId]))
            : selectedRights.filter((right) => right !== recordId);
        onRightsChange(rightsFieldName, nextRights);
    };

    return (
        <div className="grid gap-2">
            <CheckboxField field={field} disabled={disabled} value={value} onCheckedChange={onCheckedChange} tooltip/>
            {value && (
                <Popover open={isOpen} onOpenChange={handleOpenChange}>
                    <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="sm" className="w-fit ml-8"
                                disabled={disabled}>
                            Выбрать варианты ({selectedRights.length})
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="max-h-80 overflow-y-auto">
                        {loading && <div className="flex items-center gap-2 text-sm"><LoaderCircle className="size-4 animate-spin"/>Загрузка…</div>}
                        {error && <p className="text-sm text-destructive">{error}</p>}
                        {options?.map((option) => (
                            <div key={option.id} className="flex gap-3 items-start py-1">
                                <Checkbox
                                    id={`${field.name}-${option.id}`}
                                    checked={selectedRights.includes(option.id)}
                                    disabled={disabled}
                                    onCheckedChange={(checked) => toggleRecord(option.id, checked)}
                                />
                                <Label className="cursor-pointer grid gap-0.5" htmlFor={`${field.name}-${option.id}`}>
                                    <span>{option.name}</span>
                                    {option.description && <span className="text-xs font-normal text-muted-foreground">{option.description}</span>}
                                </Label>
                            </div>
                        ))}
                        {options?.length === 0 && <p className="text-sm text-muted-foreground">Вариантов нет</p>}
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
})


export default function AddGroupForm() {
    const page = usePage<AddGroupProps>();

    const {fields, groupedTokens, users} = page.props;

    const {
        data,
        setData,
        clearErrors,
        post,
        processing,
    } = useForm<Required<Record<string, value>>>({
        ...Object.fromEntries(fields.map(field => [field.name, field.value])),
        ...Object.fromEntries(users.map(field => [field.name, field.value])),
        ...Object.fromEntries(groupedTokens.flatMap(group =>
            group.fields.flatMap(field => [
                [field.name, field.value],
                ...(field.options?.permissionOptions
                    ? [[`token-record-rights-${field.name.slice("token-checkbox-".length)}`, field.options.permissionOptions.rights]]
                    : []),
            ])))
    });

    const getField = (name: string) => {
        return page.props.fields.find(field => field.name === name);
    }

    const handleChangeDate = useCallback((fieldName: string, value: value) => {
        clearErrors()
        setData(fieldName, value);
    }, [])

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(page.props.postLink);
    };
    return (
        <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            <div className="w-full sticky z-[1001] py-4 pb-8 top-0 h-fit bg-background flex gap-4">
                <Button className="mb-3 w-fit" asChild>
                    <Link href={page.props.btnBack.link}>
                        <Icon iconNode={MoveLeft}/>
                        {page.props.btnBack.title}
                    </Link>
                </Button>
                <Button variant="green" type="submit" className="w-fit" form="addUserForm"
                        disabled={processing || page.props.view}>
                    {processing && <LoaderCircle className="h-4 w-4 animate-spin"/>}
                    {page.props.btnSave.title}
                </Button>
            </div>
            <form id="addUserForm" onSubmit={submit}
                  className={`${page.props.view ? 'cursor-not-allowed' : ''}`}>
                <div className="flex flex-col gap-6 max-w-[1144px]">
                    <h2 className="font-bold text-xl">{page.props.head}</h2>
                    <div className="grid gap-4">
                        <Label htmlFor={getField('name')?.name}>{getField('name')?.label}</Label>
                        <Input
                            id={getField('name')?.name}
                            type="text"
                            required
                            tabIndex={1}
                            autoComplete={getField('name')?.name}
                            value={data.name as string}
                            onChange={(e) => handleChangeDate('name', e.target.value)}
                            disabled={processing || page.props.view}
                            placeholder={getField('name')?.label}
                        />
                    </div>
                    <div className="grid gap-4">
                        <Label htmlFor={getField('description')?.name}>{getField('description')?.label}</Label>
                        <Input
                            id={getField('description')?.name}
                            type="text"
                            required
                            tabIndex={1}
                            autoComplete={getField('description')?.name}
                            value={data.description as string}
                            onChange={(e) => handleChangeDate('description', e.target.value)}
                            disabled={processing || page.props.view}
                            placeholder={getField('description')?.label}
                        />
                    </div>
                    {page.props.users.length > 0 && (
                        <>
                            <h2 className="font-bold text-xl">{page.props.userHead}</h2>
                            {page.props.users.map((field) => (
                                <CheckboxField
                                    key={field.name}
                                    field={field}
                                    disabled={processing || page.props.view}
                                    value={data[field.name] as boolean}
                                    onCheckedChange={handleChangeDate}
                                />
                            ))}
                        </>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {page.props.groupedTokens?.length > 0 && (
                            page.props.groupedTokens.map((group) => (
                                <div key={group.header} className="grid gap-4 content-start justify-between">
                                    <h2 className="font-bold text-xl mt-3">{group.header}</h2>
                                    {group.fields.map((field) => field.options?.permissionOptions ? (
                                        <PermissionOptionsField
                                            key={field.name}
                                            field={{
                                                ...field,
                                                options: {
                                                    permissionOptions: {
                                                        ...field.options.permissionOptions,
                                                        rights: data[`token-record-rights-${field.name.slice("token-checkbox-".length)}`] as string[],
                                                    },
                                                },
                                            }}
                                            disabled={processing || page.props.view}
                                            value={data[field.name] as boolean}
                                            onCheckedChange={handleChangeDate}
                                            onRightsChange={handleChangeDate}
                                        />
                                    ) : (
                                        <CheckboxField
                                            key={field.name}
                                            field={field}
                                            disabled={processing || page.props.view}
                                            value={data[field.name] as boolean}
                                            onCheckedChange={handleChangeDate}
                                            tooltip={true}
                                        />
                                    ))}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
}
