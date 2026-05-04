import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
    CheckIcon,
    XCircle,
    ChevronDown,
    XIcon,
    WandSparkles,
    ExternalLink,
    Plus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { useI18n } from "@/hooks/use-i18n";

const multiSelectVariants = cva(
    "m-1 flex items-center border rounded-sm px-1",
    {
        variants: {
            variant: {
                default:
                    "border-foreground/10 text-foreground bg-card hover:bg-card/80",
                secondary:
                    "border-foreground/10 bg-secondary text-secondary-foreground hover:bg-secondary/80",
                destructive:
                    "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
                inverted: "inverted",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

interface MultiSelectProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof multiSelectVariants> {
    options: {
        label: string;
        value: string;
        icon?: React.ComponentType<{ className?: string }>;
    }[];
    disabled?: boolean;
    onValueChange: (value: string[]) => void;
    defaultValue?: string[];
    placeholder?: string;
    animation?: number;
    maxCount?: number;
    notFound?: string;
    search?: string
    modalPopover?: boolean;
    asChild?: boolean;
    className?: string;
    /**
     * Selection mode: 'multiple' for multiple selection, 'single' for single selection
     * @default 'multiple'
     */
    mode?: 'multiple' | 'single';
    processing?: boolean;
    /**
     * Called when user clicks the "open" icon on a selected chip.
     * If provided, an ExternalLink icon is rendered next to each chip.
     */
    onOpenItem?: (value: string) => void;
    /**
     * Called when user clicks the "+" button to create a new related record.
     * If provided, an add button is rendered in the selected-values area.
     */
    onAddNew?: () => void;
}

const MultiSelect = React.forwardRef<
    HTMLButtonElement,
    MultiSelectProps
>(
    (
        {
            options,
            onValueChange,
            variant,
            processing,
            disabled,
            defaultValue = [],
            placeholder = "",
            notFound = "",
            search = "",
            animation = 0,
            maxCount = 3,
            modalPopover = false,
            asChild = false,
            className,
            mode = 'multiple',
            onOpenItem,
            onAddNew,
            ...props
        },
        ref
    ) => {
        const { t } = useI18n();
        const [selectedValues, setSelectedValues] = React.useState<string[]>(defaultValue);
        const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
        const [isAnimating, setIsAnimating] = React.useState(false);

        React.useEffect(() => {
            if (defaultValue) {
                setSelectedValues(defaultValue);
            }
        }, [defaultValue])

        const handleInputKeyDown = (
            event: React.KeyboardEvent<HTMLInputElement>
        ) => {
            if (event.key === "Enter") {
                setIsPopoverOpen(true);
            } else if (event.key === "Backspace" && !event.currentTarget.value) {
                const newSelectedValues = [...selectedValues];
                newSelectedValues.pop();
                setSelectedValues(newSelectedValues);
                onValueChange(newSelectedValues);
            }
        };

        const toggleOption = (option: string) => {
            let newSelectedValues;

            if (mode === 'single') {
                // For single selection
                newSelectedValues = selectedValues.includes(option) ? [] : [option];
            } else {
                // For multiple selection
                newSelectedValues = selectedValues.includes(option)
                    ? selectedValues.filter((value) => value !== option)
                    : [...selectedValues, option];
            }

            setSelectedValues(newSelectedValues);
            onValueChange(newSelectedValues);

            // Closing the popover in single selection mode
            if (mode === 'single') {
                setIsPopoverOpen(false);
            }
        };

        const handleClear = () => {
            setSelectedValues([]);
            onValueChange([]);
        };

        const handleTogglePopover = () => {
            setIsPopoverOpen((prev) => !prev);
        };

        const clearExtraOptions = () => {
            const newSelectedValues = selectedValues.slice(0, maxCount);
            setSelectedValues(newSelectedValues);
            onValueChange(newSelectedValues);
        };

        const renderAddNewButton = () => {
            if (!onAddNew) {
                return null;
            }

            return (
                <div
                    role="button"
                    className={cn(
                        "m-1 cursor-pointer",
                        isAnimating ? "animate-bounce" : "",
                        multiSelectVariants({ variant })
                    )}
                    style={{ animationDuration: `${animation}s` }}
                    onClick={(event) => {
                        event.stopPropagation();
                        onAddNew();
                    }}
                >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    <span>{t("Add")}</span>
                </div>
            );
        };

        return (
            <Popover
                open={isPopoverOpen}
                onOpenChange={setIsPopoverOpen}
                modal={modalPopover}
            >
                <PopoverTrigger asChild>
                    <Button
                        ref={ref}
                        {...props}
                        onClick={handleTogglePopover}
                        disabled={disabled}
                        className={cn(
                            "flex w-full p-1 rounded-md border-input border-1 min-h-10 h-auto items-center justify-between bg-inherit hover:bg-inherit [&_svg]:pointer-events-auto",
                            className,
                        )}
                    >
                        {selectedValues.length > 0 ? (
                            <div className={`flex justify-between items-center w-full`}>
                                <div className="flex flex-wrap items-center">
                                    {selectedValues.slice(0, maxCount).map((value) => {
                                        const option = options.find((o) => o.value === value);
                                        const IconComponent = option?.icon;
                                        return (
                                            <div
                                                key={value}
                                                className={cn(
                                                    isAnimating ? "animate-bounce" : "",
                                                    multiSelectVariants({ variant })
                                                )}
                                                style={{ animationDuration: `${animation}s` }}
                                            >
                                                {IconComponent && (
                                                    <IconComponent className="h-4 w-4 mr-2" />
                                                )}
                                                {option?.label}
                                                {onOpenItem && (
                                                    <ExternalLink
                                                        className="ml-2 h-4 w-4 cursor-pointer text-muted-foreground hover:text-foreground"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            onOpenItem(value);
                                                        }}
                                                    />
                                                )}
                                                <XCircle
                                                    className={`ml-2 h-4 w-4 cursor-pointer`}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        if(!processing) {
                                                            toggleOption(value);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        );
                                    })}
                                    {mode === 'multiple' && selectedValues.length > maxCount && (
                                        <div
                                            className={cn(
                                                "bg-transparent text-foreground border-foreground/1 hover:bg-transparent",
                                                isAnimating ? "animate-bounce" : "",
                                                multiSelectVariants({ variant })
                                            )}
                                            style={{ animationDuration: `${animation}s` }}
                                        >
                                            {`+ ${selectedValues.length - maxCount} more`}
                                            <XCircle
                                                className="ml-2 h-4 w-4 cursor-pointer"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    clearExtraOptions();
                                                }}
                                            />
                                        </div>
                                    )}
                                    {renderAddNewButton()}
                                </div>
                                <div className="flex items-center justify-between">
                                    {selectedValues.length > 0 && (
                                        <>
                                            <XIcon
                                                className="h-4 mx-2 cursor-pointer text-muted-foreground"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleClear();
                                                }}
                                            />
                                            <Separator
                                                orientation="vertical"
                                                className="flex min-h-6 h-full"
                                            />
                                        </>
                                    )}
                                    <ChevronDown className="h-4 mx-2 cursor-pointer text-muted-foreground" />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between w-full mx-auto">
                                <span className="text-sm text-muted-foreground mx-3">
                                    {placeholder}
                                </span>
                                <div className="flex items-center">
                                    {renderAddNewButton()}
                                    <ChevronDown className="h-4 cursor-pointer text-muted-foreground mx-2" />
                                </div>
                            </div>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-auto p-0 z-[1003]"
                    align="start"
                    onEscapeKeyDown={() => setIsPopoverOpen(false)}
                >
                    <Command>
                        <CommandInput
                            placeholder={search}
                            onKeyDown={handleInputKeyDown}
                        />
                        <CommandList>
                            <CommandEmpty>{notFound}</CommandEmpty>
                            <CommandGroup>
                                {options.map((option) => {
                                    const isSelected = selectedValues.includes(option.value);
                                    return (
                                        <CommandItem
                                            key={option.value}
                                            onSelect={() => toggleOption(option.value)}
                                            className="cursor-pointer"
                                        >
                                            <div
                                                className={cn(
                                                    "mr-2 flex h-5 w-5 items-center justify-center rounded border border-primary",
                                                    isSelected
                                                        ? "bg-primary text-primary-foreground"
                                                        : "opacity-50 [&_svg]:invisible"
                                                )}
                                            >
                                                <CheckIcon className="h-4 w-4 text-primary-foreground" />
                                            </div>
                                            {option.icon && (
                                                <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                                            )}
                                            <span>{option.label}</span>
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                            <CommandSeparator />
                        </CommandList>
                    </Command>
                </PopoverContent>
                {animation > 0 && selectedValues.length > 0 && mode === 'multiple' && (
                    <WandSparkles
                        className={cn(
                            "cursor-pointer my-2 text-foreground bg-background w-3 h-3",
                            isAnimating ? "" : "text-muted-foreground"
                        )}
                        onClick={() => setIsAnimating(!isAnimating)}
                    />
                )}
            </Popover>
        );
    }
);

MultiSelect.displayName = "MultiSelect";

export default MultiSelect;
