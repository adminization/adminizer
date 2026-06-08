import React from "react";
import {
    DialogStack,
    DialogStackBody,
    DialogStackContent,
    DialogStackOverlay
} from "@/components/ui/dialog-stack.tsx";
import {LoaderCircle} from "lucide-react";
import AddForm from "@/components/add-form.tsx";
import ModelLinkAdd from "@/components/catalog/model-link-add.tsx";
import SelectCatalogItem from "@/components/catalog/select-catalog-item.tsx";
import {CatalogItem} from "@/types";

interface CatalogDialogStackProps {
    dialogRef: React.RefObject<any>;
    PopupEvent: string | null;
    firstRender: boolean;
    secondRender: boolean;
    popupType: string;
    addProps: any;
    editModel: (record: any, targetBlank?: boolean) => Promise<void>;
    popUpTargetBlank: boolean;
    popUpVisible: boolean;
    messages: Record<string, string>;
    DynamicComponent: React.ReactElement | null;
    DynamicActionComponent: React.ReactElement | null;
    reloadCatalog: (item?: any) => Promise<void>;
    itemType: string | null;
    parentid: string | number;
    addItemProps: any;
    getAddModelJSON: (model: string) => Promise<void>;
    addModel: (record: any, targetBlank?: boolean) => Promise<void>;
    items: CatalogItem[];
    selectCatalogItem: (type: string) => Promise<void>;
}

const CatalogDialogStack: React.FC<CatalogDialogStackProps> = (
    {
        dialogRef,
        PopupEvent,
        firstRender,
        secondRender,
        popupType,
        addProps,
        editModel,
        popUpTargetBlank,
        popUpVisible,
        messages,
        DynamicComponent,
        DynamicActionComponent,
        reloadCatalog,
        itemType,
        parentid,
        addItemProps,
        getAddModelJSON,
        addModel,
        items,
        selectCatalogItem
    }) => {
    return (
        <DialogStack ref={dialogRef}>
            <DialogStackOverlay/>
            <DialogStackBody>
                <DialogStackContent>
                    <div className="relative h-full">
                        {PopupEvent === 'create' && (
                            <>
                                {firstRender && <LoaderCircle
                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-8 animate-spin"/>}
                                <SelectCatalogItem items={items} onSelect={selectCatalogItem}/>
                            </>
                        )}
                        {PopupEvent === 'update' &&
                            <div className="h-full overflow-y-auto mt-5">
                                {!firstRender ? (
                                    <>
                                        {popupType === 'model.link' &&
                                            <AddForm page={addProps}
                                                     catalog={true}
                                                     callback={editModel}
                                                     openNewWindowLabel={messages["Open in a new window"]}
                                                     visibleLable={messages["Visible"]}
                                                     openNewWindow={popUpTargetBlank}
                                                     DnavVisible={popUpVisible}
                                            />
                                        }
                                        {popupType === 'model' &&
                                            <AddForm page={addProps}
                                                     catalog={true}
                                                     callback={editModel}
                                                     openNewWindowLabel={messages["Open in a new window"]}
                                                     visibleLable={messages["Visible"]}
                                                     openNewWindow={popUpTargetBlank}
                                                     DnavVisible={popUpVisible}
                                            />
                                        }
                                        {popupType === 'component' &&
                                            <>
                                                {DynamicComponent}
                                            </>
                                        }
                                    </>
                                ) : (
                                    <LoaderCircle
                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-8 animate-spin"/>
                                )}
                            </div>
                        }
                        {PopupEvent === 'action' &&
                            <>
                                {DynamicActionComponent}
                            </>
                        }
                    </div>
                </DialogStackContent>

                <DialogStackContent>
                    <div className="relative h-full">
                        {secondRender && <LoaderCircle
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-8 animate-spin"/>
                        }
                        {PopupEvent === 'create' &&
                            <>
                                {popupType === 'model.link' &&
                                    <ModelLinkAdd
                                        add={getAddModelJSON}
                                        callback={() => {
                                            dialogRef.current?.close()
                                            reloadCatalog(null)
                                        }}
                                        type={itemType ?? ''}
                                        parentId={parentid}
                                        {...addItemProps}
                                    />
                                }
                                {popupType === 'model' &&
                                    <div className="h-full overflow-y-auto mt-5">
                                        <AddForm page={addProps}
                                                 catalog={true}
                                                 callback={addModel}
                                                 openNewWindowLabel={messages["Open in a new window"]}
                                                 visibleLable={messages["Visible"]}
                                        />
                                    </div>
                                }
                                {popupType === 'component' &&
                                    <>
                                        {DynamicComponent}
                                    </>
                                }
                            </>
                        }
                    </div>
                </DialogStackContent>

                <DialogStackContent>
                    <div className="h-full overflow-y-auto mt-5">
                        <AddForm page={addProps}
                                 catalog={true}
                                 callback={addModel}
                                 openNewWindowLabel={messages["Open in a new window"]}
                                 visibleLable={messages["Visible"]}
                        />
                    </div>
                </DialogStackContent>
            </DialogStackBody>
        </DialogStack>
    );
};

export default CatalogDialogStack;
