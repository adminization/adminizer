'use client';

import {cn} from '@/lib/utils';
import * as Portal from '@radix-ui/react-portal';
import {
    Children,
    cloneElement,
    createContext, isValidElement,
    useContext,
    useEffect,
    useState,
} from 'react';
import type {
    ButtonHTMLAttributes,
    Dispatch,
    HTMLAttributes,
    MouseEventHandler,
    ReactElement,
    ReactNode,
    SetStateAction,
} from 'react';
import {Button} from "@/components/ui/button";
import {XIcon} from "lucide-react";
import * as React from "react";

type DialogStackContextType = {
    activeIndex: number;
    setActiveIndex: Dispatch<SetStateAction<number>>;
    totalDialogs: number;
    setTotalDialogs: Dispatch<SetStateAction<number>>;
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    clickable: boolean;
    shouldAnimate: boolean;
    setShouldAnimate: Dispatch<SetStateAction<boolean>>;
    closeDialog: (index: number) => void;
};

interface DialogStackProps extends HTMLAttributes<HTMLDivElement> {
    open?: boolean;
    clickable?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: ReactNode;
}

export type DialogStackHandle = {
    open: () => void;
    close: () => void;
    closeAll: () => void;
    next: () => void;
    prev: () => void;
    closeCurrent: () => void;
};

const DialogStackContext = createContext<DialogStackContextType>({
    activeIndex: 0,
    setActiveIndex: () => {
    },
    totalDialogs: 0,
    setTotalDialogs: () => {
    },
    isOpen: false,
    setIsOpen: () => {
    },
    clickable: false,
    shouldAnimate: false,
    setShouldAnimate: () => {
    },
    closeDialog: () => {
    }, // Added
});

type DialogStackChildProps = {
    index?: number;
};

export const DialogStack = React.forwardRef<DialogStackHandle, DialogStackProps>(
    ({
         children,
         className,
         open = false,
         onOpenChange,
         clickable = false,
         ...props
     }, ref) => {
        const [activeIndex, setActiveIndex] = useState(0);
        const [isOpen, setIsOpen] = useState(open);
        const [shouldAnimate, setShouldAnimate] = useState(false);
        const [totalDialogs, setTotalDialogs] = useState(0);

        const closeDialog = (index: number) => {
            if (index === activeIndex) {
                if (activeIndex > 0) {
                    setActiveIndex(prev => prev - 1);
                } else {
                    setIsOpen(false);
                }
            }
        };

        // Imperative methods
        React.useImperativeHandle(ref, () => ({
            open: () => {
                setIsOpen(true);
            },
            close: () => {
                setIsOpen(false);
                setActiveIndex(0);
            },
            closeAll: () => {
                setIsOpen(false);
                setActiveIndex(0);
            },
            next: () => {
                setActiveIndex(prev => prev + 1);
            },
            prev: () => {
                setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
            },
            goTo: (index: number) => {
                if (index >= 0 && index < totalDialogs) {
                    setActiveIndex(index);
                }
            },
            closeCurrent: () => closeDialog(activeIndex),
            isOpen,
            activeIndex,
            totalDialogs
        }), [activeIndex, totalDialogs, isOpen]);

        useEffect(() => {
            const htmlElement = document.documentElement;
            if (isOpen) {
                htmlElement.style.overflow = 'hidden';
                setShouldAnimate(true);
            } else {
                htmlElement.style.overflow = '';
            }

            onOpenChange?.(isOpen);

            return () => {
                htmlElement.style.overflow = '';
            };
        }, [isOpen, onOpenChange]);

        return (
            <DialogStackContext.Provider
                value={{
                    activeIndex,
                    setActiveIndex,
                    totalDialogs,
                    setTotalDialogs,
                    isOpen,
                    setIsOpen,
                    clickable,
                    shouldAnimate,
                    setShouldAnimate,
                    closeDialog,
                }}
            >
                <div className={className} {...props}>
                    {children}
                </div>
            </DialogStackContext.Provider>
        );
    }
);

DialogStack.displayName = 'DialogStack';

export const DialogStackTrigger = ({
                                       children,
                                       className,
                                       onClick,
                                       asChild,
                                       ...props
                                   }: ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) => {
    const context = useContext(DialogStackContext);

    if (!context) {
        throw new Error('DialogStackTrigger must be used within a DialogStack');
    }

    const handleClick: MouseEventHandler<HTMLButtonElement> = (e) => {
        context.setIsOpen(true);
        onClick?.(e);
    };

    if (asChild && isValidElement<{ onClick?: MouseEventHandler, className?: string }>(children)) {
        return React.cloneElement(children, {
            onClick: handleClick,
            className: cn(className, children.props.className),
            ...props,
        });
    }

    return (
        <button
            onClick={handleClick}
            className={cn(
                'inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium text-sm',
                'ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
                'bg-primary text-primary-foreground hover:bg-primary/90',
                'h-10 px-4 py-2',
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
};

export const DialogStackOverlay = ({
                                       className,
                                       ...props
                                   }: HTMLAttributes<HTMLDivElement>) => {
    const context = useContext(DialogStackContext);

    if (!context) {
        throw new Error('DialogStackOverlay must be used within a DialogStack');
    }

    if (!context.isOpen) {
        return null;
    }

    return (
        // biome-ignore lint/nursery/noStaticElementInteractions: "This is a clickable overlay"
        <div
            className={cn(
                'fixed inset-0 z-[1001] bg-black/80 backdrop-blur-sm',
                'data-[state=closed]:animate-out data-[state=open]:animate-in',
                'data-[state=closed]:fade-out-0 slide-in-from-right-1/2 data-[state=open]:fade-in-0',
                className
            )}
            onClick={() => {
                if (context.activeIndex === 0) {
                    context.setIsOpen(false)
                } else {
                    context.setActiveIndex(context.activeIndex - 1);
                }
            }}
            {...props}
        />
    );
};

export const DialogStackBody = ({
                                    children,
                                    className,
                                    ...props
                                }: HTMLAttributes<HTMLDivElement> & {
    children:
        | ReactElement<DialogStackChildProps>[]
        | ReactElement<DialogStackChildProps>;
}) => {
    const context = useContext(DialogStackContext);
    const childCount = Children.count(children);
    const [totalDialogs, setTotalDialogs] = useState(childCount);

    useEffect(() => {
        setTotalDialogs(childCount);
    }, [childCount]);

    if (!context) {
        throw new Error('DialogStackBody must be used within a DialogStack');
    }

    if (!context.isOpen) {
        return null;
    }

    return (
        <DialogStackContext.Provider
            value={{
                ...context,
                totalDialogs,
                setTotalDialogs,
            }}
        >
            <Portal.Root>
                <div
                    className={cn(
                        'pointer-events-none fixed z-[1002] w-full max-w-full md:max-w-[67%] right-0 top-0 md:top-[1vh]',
                        className
                    )}
                    {...props}
                >
                    {Children.map(children, (child, index) =>
                        isValidElement<DialogStackChildProps>(child)
                            ? cloneElement(child, {index})
                            : child
                    )}
                </div>
            </Portal.Root>
        </DialogStackContext.Provider>
    );
};

export const DialogStackContent = ({
                                       children,
                                       className,
                                       index = 0,
                                       offset = 20,
                                       ...props
                                   }: HTMLAttributes<HTMLDivElement> & {
    index?: number;
    offset?: number;
}) => {
    const context = useContext(DialogStackContext);
    const [isLongPressing, setIsLongPressing] = useState(false);
    const longPressTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressFiredRef = React.useRef(false);

    if (!context) {
        throw new Error('DialogStackContent must be used within a DialogStack');
    }

    if (!context.isOpen) {
        return null;
    }

    const closeAll = () => {
        context.setIsOpen(false);
        context.setActiveIndex(0);
    };

    const handleClose = () => {
        if (longPressFiredRef.current) {
            longPressFiredRef.current = false;
            return;
        }
        context.closeDialog(index);
    };

    const startLongPress = () => {
        longPressFiredRef.current = false;
        setIsLongPressing(true);
        longPressTimerRef.current = setTimeout(() => {
            longPressFiredRef.current = true;
            setIsLongPressing(false);
            closeAll();
        }, 600);
    };

    const cancelLongPress = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        setIsLongPressing(false);
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (context.clickable && context.activeIndex > index) {
            context.setActiveIndex(index ?? 0);
        }
    };

    const distanceFromActive = index - context.activeIndex;
    const translateX =
        distanceFromActive < 0
            ? `-${Math.abs(distanceFromActive) * offset}px`
            : `0`;

    const showAnimation = index === 0 && context.activeIndex === 0 && context.shouldAnimate;

    useEffect(() => {
        if (showAnimation) {
            const timer = setTimeout(() => {
                context.setShouldAnimate(false);
            }, 200);

            return () => clearTimeout(timer);
        }
    }, [showAnimation]);

    return (
        <div
            onClick={handleClick}
            className={cn(
                'h-[100vh] md:h-[98vh] w-full md:rounded-l-md border bg-background shadow-lg md:transition-all duration-200',
                showAnimation && 'animate-in slide-in-from-right-1/2',
                distanceFromActive < 0 && 'brightness-75 blur-[2px]',
                className
            )}
            style={{
                top: 0,
                marginLeft: `${translateX}`,
                marginTop: `${window.innerWidth > 768 ? Math.abs(distanceFromActive) * 10 : 0}px`,
                width: distanceFromActive < 0
                    ? `calc(100% + ${Math.abs(distanceFromActive) * offset}px)`
                    : '100%',
                zIndex: distanceFromActive < 0 ? 50 - Math.abs(context.activeIndex - (index ?? 0)) : 1002,
                position: distanceFromActive ? 'absolute' : 'relative',
                opacity: distanceFromActive > 0 ? 0 : 1,
                pointerEvents: distanceFromActive > 0 ? 'none' : 'auto',
                cursor:
                    context.clickable && context.activeIndex > index
                        ? 'pointer'
                        : 'default',
            }}
            {...props}
        >
            <div
                className={cn(
                    'h-full w-full overflow-y-auto p-6 transition-all duration-200',
                    context.activeIndex !== index &&
                    'pointer-events-none select-none'
                )}
            >
                {children}
            </div>
            {context.activeIndex === index && (
                <Portal.Root>
                    <Button
                        variant="ghost"
                        className={cn(
                            'fixed z-[1100] top-4 right-4 p-1 size-8 transition-all',
                            isLongPressing && 'bg-destructive/20 scale-110'
                        )}
                        onClick={handleClose}
                        onPointerDown={startLongPress}
                        onPointerUp={cancelLongPress}
                        onPointerLeave={cancelLongPress}
                        onPointerCancel={cancelLongPress}
                        aria-label="Close"
                        title={context.totalDialogs > 1 ? 'Click to close, hold to close all' : 'Close'}
                    >
                        <XIcon/>
                    </Button>
                </Portal.Root>
            )}
        </div>
    );
};

export const DialogStackTitle = ({
                                     children,
                                     className,
                                     ...props
                                 }: HTMLAttributes<HTMLHeadingElement>) => (
    <h2
        className={cn(
            'font-semibold text-lg leading-none tracking-tight',
            className
        )}
        {...props}
    >
        {children}
    </h2>
);

export const DialogStackDescription = ({
                                           children,
                                           className,
                                           ...props
                                       }: HTMLAttributes<HTMLParagraphElement>) => (
    <p className={cn('text-muted-foreground text-sm', className)} {...props}>
        {children}
    </p>
);

export const DialogStackHeader = ({
                                      className,
                                      ...props
                                  }: HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            'flex flex-col space-y-1.5 text-center sm:text-left',
            className
        )}
        {...props}
    />
);

export const DialogStackFooter = ({
                                      children,
                                      className,
                                      ...props
                                  }: HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn('flex items-center justify-end space-x-2 pt-4', className)}
        {...props}
    >
        {children}
    </div>
);

export const DialogStackNext = ({
                                    children,
                                    className,
                                    asChild,
                                    ...props
                                }: {
    asChild?: boolean;
} & HTMLAttributes<HTMLButtonElement>) => {
    const context = useContext(DialogStackContext);

    if (!context) {
        throw new Error('DialogStackNext must be used within a DialogStack');
    }

    const handleNext = () => {
        if (context.activeIndex < context.totalDialogs - 1) {
            context.setActiveIndex(context.activeIndex + 1);
        }
    };

    if (asChild && isValidElement<{ onClick?: MouseEventHandler, className?: string }>(children)) {
        return React.cloneElement(children, {
            onClick: handleNext,
            className: cn(className, children.props.className),
            ...props,
        });
    }

    return (
        <button
            type="button"
            onClick={handleNext}
            className={cn(
                'inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
                className
            )}
            disabled={context.activeIndex >= context.totalDialogs - 1}
            {...props}
        >
            {children || 'Next'}
        </button>
    );
};

export const DialogStackPrevious = ({
                                        children,
                                        className,
                                        asChild,
                                        ...props
                                    }: {
    children?: ReactNode;
    className?: string;
    asChild?: boolean;
} & HTMLAttributes<HTMLButtonElement>) => {
    const context = useContext(DialogStackContext);

    if (!context) {
        throw new Error('DialogStackPrevious must be used within a DialogStack');
    }

    const handlePrevious = () => {
        if (context.activeIndex > 0) {
            context.setActiveIndex(context.activeIndex - 1);
        }
    };

    if (asChild && isValidElement<{ onClick?: MouseEventHandler, className?: string }>(children)) {
        return React.cloneElement(children, {
            onClick: handlePrevious,
            className: cn(className, children.props.className),
            ...props,
        });
    }

    return (
        <button
            type="button"
            onClick={handlePrevious}
            className={cn(
                'inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
                className
            )}
            disabled={context.activeIndex <= 0}
            {...props}
        >
            {children || 'Previous'}
        </button>
    );
};
