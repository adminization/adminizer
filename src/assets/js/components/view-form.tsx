import {FC} from "react";
import {Field} from "@/types";
import {Label} from "@/components/ui/label.tsx";
import FieldRenderer from "@/components/field-renderer.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Link} from "@inertiajs/react";
import {Icon} from "@/components/icon.tsx";
import {MoveLeft} from "lucide-react";
import InputError from "@/components/input-error.tsx";
import {getFieldError} from '@/hooks/form-state';

export interface ViewFormProps {
    page: { props: { fields: Field[]; btnBack: { title: string; link: string; }; view: boolean; notFound?: string; search?: string; } };
}

const ViewForm: FC<ViewFormProps> = ({page}) => {
    const {fields, btnBack, notFound} = page.props;
    return (
        <div className="p-4 w-full">
            <div className="w-full sticky z-[1001] py-4 pb-8 top-0 h-fit bg-background flex gap-4">
                <Button className="w-fit" asChild>
                    <Link href={btnBack.link} preserveScroll={true}>
                        <Icon iconNode={MoveLeft}/>
                        {btnBack.title}
                    </Link>
                </Button>
            </div>
            <div className="grid gap-4 max-w-[1144px]">
                {fields.map((field) => (
                    <div className="grid gap-4 w-full" key={field.name}>
                        <Label htmlFor={`${field.type}-${field.name}`}>{field.label}</Label>
                        <InputError message={getFieldError(`${field.type}-${field.name}`)}/>
                        <FieldRenderer field={{...field, disabled: true}} value={field.value} onChange={() => {}} processing={true} notFound={notFound} search={page.props.search}/>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ViewForm;
