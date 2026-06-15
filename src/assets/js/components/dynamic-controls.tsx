import {type ComponentType as ReactComponentType, useEffect, useState} from "react";
import {loadControlModule} from "@/components/control-loader";

interface DynamicControlProps {
    options?: Record<string, any>
    initialValue: any
    onChange: (value: any) => void
    name: string
    disabled?: boolean
}

export interface ComponentType {
    default: ReactComponentType<DynamicControlProps>;
}

interface Props {
    moduleComponent: string;
    cssPath?: string;
    options?: Record<string, any>
    initialValue: any
    onChange: (value: any) => void
    name: string,
    disabled?: boolean
}

export default function DynamicControls({
    moduleComponent,
    cssPath,
    options,
    initialValue,
    onChange,
    name,
    disabled,
}: Props) {
    const [Component, setComponent] = useState<ReactComponentType<DynamicControlProps> | null>(null);

    useEffect(() => {
        let active = true;

        const initModule = async () => {
            const module = await loadControlModule<DynamicControlProps>(
                moduleComponent,
                cssPath
            );
            if (active) {
                setComponent(() => module.default);
            }
        }

        setComponent(null);
        void initModule();

        return () => {
            active = false;
        };
    }, [moduleComponent, cssPath]);

    if (!Component) {
        return null;
    }

    return (
        <Component
            initialValue={initialValue}
            options={options}
            onChange={onChange}
            name={name}
            disabled={disabled}
        />
    );
}
