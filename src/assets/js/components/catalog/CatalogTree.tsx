import React, {useCallback, useEffect, useRef, useState} from "react";
import {router} from '@inertiajs/react'
import {
    Tree,
    getBackendOptions,
    MultiBackend,
    NodeModel,
    TreeMethods,
    DragLayerMonitorProps, DropOptions
} from "@minoru/react-dnd-treeview";
import {DndProvider} from "react-dnd";
import axios from "axios";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Pencil, Plus, Ban, LoaderCircle, BetweenHorizontalStart} from "lucide-react";
import {Input} from "@/components/ui/input.tsx";
import {
    Catalog,
    CatalogItem,
    CustomCatalogData,
    DynamicComponent,
    DynamicActionComponent,
    AddCatalogProps,
    CatalogActions
} from "@/types";
import {Skeleton} from "@/components/ui/skeleton.tsx";
import CatalogNode from "@/components/catalog/catalogUI/CatalogNode.tsx";
import CatalogDragPreview from "@/components/catalog/catalogUI/CatalogDragPreview.tsx";
import styles from "@/components/catalog/catalogUI/Catalog.module.css";
import {Placeholder} from "@/components/catalog/catalogUI/CatalogPlaceholder.tsx";
import {CatalogContext} from "@/components/catalog/catalogUI/CatalogContext.ts";
import DeleteModal from "@/components/modals/del-modal.tsx";
import {debounce} from 'lodash-es';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import CatalogDialogStack from "@/components/catalog/CatalogDialogStack.tsx";
import {DialogStackHandle} from "@/components/ui/dialog-stack.tsx";
import MaterialIcon from "@/components/material-icon.tsx";
import {Toaster} from "@/components/ui/sonner.tsx";
import {toast} from "sonner";
import {DropdownMenu} from "@radix-ui/react-dropdown-menu";
import {DropdownMenuContent, DropdownMenuGroup, DropdownMenuTrigger} from "@/components/ui/dropdown-menu.tsx";

const CatalogTree = () => {
    const treeRef = useRef<TreeMethods>(null);

    const deleteModalRef = useRef<HTMLButtonElement>(null);

    const [treeData, setTreeData] = useState<NodeModel<CustomCatalogData>[]>([]);
    const [selectedNodes, setSelectedNodes] = useState<NodeModel<CustomCatalogData>[]>([]);

    const [catalog, setCatalog] = useState<Catalog>({
        catalogId: "",
        catalogName: "",
        catalogSlug: "",
        idList: [],
        nodes: [],
        movingGroupsRootOnly: false
    })

    const [items, setItems] = useState<CatalogItem[]>([])
    const [messages, setMessages] = useState<Record<string, string>>({})
    const [isLoading, setIsLoading] = useState(false)
    const dialogRef = useRef<DialogStackHandle>(null);
    const [addItemProps, setAddItemProps] = useState({items: [], model: "", labels: {}})
    const [addLinksGroupProps, setAddLinksGroupProps] = useState({items: [], labels: {}})
    const [popupType, setPopupType] = useState<string>('')
    const [loadingNodeId, setLoadingNodeId] = useState<string | number | null>(null)
    const [itemType, setItemType] = useState<string | null>(null)
    const [PopupEvent, setPopupEvent] = useState<string | null>(null)
    const [parentid, setParentId] = useState<string | number>(0)

    const [popUpTargetBlank, setPopUpTargetBlank] = useState<boolean>(false)
    const [popUpVisible, setPopUpVisible] = useState<boolean>(false)
    const [isNavigation, setIsNavigation] = useState<boolean>(false)

    const [DynamicComponent, setDynamicComponent] = useState<React.ReactElement | null>(null);
    const [DynamicActionComponent, setDynamicActionComponent] = useState<React.ReactElement | null>(null);

    const [actionsTools, setActionsTools] = useState<CatalogActions[]>([]);
    const [actionsContext, setActionsContext] = useState<CatalogActions[]>([]);
    const [actionLoading, setActionLoading] = useState<boolean>(false)
    const [searhing, setSearching] = useState<boolean>(false)
    const [addProps, setAddProps] = useState<AddCatalogProps>({
        props: {
            actions: [],
            btnBack: {link: "", title: ""},
            btnSave: {title: ""},
            edit: false,
            fields: [],
            notFound: "",
            postLink: "",
            search: "",
            view: false,
        }
    })
    const [firstRender, setFirstRender] = useState(false)

    const [secondRender, setSecondRender] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            const res = await axios.post('', {
                _method: 'getCatalog'
            });
            const {catalog: resCatalog, items, toolsActions} = res.data;
            setCatalog(resCatalog);
            setItems(items);
            setTreeData(resCatalog.nodes)
            setActionsTools(toolsActions)
            setIsNavigation(resCatalog.catalogSlug === "navigation");
        };

        const initLocales = async () => {
            let res = await axios.post('', {
                _method: 'getLocales'
            });
            setMessages(res.data.data);
        };

        const initCatalog = async () => {
            try {
                setIsLoading(true);
                await initLocales();
                await fetchData();
            } catch (error) {
                console.error('Error initializing catalog:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initCatalog()
    }, []);

    useEffect(() => {
        if (catalog.idList.length === 1 && !catalog.catalogId && catalog.catalogSlug) {
            router.get(`${window.routePrefix}/catalog/${catalog.catalogSlug}/${catalog.idList[0]}`);
        }
    }, [catalog.catalogId, catalog.catalogSlug, catalog.idList]);

    const handleSelect = (node: NodeModel<CustomCatalogData>) => {
        const item = selectedNodes.find((n) => n.id === node.id);

        if (!item) {
            setParentId(node.id)
            setSelectedNodes([...selectedNodes, node]);
        } else {
            setParentId(0)
            setSelectedNodes(selectedNodes.filter((n) => n.id !== node.id));
        }
    };

    const handleClear = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            setSelectedNodes([]);
        }
    };

    const handleDrop = useCallback(async (
        newTree: NodeModel<CustomCatalogData>[],
        {dragSourceId, dropTargetId}: DropOptions<CustomCatalogData>
    ) => {
        try {
            // find dragged node
            const draggedNode = newTree.find(node => node.id === dragSourceId);

            // find new parent
            const newParentId = dropTargetId || 0;


            const requestData = {
                data: {
                    reqNode: [{
                        id: draggedNode?.id,
                        parent: newParentId,
                        text: draggedNode?.text,
                        data: draggedNode?.data
                    }],
                    reqParent: {
                        id: newParentId,
                        children: newTree.filter(node => node.parent === newParentId).map(node => ({
                            id: node.id,
                            text: node.text,
                            data: node.data
                        })),
                        data: newParentId === 0
                            ? {id: 0}
                            : newTree.find(node => node.id === newParentId)?.data
                    },
                },
                _method: 'updateTree'
            };
            setTreeData(newTree);

            await axios.put('', requestData);

        } catch (error) {
            console.error('Error updating tree:', error);
        }
    }, [treeData]);

    const handleToggle = useCallback(async (id: string, isOpen: boolean) => {

        // If the node closes, we do nothing
        if (!isOpen) return;

        try {
            setLoadingNodeId(id);
            const node = treeData.find(node => node.id === id);
            const res = await axios.post('', {data: node, _method: 'getChilds'});
            const newChildNodes = res.data.data;

            setTreeData(prevTree => {
                // Create a Set from the IDs of existing nodes for quick verification
                const existingNodeIds = new Set(prevTree.map(n => n.id));

                // We filter new nodes, leaving only those that do not exist yet
                const uniqueNewNodes = newChildNodes.filter(
                    (child: { id: string | number; }) => !existingNodeIds.has(child.id)
                );

                // If all new nodes already exist, do not update the state
                if (uniqueNewNodes.length === 0) return prevTree;

                // Merging trees, adding only unique nodes
                return [...prevTree, ...uniqueNewNodes];
            });

        } catch (error) {
            console.error('Error loading child nodes:', error);
        } finally {
            setLoadingNodeId(null);
        }
    }, [treeData]);

    const updateCatalog = useCallback(async () => {
        try {
            const res = await axios.post('', {
                _method: 'getCatalog'
            });
            const {catalog: resCatalog} = res.data;

            setTreeData(prevTree => {
                // Create a Map of existing nodes for quick search
                const existingNodesMap = new Map(prevTree.map(node => [node.id, node]));
                const newNodes = resCatalog.nodes;

                // We update the tree: add new nodes and update existing ones if the text has changed
                const updatedTree = prevTree.map(node => {
                    const newNode = newNodes.find((n: NodeModel<CustomCatalogData>) => n.id === node.id);
                    return newNode && newNode.text !== node.text ? newNode : node;
                });

                // Adding new nodes that don’t exist yet
                const nodesToAdd = newNodes.filter(
                    (newNode: NodeModel<CustomCatalogData>) =>
                        !existingNodesMap.has(newNode.id) ||
                        (existingNodesMap.get(newNode.id)?.text !== newNode.text)
                );

                // If there is nothing to add and nothing to update, return the previous state
                if (nodesToAdd.length === 0 &&
                    updatedTree.length === prevTree.length &&
                    updatedTree.every((node, i) => node === prevTree[i])) {
                    return prevTree;
                }

                // We combine updated and new nodes
                return [...updatedTree, ...nodesToAdd];
            });
        } catch (error) {
            console.error('Error reloading catalog:', error);
        }
    }, [])

    const reloadCatalog = useCallback(async (item?: any) => {
        if (item) { // If the element is edited
            // Updating a specific node in treeData
            setTreeData(prevTree => {
                return prevTree.map(node => {
                    if (node.id === item.id) {
                        return {
                            ...node,
                            text: item.name, // Updating the text from the server response
                            data: {
                                ...node.data,
                                ...item // Update all other data from the response
                            }
                        };
                    }
                    return node;
                });
            });
        } else {
            if (selectedNodes[0]?.droppable) {
                treeRef.current?.open(selectedNodes[0].id);
                await handleToggle(selectedNodes[0].id as string, true);
            } else {
                await updateCatalog();
            }
        }
    }, [selectedNodes, handleToggle, setTreeData]);

    const selectCatalogItem = useCallback(async (type: string) => {
        setItemType(type)
        setFirstRender(true)
        const res = await axios.post('', {type: type, _method: 'getAddTemplate'})
        if (res.data.type === 'model') {
            // For 'model', directly get the add form
            setPopupType('model')
            await getAddModelJSON(res.data.data.model)
        } else {
            setPopUpData(res.data)
            dialogRef.current?.next()
        }
        setFirstRender(false)
    }, [parentid])

    const initUpdateItem = useCallback(async () => {
        try {
            setFirstRender(true)
            const res = await axios.post('', {
                type: selectedNodes[0]?.data?.type,
                modelId: selectedNodes[0]?.data?.modelId ?? null,
                id: selectedNodes[0]?.data?.id,
                _method: 'getEditTemplate'
            })
            if (res.data) {
                if (res.data.type.includes('navigation')) {
                    switch (res.data.type) {
                        case 'navigation.group':
                            setAddLinksGroupProps(res.data.data)
                            setPopupType('navigation.group')
                            setFirstRender(false)
                            break
                        case 'navigation.link':
                            setAddLinksGroupProps(res.data.data)
                            setPopupType('navigation.link')
                            setFirstRender(false)
                            break
                    }
                } else {
                    switch (res.data.type) {
                        case 'model.link':
                            const item = res.data.data.item
                            const resEdit = await axios.get(`${window.routePrefix}/model/${res.data.data.model}/edit/${item.modelId}?without_layout=true`)
                            setAddProps(resEdit.data)
                            setPopUpTargetBlank(item.targetBlank)
                            setPopUpVisible(item.visible)
                            setPopupType('model.link')
                            setFirstRender(false)
                            break
                        case 'model':
                            const itemModel = res.data.data.item
                            const resEditModel = await axios.get(`${window.routePrefix}/model/${res.data.data.model}/edit/${itemModel.modelId}?without_layout=true`)
                            setAddProps(resEditModel.data)
                            setPopUpTargetBlank(itemModel.targetBlank)
                            setPopUpVisible(itemModel.visible)
                            setPopupType('model')
                            setFirstRender(false)
                            break
                        default:
                            const initModule = async () => {
                                const Module = await import(/* @vite-ignore */ res.data.data.path as string);
                                const Component = Module.default as DynamicComponent['default'];
                                setDynamicComponent(<Component
                                    key={`${res.data.data.id}-${res.data.data.item.name}`}
                                    callback={(item: any) => {
                                        dialogRef.current?.close()
                                        reloadCatalog(item)
                                    }}
                                    update={true}
                                    item={res.data.data.item}
                                />);
                            }
                            initModule();
                            setPopupType('component')
                            setFirstRender(false)
                            break
                    }
                }
            }
        } catch (e) {
            console.log(e)
        }
    }, [selectedNodes])

    const deleteItem = useCallback(async () => {
        if (!selectedNodes.length) return;

        try {
            for (const selectedNode of selectedNodes) {
                const res = await axios.delete('', {data: selectedNode});

                if (res.data.data.ok) {
                    // Create a copy of the current treeData for modification
                    let updatedTreeData = [...treeData];

                    // We delete all selected nodes and their descendants
                    const removeNodeAndChildren = (
                        id: string | number,
                        nodes: NodeModel<CustomCatalogData>[]): NodeModel<CustomCatalogData>[] => {

                        // Filter nodes by deleting the current node
                        let result = nodes.filter(node => node.id !== id);

                        // Find all children of the current node
                        const children = nodes.filter(node => node.parent === id);

                        // Recursively removing each child
                        children.forEach(child => {
                            result = removeNodeAndChildren(child.id, result);
                        });

                        return result;
                    };

                    // Apply deletion for each selected node
                    selectedNodes.forEach(selectedNode => {
                        updatedTreeData = removeNodeAndChildren(selectedNode.id, updatedTreeData);
                    });

                    // Update the status
                    setTreeData(updatedTreeData);
                }
            }
        } catch (error) {
            console.error('Error deleting node:', error);
        } finally {
            setSelectedNodes([]);
            setParentId(0)
        }
    }, [selectedNodes, treeData]);

    const setPopUpData = useCallback((data: { type: string, data: any }) => {
        if (data.type.includes('navigation')) {
            switch (data.type) {
                case 'model.link':
                    setAddItemProps(data.data)
                    setPopupType('model.link')
                    break
                case 'navigation.group':
                    setAddLinksGroupProps(data.data)
                    setPopupType('navigation.group')
                    break
                case 'navigation.link':
                    setAddLinksGroupProps(data.data)
                    setPopupType('navigation.link')
                    break

            }
        } else {
            switch (data.type) {
                case 'model.link':
                    setAddItemProps(data.data)
                    setPopupType('model.link')
                    break
                case 'model':
                    setAddItemProps(data.data)
                    setPopupType('model')
                    break
                default:
                    const initModule = async () => {
                        const Module = await import(/* @vite-ignore */ data.data.path as string);
                        const Component = Module.default as DynamicComponent['default'];
                        setDynamicComponent(<Component
                            key={JSON.stringify(new Date())}
                            parentId={parentid}
                            callback={(item: any) => {
                                dialogRef.current?.close()
                                reloadCatalog(item)
                            }}
                        />);
                    }
                    initModule();
                    setPopupType('component')
                    break
            }
        }
    }, [selectedNodes, isNavigation])

    const getAddModelJSON = useCallback(async (model: string) => {
        setSecondRender(true)
        const res = await axios.get(`${window.routePrefix}/model/${model}/add?without_layout=true'`)
        setAddProps(res.data)
        dialogRef.current?.next()
        setSecondRender(false)
    }, [itemType])

    const addModel = async (record: any, targetBlank?: boolean, visible?: boolean) => {
        if (targetBlank) record.targetBlank = targetBlank
        if(visible) record.visible = visible
        try {
            await axios.post('', {
                data: {
                    record: record,
                    parentId: parentid,
                    type: itemType
                },
                _method: 'createItem'
            })
        } catch (e) {
            console.log(e)
        } finally {
            dialogRef.current?.close()
            reloadCatalog()
        }
    }

    const editModel = useCallback(async (record: any, targetBlank?: boolean, visivle?: boolean) => {
        if (targetBlank) record[0].targetBlank = targetBlank;
        if(visivle) record[0].visible = visivle;

        record[0].treeId = selectedNodes[0]?.data?.id;

        try {
            const res = await axios.put('', {
                type: selectedNodes[0]?.data?.type,
                data: {record: record[0]},
                modelId: selectedNodes[0]?.data?.modelId,
                _method: 'updateItem'
            });

            // We update ALL nodes with matching modelId and type
            setTreeData(prevTree => {
                const {modelId, type, name} = res.data.data;

                // If there is no modelId or type, we do not update the tree
                if (modelId === undefined || type === undefined) {
                    console.warn('No modelId or type in response!');
                    return prevTree;
                }
                return prevTree.map(node => {
                    // We check that data exists and modelId + type match
                    if (
                        node.data?.modelId === modelId &&
                        node.data?.type === type
                    ) {
                        return {
                            ...node,
                            text: name, // We take name from the server response
                            data: {
                                ...node.data,
                                ...res.data.data, // Update all data from the response
                                ...{visible: res.data.data.visible ?? false}
                            },
                        };
                    }
                    return node;
                });
            });

        } catch (e) {
            console.error('Error updating model:', e);
        } finally {
            dialogRef.current?.close();
        }
    }, [selectedNodes, setTreeData, treeData]);

    const performSearch = async (s: string) => {
        setSelectedNodes([])
        setSearching(true)
        if (!s.trim()) {
            const res = await axios.post('', {
                _method: 'getCatalog'
            });
            const {catalog: resCatalog} = res.data;
            setTreeData(resCatalog.nodes)

            // We are waiting for two rendering cycles
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (treeRef.current) {
                        treeRef.current.closeAll?.();
                        setSearching(false)
                    }
                });
            });
            return;
        }
        try {
            const res = await axios.post('', {s: s, _method: 'search'})
            setTreeData(res.data.data)

            // We are waiting for two rendering cycles
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (treeRef.current) {
                        treeRef.current.openAll?.();
                        setSearching(false)
                    }
                });
            });
        } catch (error) {
            console.error('Error searching:', error);
        }
    };

    const handleSearch = debounce(performSearch, 500)

    const handleOpenContextMenu = useCallback((open: boolean, node: NodeModel<CustomCatalogData>) => {
        if (open) {
            // Checking whether the current node is selected
            const isNodeSelected = selectedNodes.some(n => n.id === node.id);

            // Reset all selected nodes
            setSelectedNodes([]);

            // If the node has not been selected, select it
            if (!isNodeSelected) {
                handleSelect(node);
                getActionsContext(node)
            }
        }
    }, [])

    const getActionsContext = useCallback(async (node: NodeModel<CustomCatalogData>) => {
        setActionsContext([])
        setActionLoading(true)
        try {
            const res = await axios.post('', {
                items: [node],
                type: 'context',
                _method: 'getActions'
            })
            if (res.data && res?.data?.data?.length) {
                setActionsContext(res.data.data)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setActionLoading(false)
        }
    }, [])

    const initAction = useCallback(async (id: string) => {
        const action = actionsTools.find(e => e.id === id) ?? actionsContext.find(e => e.id === id)
        if (!action) return
        let res = null
        switch (action.type) {
            case 'link':
                try {
                    res = await axios.put('', {actionId: action.id, _method: 'getLink'})
                    if (res.data) window.open(`${res.data.data}`, '_blank')?.focus()
                } catch (e) {
                    console.error(e)
                }
                break
            case 'basic':
                let data = {
                    actionID: action.id,
                    items: selectedNodes,
                    data: ''
                }
                try {
                    toast.warning(messages['Performing an action...'])
                    await axios.put('', {data: data, _method: 'handleAction'})
                } catch (e) {
                    console.error(e)
                } finally {
                    toast.success(messages['Action completed'])
                }
                break
            case 'external':
                try {
                    const res = await axios.put('', {actionId: action.id, _method: 'getPopUpTemplate'})
                    if (res.data) {
                        const initModule = async () => {
                            const Module = await import(/* @vite-ignore */ res.data.data as string);
                            const Component = Module.default as DynamicActionComponent['default'];
                            setDynamicActionComponent(<Component
                                key={JSON.stringify(selectedNodes)}
                                items={selectedNodes}
                                callback={() => {
                                    dialogRef.current?.close()
                                }}
                            />);
                        }
                        initModule();
                        dialogRef.current?.open()
                        setPopupEvent('action')
                    }
                } catch (e) {
                    console.error(e)
                }
                break
            default:
                break
        }
    }, [actionsTools, selectedNodes, actionsContext])

    const selectedCatalogId = catalog.catalogId || (catalog.idList.length === 1 ? catalog.idList[0] : "");

    return (
        <>
            {isLoading ? (
                <>
                    <Skeleton className="h-12 w-1/4 rounded-md"/>
                    <Skeleton className="h-12 w-full rounded-md"/>
                    <Skeleton className="h-full w-full rounded-md"/>
                </>
            ) : (
                <CatalogContext.Provider value={
                    {
                        messages,
                        setMessages
                    }
                }>
                    <Toaster position="top-center" richColors closeButton/>
                    <div className="flex gap-8 items-center mb-4">
                        <h1 className="text-[28px] leading-[36px] text-foreground">{messages[catalog.catalogName]}</h1>
                        {catalog.idList.length === 1 && selectedCatalogId && (
                            <Badge variant="secondary" className="px-3 py-1 text-sm">
                                {selectedCatalogId}
                            </Badge>
                        )}
                        {catalog.idList.length > 1 &&
                            <Select value={selectedCatalogId}
                                    onValueChange={(value) => {
                                        router.get(`${window.routePrefix}/catalog/${catalog.catalogSlug}/${value}`)
                                    }}>
                                <SelectTrigger className="w-full max-w-[170px] cursor-pointer">
                                    <SelectValue placeholder={messages["Select Ids"]}/>
                                </SelectTrigger>
                                <SelectContent>
                                    {catalog.idList.map((id) => (
                                        <SelectItem value={id}
                                                    key={id}>{id}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        }
                    </div>
                    <div
                        className="xl:gap-10 justify-between flex flex-col xl:flex-row gap-3.5">
                        <div className="flex gap-2 items-center">
                            <div className="flex gap-2 items-center flex-wrap md:flex-nowrap">
                                <Button variant="default" size="sm"
                                        className={`w-fit rounded-sm ${
                                            selectedNodes.length === 0 ||
                                            (selectedNodes.length === 1 && selectedNodes[0]?.droppable)
                                                ? ''
                                                : 'opacity-50 pointer-events-none'
                                        }`}
                                        onClick={() => {
                                            setPopupEvent('create')
                                            dialogRef.current?.open()
                                        }}>
                                    <Plus/>
                                    {messages.create}
                                </Button>
                                <Button variant="outline" size="sm"
                                        className={`w-fit cursor-pointer rounded-sm ${(selectedNodes.length > 1 || !selectedNodes.length) ?
                                            'opacity-50 pointer-events-none' : ''}`}
                                        onClick={() => {
                                            initUpdateItem()
                                            setPopupEvent('update')
                                            dialogRef.current?.open()
                                        }}>
                                    <Pencil/>
                                    {messages.Edit}
                                </Button>
                                <DeleteModal btnTitle={messages.Delete}
                                             ref={deleteModalRef}
                                             variant="destructive"
                                             btnCLass={`w-fit text-white hover ${selectedNodes.length ? '' : 'opacity-50 pointer-events-none'}`}
                                             delModal={
                                                 {
                                                     yes: messages['Yes'],
                                                     no: messages['No'],
                                                     text: messages['Are you sure?']
                                                 }
                                             }
                                             isLink={false}
                                             handleDelete={deleteItem}
                                />
                                <Button variant="secondary" size="sm"
                                        className={`w-fit cursor-pointer rounded-sm ${selectedNodes.length ? '' : 'opacity-50 pointer-events-none'}`}
                                        onClick={() => {
                                            setParentId(0)
                                            setSelectedNodes([])
                                        }}>
                                    <Ban/>
                                    {messages["Clean"]}
                                </Button>
                            </div>
                            <div className="ml-4">
                                <div className="hidden lg:flex gap-2">
                                    {actionsTools.map((item) => (
                                        <Button variant="outline" size="sm" key={item.id}
                                                onClick={() => initAction(item.id)}>
                                            <MaterialIcon name={item.icon}/>
                                            {item.name}
                                        </Button>
                                    ))}
                                </div>
                                {actionsTools.length > 0 &&
                                    <div className="block lg:hidden">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="icon">
                                                    <BetweenHorizontalStart/>
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-fit" side="right" align="start">
                                                <DropdownMenuGroup className="grid gap-2">
                                                    {actionsTools.map((item) => (
                                                        <Button variant="outline" size="sm" key={item.id}
                                                                onClick={() => initAction(item.id)}>
                                                            <MaterialIcon name={item.icon}/>
                                                            {item.name}
                                                        </Button>
                                                    ))}
                                                </DropdownMenuGroup>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                }
                            </div>
                        </div>
                        <div className="flex gap-2 items-center justify-start xl:justify-end">
                            {searhing && <LoaderCircle
                                className="size-4 animate-spin order-2 xl:order-1"/>}
                            <Input
                                type="search"
                                autoFocus={false}
                                placeholder={messages.Search}
                                className="w-[200px] p-2 border rounded order-1 xl:order-2"
                                onChange={(e) => {
                                    handleSearch(e.target.value)
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        performSearch(e.currentTarget.value);
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <div className="h-full">
                        <DndProvider backend={MultiBackend} options={getBackendOptions()}>
                            <div className={styles.app}>
                                <Tree
                                    ref={treeRef}
                                    tree={treeData}
                                    rootId={0}
                                    render={(node, {depth, isOpen, onToggle}) => (
                                        <ContextMenu
                                            onOpenChange={(open: boolean) => handleOpenContextMenu(open, node)}>
                                            <ContextMenuTrigger>
                                                <CatalogNode
                                                    node={node}
                                                    depth={depth}
                                                    isOpen={isOpen}
                                                    loading={loadingNodeId === node.id}
                                                    isSelected={!!selectedNodes.find((n) => n.id === node.id)}
                                                    onToggle={(id) => {
                                                        onToggle();
                                                        handleToggle(id as string, !isOpen)
                                                    }}
                                                    onSelect={handleSelect}
                                                />
                                            </ContextMenuTrigger>
                                            <ContextMenuContent>
                                                <ContextMenuItem
                                                    className={`${selectedNodes[0]?.droppable ? '' : 'opacity-50 pointer-events-none'}`}
                                                    onClick={() => {
                                                        setPopupEvent('create')
                                                        dialogRef.current?.open()
                                                    }}>
                                                    {messages.create}
                                                </ContextMenuItem>
                                                <ContextMenuItem onClick={() => {
                                                    initUpdateItem()
                                                    setPopupEvent('update')
                                                    dialogRef.current?.open()
                                                }}>
                                                    {messages.Edit}
                                                </ContextMenuItem>
                                                <ContextMenuItem
                                                    variant="destructive"
                                                    onClick={() => {
                                                        document.body.removeAttribute('style')
                                                        deleteModalRef.current?.click()
                                                    }}
                                                    className={selectedNodes.length ? '' : 'opacity-50 pointer-events-none'}
                                                >
                                                    {messages["Delete"]}
                                                </ContextMenuItem>
                                                {actionLoading ? (
                                                    <LoaderCircle
                                                        className="mx-auto size-3 animate-spin"/>
                                                ) : (
                                                    actionsContext.map((item) => (
                                                        <ContextMenuItem key={item.id}
                                                                         onClick={() => initAction(item.id)}>
                                                            {item.name}
                                                        </ContextMenuItem>
                                                    ))
                                                )}
                                            </ContextMenuContent>
                                        </ContextMenu>
                                    )}
                                    dropTargetOffset={5}
                                    insertDroppableFirst={false}
                                    classes={{
                                        draggingSource: styles.draggingSource,
                                        dropTarget: 'bg-chart-1/30',
                                        placeholder: styles.placeholderContainer,
                                        root: 'py-4'
                                    }}
                                    canDrop={(_tree, {dragSource, dropTargetId}) => {
                                        if (dragSource?.parent === dropTargetId) {
                                            return true;
                                        }
                                    }}
                                    sort={false}
                                    dragPreviewRender={(
                                        monitorProps: DragLayerMonitorProps<CustomCatalogData>
                                    ) => <CatalogDragPreview monitorProps={monitorProps}/>}
                                    onDrop={handleDrop}
                                    placeholderRender={(node, {depth}) => (
                                        <Placeholder node={node} depth={depth}/>
                                    )}
                                    rootProps={{
                                        onClick: handleClear
                                    }}
                                />
                            </div>
                        </DndProvider>
                    </div>
                    <CatalogDialogStack
                        dialogRef={dialogRef}
                        PopupEvent={PopupEvent}
                        firstRender={firstRender}
                        secondRender={secondRender}
                        popupType={popupType}
                        addProps={addProps}
                        editModel={editModel}
                        popUpTargetBlank={popUpTargetBlank}
                        popUpVisible={popUpVisible}
                        isNavigation={isNavigation}
                        messages={messages}
                        DynamicComponent={DynamicComponent}
                        DynamicActionComponent={DynamicActionComponent}
                        addLinksGroupProps={addLinksGroupProps}
                        reloadCatalog={reloadCatalog}
                        itemType={itemType}
                        parentid={parentid}
                        addItemProps={addItemProps}
                        getAddModelJSON={getAddModelJSON}
                        addModel={addModel}
                        items={items}
                        selectCatalogItem={selectCatalogItem}
                    />
                </CatalogContext.Provider>
            )}
        </>
    )
}
export default CatalogTree;
