import { useRef, useState, createContext, useCallback, useEffect } from 'react';
import {
    closestCenter,
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    KeyboardSensor,
    useDndContext,
    MeasuringStrategy,
    DropAnimation,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import type {
    DragStartEvent,
    DragEndEvent,
    MeasuringConfiguration,
    UniqueIdentifier,
} from '@dnd-kit/core';
import {
    arrayMove,
    useSortable,
    SortableContext,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS, isKeyboardEvent } from '@dnd-kit/utilities';

import { Item, Layout, Position } from './Item.tsx';
import type { Props as PageProps } from './Item.tsx';
import styles from './Manager.module.css';
import pageStyles from './Item.module.css';
import { cn } from "@/lib/utils.ts";
import { Button } from "@/components/ui/button.tsx";
import { Grid2x2Plus } from "lucide-react";
import { DialogStackHandle } from "@/components/ui/dialog-stack.tsx";
import MediaDialogStack from "@/components/media-manager/components/MediaDialogStack.tsx";
import { Media } from "@/types";
import axios from "axios";
import DropZone from "@/components/media-manager/components/DropZone.tsx";

interface Props {
    layout: Layout;
    config: {
        id: string
        group: string
        accept: string[]
        initTab?: string
        onlyView?: boolean
    }
    type: string
    name: string
    onChange?: (media: Media[]) => void
    value?: Media[]
}

type MediaManagerContextType = {
    uploadUrl: string
    config?: Record<string, any>
    initTab: string
    managerId: string
    group: string
    accept: string[]
    messages: Record<string, string>
    addMedia: (media: Media) => void
    removeMedia: (media: Media) => void
    imageUrl: (media: Media) => string
    checkMedia: (media: Media) => boolean
    onChange?: (media: Media[]) => void
}

export const MediaManagerContext = createContext<MediaManagerContextType>({
    uploadUrl: '',
    config: {},
    initTab: '',
    managerId: '',
    group: '',
    accept: [],
    messages: {},
    addMedia: (_media) => console.warn('addMedia not implemented'),
    removeMedia: (_media: Media) => console.warn('removeMedia not implemented'),
    imageUrl: (_media: Media) => {
        return ''
    },
    checkMedia: (_media: Media) => {
        return false
    },
});

const measuring: MeasuringConfiguration = {
    droppable: {
        strategy: MeasuringStrategy.Always,
    },
};

const dropAnimation: DropAnimation = {
    keyframes({ transform }) {
        return [
            { transform: CSS.Transform.toString(transform.initial) },
            {
                transform: CSS.Transform.toString({
                    scaleX: 0.98,
                    scaleY: 0.98,
                    x: transform.final.x - 10,
                    y: transform.final.y - 10,
                }),
            },
        ];
    },
    sideEffects: defaultDropAnimationSideEffects({
        className: {
            active: pageStyles.active,
        },
    }),
};

const MediaManager = ({ layout, config, type, onChange, value, name }: Props) => {
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const [items, setItems] = useState<Media[]>(value || []);
    const activeIndex = activeId !== null ? items.findIndex(item => item.id === activeId) : -1;
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );


    const [messages, setMessages] = useState<Record<string, string>>({})

    const uploadUrl = `${window.routePrefix}/media-manager-uploader/${config.id ? config.id : 'default'}`;

    useEffect(() => {
        if (value !== undefined && value !== null) {
            setItems(prevItems => {
                // Only update if value actually changed
                if (prevItems.length !== value.length || 
                    prevItems.some((item, i) => item.id !== value[i]?.id)) {
                    return value;
                }
                return prevItems;
            });
        }
    }, [value]);


    useEffect(() => {
        const initLocales = async () => {
            try {
                // Use GET request instead of POST to get data
                let res = await axios.get(uploadUrl, {
                    params: {
                        _method: 'getLocales'
                    }
                });
                setMessages(res.data.data);
            } catch (error) {
                console.error('Failed to load locales:', error);
            }
        };
        initLocales();
    }, []);

    const addMediaWithCallback = useCallback((newMedia: Media) => {
        setItems((prev) => {
            const newItems = [...prev, newMedia];
            if (onChange) onChange(newItems);
            return newItems
        })

    }, [onChange]);

    const removeMediaWithCallback = useCallback((media: Media) => {
        setItems(prev => {
            const newItems = prev.filter(item => item.id !== media.id);
            if (onChange) onChange(newItems);
            return newItems;
        });
    }, [onChange]);

    const contextValue: MediaManagerContextType = {
        uploadUrl: uploadUrl,
        managerId: config.id,
        group: config.group,
        accept: config.accept,
        messages: messages,
        initTab: config.initTab ?? 'tile-all',
        config: {},
        addMedia: (media) => addMediaWithCallback(media),
        removeMedia: (media) => removeMediaWithCallback(media),
        imageUrl: (media: Media) => {
            if (media.mimeType && media.mimeType.split("/")[0] === 'image') {
                return `${window.routePrefix}/get-thumbs?id=${media.id}&managerId=${config.id}`;
            } else {
                const fileName = media.url.split(/[#?]/)[0];
                const parts = fileName.split(".");
                const extension = parts.pop()?.toLowerCase().trim();
                return `${window.routePrefix}/fileicons/${extension}.svg`;
            }
        },
        checkMedia: (media: Media) => {
            return items.some((e) => e.id === media.id);
        }
    };

    const dialogRef = useRef<DialogStackHandle>(null);

    const activeMedia = activeId ? items.find(item => item.id === activeId) : null;

    const handleDragStart = ({ active }: DragStartEvent) => {
        setActiveId(active.id);
    }

    const handleDragCancel = () => {
        setActiveId(null);
    }

    const handleDragEnd = ({ over }: DragEndEvent) => {
        if (!over || activeIndex === -1) {
            setActiveId(null);
            return;
        }

        const overIndex = items.findIndex(item => item.id === over.id);
        if (overIndex !== -1 && activeIndex !== overIndex) {
            setItems(prev => {
                const newItems = arrayMove(prev, activeIndex, overIndex);
                if (onChange) {
                    setTimeout(() => onChange(newItems), 100);
                }
                return newItems;
            });
        }

        setActiveId(null);
    }

    const openFile = (media: Media) => {
        const url = window.bindPublic ? `/public${media.url}` : media.url;
        window.open(url, "_blank")?.focus();
    }
    return (
        <MediaManagerContext.Provider value={contextValue}>
            {type === 'single-file' ? (
                items.length > 0 ? (
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                            {!config.onlyView &&
                                <Button variant="destructive"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        e.preventDefault()
                                        setItems(prev => {
                                            const newItems = prev.filter(item => item.id !== items[0].id);
                                            if (onChange) {
                                                setTimeout(() => {
                                                    onChange(newItems)
                                                }, 100)
                                            }
                                            return newItems;
                                        });
                                    }}>{messages["Delete"]}</Button>
                            }
                            <Button variant="default" onClick={(e) => {
                                e.stopPropagation()
                                e.preventDefault()
                                openFile(items[0])
                            }}>{messages["View"]}</Button>
                        </div>
                        <div className="relative size-[150px] rounded-[5px] overflow-hidden">
                            <img src={contextValue.imageUrl(items[0])}
                                className="absolute top-0 left-0 w-full h-full object-cover" />
                            {!items[0].mimeType?.startsWith('image/') && (
                                <div
                                    className="text-center absolute inset-x-0 bottom-0 break-words text-white text-sm font-medium bg-black/75 h-[40%] rounded-b-[5px] p-2">
                                    {items[0].filename}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <DropZone
                        key={`single-dropzone-${name}`}
                        messages={messages}
                        name={name}
                        callback={(media) => {
                            addMediaWithCallback(media)
                        }}
                    />
                )
            ) : (
                <div>
                    <Button size="icon" variant="ghost" onClick={(e) => {
                        e.preventDefault()
                        dialogRef.current?.open()
                    }}>
                        <Grid2x2Plus className="size-7 text-chart-2" />
                    </Button>
                    <DndContext
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragCancel={handleDragCancel}
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        measuring={measuring}
                    >
                        <SortableContext items={items.map(item => item.id)}>
                            <ul className={cn(styles.Pages, styles[layout])}>
                                {items.map((media, index) => (
                                    <SortablePage
                                        id={media.id}
                                        key={media.id}
                                        index={index}
                                        url={contextValue.imageUrl(media)}
                                        fileName={media.filename ?? ''}
                                        mimeType={media.mimeType ?? ''}
                                        layout={layout}
                                        activeIndex={activeIndex}
                                        onRemove={() => {
                                            setItems(prev => {
                                                const newItems = prev.filter(item => item.id !== media.id);
                                                if (onChange) {
                                                    setTimeout(() => {
                                                        onChange(newItems)
                                                    }, 100)
                                                }
                                                return newItems;
                                            });
                                        }}
                                    />
                                ))}
                            </ul>
                        </SortableContext>
                        <DragOverlay dropAnimation={dropAnimation}>
                            {activeId != null ? (
                                <PageOverlay
                                    id={activeId}
                                    layout={layout}
                                    items={items}
                                    url={activeMedia ? contextValue.imageUrl(activeMedia) : ''}
                                    fileName={activeMedia?.filename ? activeMedia.filename ?? '' : ''}
                                    mimeType={activeMedia?.mimeType ? activeMedia.mimeType ?? '' : ''}
                                />
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                    <MediaDialogStack dialogRef={dialogRef} name={name} />
                </div>
            )}
        </MediaManagerContext.Provider>
    );
}

function PageOverlay({
    id,
    items,
    ...props
}: Omit<PageProps, 'index'> & { items: Media[] }) {
    const { activatorEvent, over } = useDndContext();
    const isKeyboardSorting = isKeyboardEvent(activatorEvent);

    const activeIndex = items.findIndex(item => item.id === id);

    const overIndex = over?.id ? items.findIndex(item => item.id === over.id) : -1;

    return (
        <Item
            id={id}
            {...props}
            clone
            insertPosition={
                isKeyboardSorting && overIndex !== activeIndex
                    ? overIndex > activeIndex
                        ? Position.After
                        : Position.Before
                    : undefined
            }
        />
    );
}

function SortablePage({
    id,
    index,
    activeIndex,
    ...props
}: PageProps & { index: number; activeIndex: number }) {
    const {
        attributes,
        listeners,
        isDragging,
        isSorting,
        over,
        setNodeRef,
        transform,
        transition,
    } = useSortable({
        id,
        animateLayoutChanges: always,
        data: {
            index,
        },
    });

    return (
        <Item
            ref={setNodeRef}
            id={id}
            index={index}
            active={isDragging}
            style={{
                transition,
                transform: isSorting ? undefined : CSS.Translate.toString(transform),
            }}
            insertPosition={
                over?.id === id
                    ? index > activeIndex
                        ? Position.After
                        : Position.Before
                    : undefined
            }
            {...props}
            {...attributes}
            {...listeners}
        />
    );
}

function always() {
    return true;
}

export default MediaManager;