export interface ControlEntryProps<TValue = unknown> {
    initialValue: TValue;
    options?: Record<string, any>;
    onChange: (value: any) => void;
    name: string;
    disabled?: boolean;
}
