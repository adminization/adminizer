/**
 * Adminizer Module Type Definitions
 *
 * Include this file in your module project to get full type support and
 * inline JSDoc hints for window.UIComponents, window.JSComponents and globals.
 *
 * tsconfig.json:
 * ```json
 * { "compilerOptions": { "paths": {} }, "include": ["adminizer-module.d.ts"] }
 * ```
 * Or simply copy it next to your module's tsconfig and add to "include".
 */

import type { FC, ReactNode, ComponentProps, RefObject } from 'react';

// ---------------------------------------------------------------------------
// Sonner toast API (subset exposed via window.sonner)
// ---------------------------------------------------------------------------

interface ToastOptions {
    description?: string;
    duration?: number;
    action?: { label: string; onClick: () => void };
}

interface SonnerToast {
    (message: string, options?: ToastOptions): void;
    success(message: string, options?: ToastOptions): void;
    error(message: string, options?: ToastOptions): void;
    warning(message: string, options?: ToastOptions): void;
    info(message: string, options?: ToastOptions): void;
    promise<T>(
        promise: Promise<T>,
        options: { loading: string; success: string | ((data: T) => string); error: string }
    ): void;
    dismiss(id?: string | number): void;
}

// ---------------------------------------------------------------------------
// adminApi — typed HTTP client (mirrors src/assets/js/lib/admin-api.ts)
// ---------------------------------------------------------------------------

type QueryParams = Record<string, unknown>;

interface HttpRequestOptions {
    headers?: Record<string, string | number | boolean | null | undefined>;
    params?: QueryParams;
    signal?: AbortSignal;
    responseType?: 'arraybuffer' | 'blob' | 'document' | 'json' | 'text';
}

interface HttpResponse<T = unknown> {
    data: T;
    status: number;
    headers: Record<string, string>;
}

/**
 * Typed HTTP client for backend calls.
 *
 * Always sends no-cache headers and appends `_ts` query param to bust caches.
 * Use `*Json` methods when the endpoint must return JSON; they throw a
 * human-readable error if the session expired and server returned HTML.
 *
 * @example
 * const { data } = await adminApi.getJson<{ items: Item[] }>('/admin/api/items');
 * await adminApi.postJson('/admin/api/items', { name: 'New item' });
 */
interface AdminApi {
    get<T>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
    post<T>(url: string, data?: unknown, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
    put<T>(url: string, data?: unknown, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
    patch<T>(url: string, data?: unknown, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
    delete<T>(url: string, data?: unknown, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
    getJson<T>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
    postJson<T>(url: string, data?: unknown, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
    putJson<T>(url: string, data?: unknown, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
    patchJson<T>(url: string, data?: unknown, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
    deleteJson<T>(url: string, data?: unknown, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
}

interface AxiosCompat {
    get<T = unknown>(url: string, config?: HttpRequestOptions): Promise<HttpResponse<T>>;
    post<T = unknown>(url: string, data?: unknown, config?: HttpRequestOptions): Promise<HttpResponse<T>>;
    put<T = unknown>(url: string, data?: unknown, config?: HttpRequestOptions): Promise<HttpResponse<T>>;
    patch<T = unknown>(url: string, data?: unknown, config?: HttpRequestOptions): Promise<HttpResponse<T>>;
    delete<T = unknown>(url: string, config?: HttpRequestOptions & { data?: unknown }): Promise<HttpResponse<T>>;
    isAxiosError(error: unknown): boolean;
}

// ---------------------------------------------------------------------------
// UI component prop shapes (minimal — enough for JSDoc hover, not exhaustive)
// ---------------------------------------------------------------------------

type ButtonVariant = 'default' | 'destructive' | 'green' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon' | 'list';
type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';
type SelectTriggerSize = 'default' | 'sm';
type SeparatorOrientation = 'horizontal' | 'vertical';
type SheetSide = 'top' | 'right' | 'bottom' | 'left';
type TabsMode = 'multiple' | 'single';

interface ButtonProps {
    /**
     * Visual style of the button.
     * - `default` — primary brand color
     * - `destructive` — red, for delete/danger actions
     * - `green` — success/confirm actions
     * - `outline` — bordered, transparent background
     * - `secondary` — muted secondary style
     * - `ghost` — no background, hover only
     * - `link` — looks like a text link
     * @default 'default'
     */
    variant?: ButtonVariant;
    /**
     * Size preset.
     * - `icon` — square 36px, use for icon-only buttons
     * - `list` — compact 32px, for table row actions
     * @default 'default'
     */
    size?: ButtonSize;
    /**
     * Render as child element (e.g. `<a>` for link-buttons).
     * Passes all props to the single child via Radix Slot.
     * @example <Button asChild><a href="/settings">Settings</a></Button>
     */
    asChild?: boolean;
    disabled?: boolean;
    className?: string;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    children?: ReactNode;
    [key: string]: unknown;
}

interface BadgeProps {
    /**
     * - `default` — primary, filled
     * - `secondary` — muted
     * - `destructive` — red
     * - `outline` — bordered only
     * @default 'default'
     */
    variant?: BadgeVariant;
    asChild?: boolean;
    className?: string;
    children?: ReactNode;
    [key: string]: unknown;
}

interface DialogStackHandle {
    /** Open the stack (show first panel) */
    open(): void;
    /** Close the stack and reset to first panel */
    close(): void;
    /** Close all panels and reset */
    closeAll(): void;
    /** Navigate to next panel */
    next(): void;
    /** Navigate to previous panel */
    prev(): void;
    /** Close the currently active panel (goes back or closes all) */
    closeCurrent(): void;
}

interface MultiSelectOption {
    label: string;
    value: string;
    /** Optional icon component */
    icon?: FC<{ className?: string }>;
}

interface MultiSelectProps {
    /** List of available options */
    options: MultiSelectOption[];
    /** Called whenever selection changes */
    onValueChange: (values: string[]) => void;
    /** Pre-selected values (controlled) */
    defaultValue?: string[];
    /**
     * `'multiple'` — multi-select with chips.
     * `'single'` — closes dropdown on selection, behaves like a styled Select.
     * @default 'multiple'
     */
    mode?: 'multiple' | 'single';
    /** Trigger placeholder when nothing selected */
    placeholder?: string;
    /** Search input placeholder inside the dropdown */
    search?: string;
    /** Text shown when no options match the search */
    notFound?: string;
    /** Max chips shown before "+N more" badge. @default 3 */
    maxCount?: number;
    /**
     * Called when user clicks the ExternalLink icon on a chip.
     * Providing this prop renders the icon on each chip.
     */
    onOpenItem?: (value: string) => void;
    /**
     * Called when user clicks the "Add" chip button.
     * Providing this prop renders an Add button in the trigger area.
     */
    onAddNew?: () => void;
    /** Disables chip removal while true (e.g. during a save request) */
    processing?: boolean;
    disabled?: boolean;
    className?: string;
    [key: string]: unknown;
}

interface MonacoEditorProps {
    /** Current editor content */
    value: string;
    /** Called on every keystroke */
    onChange: (value: string) => void;
    /** Language for syntax highlighting, e.g. `'json'`, `'javascript'`, `'sql'`, `'html'` */
    options: { language: string };
    /** Makes editor read-only and visually dimmed */
    disabled?: boolean;
}

interface HandsonTableProps {
    /** Table rows. Use arrays or row objects depending on the Handsontable config. */
    data?: unknown[][] | Record<string, unknown>[];
    /** Handsontable GridSettings. Put colHeaders, columns, rowHeaders, licenseKey, etc. here. */
    config: Record<string, unknown>;
    /** Called with the updated source data after user edits. */
    onChange: (data: unknown) => void;
    /** Makes table read-only and visually dimmed */
    disabled?: boolean;
}

// ---------------------------------------------------------------------------
// window augmentation
// ---------------------------------------------------------------------------

declare global {
    interface Window {
        /**
         * Route prefix configured in adminizer (e.g. `'/admin'`).
         * Use to build API URLs: `` `${window.routePrefix}/api/...` ``
         */
        routePrefix: string;

        /**
         * Typed HTTP client. Use instead of legacy `window.axios` for backend calls.
         * Adds no-cache headers and cache-buster params. Use `*Json` methods for
         * JSON endpoints that should reject HTML responses.
         *
         * @example
         * const { data } = await window.adminApi.getJson<{ rows: Row[] }>(`${window.routePrefix}/api/rows`);
         */
        adminApi: AdminApi;

        /**
         * Legacy Axios-compatible client. Prefer `window.adminApi`.
         */
        axios: AxiosCompat;

        /**
         * Sonner toast API.
         *
         * @example
         * window.sonner.toast('Saved');
         * window.sonner.toast.error('Failed');
         * window.sonner.toast.promise(req, { loading: '...', success: 'Done', error: 'Err' });
         */
        sonner: { toast: SonnerToast };

        /**
         * shadcn/ui components (React 19 + Tailwind v4 + Radix UI).
         * Destructure what you need at the top of your module.
         *
         * @example
         * const { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } = window.UIComponents;
         */
        UIComponents: UIComponents;

        /**
         * Specialized JS editor components.
         *
         * @example
         * const { MonacoEditor, MultiSelect } = window.JSComponents;
         */
        JSComponents: JSComponents;

        /**
         * All Lucide icons.
         *
         * @example
         * const { Pencil, Trash2, Plus } = window.LucideReact;
         * // Usage: <Pencil className="size-4" />
         */
        LucideReact: Record<string, FC<{ className?: string; size?: number; [k: string]: unknown }>>;

        /** React 19 */
        React: typeof import('react');
        /** ReactDOM 19 */
        ReactDOM: typeof import('react-dom');
    }

    // -----------------------------------------------------------------------
    // UIComponents — all shadcn/ui components
    // -----------------------------------------------------------------------

    interface UIComponents {
        // --- Avatar ---
        /**
         * User image container. Always pair with `AvatarImage` + `AvatarFallback`.
         * @example
         * <Avatar><AvatarImage src={url} /><AvatarFallback>AB</AvatarFallback></Avatar>
         */
        Avatar: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        AvatarImage: FC<{ src?: string; alt?: string; className?: string; [k: string]: unknown }>;
        /** Shown when image fails to load. Put initials here. */
        AvatarFallback: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;

        // --- Badge ---
        /**
         * Inline status label.
         * variant: `'default' | 'secondary' | 'destructive' | 'outline'`
         * @example <Badge variant="destructive">Error</Badge>
         */
        Badge: FC<BadgeProps>;

        // --- Breadcrumb ---
        Breadcrumb: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        BreadcrumbList: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        BreadcrumbItem: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        BreadcrumbLink: FC<{ href?: string; className?: string; children?: ReactNode; [k: string]: unknown }>;
        /** Marks the current (last) breadcrumb item — not a link */
        BreadcrumbPage: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        BreadcrumbSeparator: FC<{ className?: string; [k: string]: unknown }>;
        BreadcrumbEllipsis: FC<{ className?: string; [k: string]: unknown }>;

        // --- Button ---
        /**
         * Styled button with variants and sizes.
         *
         * variant: `'default' | 'destructive' | 'green' | 'outline' | 'secondary' | 'ghost' | 'link'`
         * size: `'default' | 'sm' | 'lg' | 'icon' | 'list'`
         *
         * Use `size="icon"` for icon-only (square 36px).
         * Use `asChild` to render as `<a>` or any other element.
         *
         * @example
         * <Button variant="destructive" size="sm" onClick={del}>Delete</Button>
         * <Button variant="ghost" size="icon"><Pencil /></Button>
         * <Button asChild><a href="/edit">Edit</a></Button>
         */
        Button: FC<ButtonProps>;

        // --- Calendar ---
        /**
         * Date picker. mode: `'single' | 'multiple' | 'range'`
         * @example <Calendar mode="single" selected={date} onSelect={setDate} />
         */
        Calendar: FC<{ mode?: string; selected?: Date; onSelect?: (d: Date | undefined) => void; className?: string; [k: string]: unknown }>;

        // --- Card ---
        /**
         * Structured container.
         * Slots: CardHeader → (CardTitle, CardDescription, CardAction), CardContent, CardFooter
         * `CardAction` renders top-right inside the header.
         * @example
         * <Card>
         *   <CardHeader><CardTitle>Title</CardTitle><CardAction><Button>Edit</Button></CardAction></CardHeader>
         *   <CardContent>body</CardContent>
         * </Card>
         */
        Card: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        CardHeader: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        CardTitle: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        CardDescription: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        /** Top-right slot inside CardHeader */
        CardAction: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        CardContent: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        CardFooter: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;

        // --- Checkbox ---
        /** @example <Checkbox checked={v} onCheckedChange={setV} /> */
        Checkbox: FC<{ checked?: boolean; onCheckedChange?: (v: boolean) => void; disabled?: boolean; id?: string; className?: string; [k: string]: unknown }>;

        // --- Collapsible ---
        Collapsible: FC<{ open?: boolean; onOpenChange?: (v: boolean) => void; className?: string; children?: ReactNode; [k: string]: unknown }>;
        CollapsibleTrigger: FC<{ asChild?: boolean; className?: string; children?: ReactNode; [k: string]: unknown }>;
        CollapsibleContent: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;

        // --- Command ---
        /**
         * Command palette / searchable list.
         * Structure: Command > CommandInput + CommandList > (CommandEmpty, CommandGroup > CommandItem)
         * @example
         * <Command>
         *   <CommandInput placeholder="Search..." />
         *   <CommandList>
         *     <CommandEmpty>No results.</CommandEmpty>
         *     <CommandGroup heading="Actions">
         *       <CommandItem onSelect={action}>Do something</CommandItem>
         *     </CommandGroup>
         *   </CommandList>
         * </Command>
         */
        Command: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        CommandDialog: FC<{ open?: boolean; onOpenChange?: (v: boolean) => void; children?: ReactNode; [k: string]: unknown }>;
        CommandInput: FC<{ placeholder?: string; className?: string; [k: string]: unknown }>;
        CommandList: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        CommandEmpty: FC<{ children?: ReactNode; [k: string]: unknown }>;
        CommandGroup: FC<{ heading?: string; className?: string; children?: ReactNode; [k: string]: unknown }>;
        /** `onSelect` fires when item is clicked or keyboard-confirmed */
        CommandItem: FC<{ onSelect?: () => void; className?: string; children?: ReactNode; disabled?: boolean; [k: string]: unknown }>;
        CommandSeparator: FC<{ className?: string; [k: string]: unknown }>;
        CommandShortcut: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;

        // --- ContextMenu ---
        /**
         * Right-click context menu.
         * @example
         * <ContextMenu>
         *   <ContextMenuTrigger>right-click me</ContextMenuTrigger>
         *   <ContextMenuContent>
         *     <ContextMenuItem onClick={edit}>Edit</ContextMenuItem>
         *   </ContextMenuContent>
         * </ContextMenu>
         */
        ContextMenu: FC<{ children?: ReactNode; [k: string]: unknown }>;
        ContextMenuTrigger: FC<{ asChild?: boolean; className?: string; children?: ReactNode; [k: string]: unknown }>;
        ContextMenuContent: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        ContextMenuItem: FC<{ onClick?: () => void; className?: string; children?: ReactNode; disabled?: boolean; inset?: boolean; [k: string]: unknown }>;
        ContextMenuCheckboxItem: FC<{ checked?: boolean; onCheckedChange?: (v: boolean) => void; children?: ReactNode; [k: string]: unknown }>;
        ContextMenuRadioGroup: FC<{ value?: string; onValueChange?: (v: string) => void; children?: ReactNode; [k: string]: unknown }>;
        ContextMenuRadioItem: FC<{ value: string; children?: ReactNode; [k: string]: unknown }>;
        ContextMenuLabel: FC<{ className?: string; children?: ReactNode; inset?: boolean; [k: string]: unknown }>;
        ContextMenuSeparator: FC<{ className?: string; [k: string]: unknown }>;
        ContextMenuShortcut: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        ContextMenuGroup: FC<{ children?: ReactNode; [k: string]: unknown }>;
        ContextMenuPortal: FC<{ children?: ReactNode; [k: string]: unknown }>;
        ContextMenuSub: FC<{ children?: ReactNode; [k: string]: unknown }>;
        ContextMenuSubTrigger: FC<{ className?: string; children?: ReactNode; inset?: boolean; [k: string]: unknown }>;
        ContextMenuSubContent: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;

        // --- Dialog ---
        /**
         * Centered modal dialog. `DialogContent` includes overlay + X close button automatically.
         * Use `DialogClose asChild` to turn any element into a close trigger.
         *
         * @example
         * <Dialog>
         *   <DialogTrigger asChild><Button>Open</Button></DialogTrigger>
         *   <DialogContent>
         *     <DialogHeader><DialogTitle>Title</DialogTitle></DialogHeader>
         *     <DialogFooter>
         *       <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
         *       <Button onClick={confirm}>Confirm</Button>
         *     </DialogFooter>
         *   </DialogContent>
         * </Dialog>
         */
        Dialog: FC<{ open?: boolean; onOpenChange?: (v: boolean) => void; children?: ReactNode; [k: string]: unknown }>;
        DialogTrigger: FC<{ asChild?: boolean; children?: ReactNode; [k: string]: unknown }>;
        /** Renders overlay + X button automatically. Do NOT add them manually. */
        DialogContent: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        DialogHeader: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        DialogFooter: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        DialogTitle: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        DialogDescription: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        /** Use `asChild` to turn any element into a close trigger */
        DialogClose: FC<{ asChild?: boolean; className?: string; children?: ReactNode; [k: string]: unknown }>;
        DialogOverlay: FC<{ className?: string; [k: string]: unknown }>;
        DialogPortal: FC<{ children?: ReactNode; [k: string]: unknown }>;

        // --- DialogStack ---
        /**
         * Stackable slide-over panels for multi-step or drill-down flows.
         * Panels slide from the right; previous panels are visible and dimmed behind.
         *
         * **Imperative control via ref:**
         * ```ts
         * const ref = React.useRef<DialogStackHandle>(null);
         * ref.current?.next();   // go to next panel
         * ref.current?.closeAll(); // close all panels
         * ```
         *
         * **Long-press X** closes all panels at once.
         * `clickable` lets user click a background panel to jump back to it.
         *
         * @example
         * <DialogStack ref={stackRef} clickable>
         *   <DialogStackTrigger asChild><Button>Open</Button></DialogStackTrigger>
         *   <DialogStackOverlay />
         *   <DialogStackBody>
         *     <DialogStackContent>
         *       <DialogStackHeader><DialogStackTitle>Step 1</DialogStackTitle></DialogStackHeader>
         *       <DialogStackFooter>
         *         <DialogStackNext asChild><Button>Next</Button></DialogStackNext>
         *       </DialogStackFooter>
         *     </DialogStackContent>
         *     <DialogStackContent>
         *       <DialogStackHeader><DialogStackTitle>Step 2</DialogStackTitle></DialogStackHeader>
         *       <DialogStackFooter>
         *         <DialogStackPrevious asChild><Button variant="outline">Back</Button></DialogStackPrevious>
         *         <Button onClick={() => stackRef.current?.closeAll()}>Done</Button>
         *       </DialogStackFooter>
         *     </DialogStackContent>
         *   </DialogStackBody>
         * </DialogStack>
         */
        DialogStack: FC<{
            ref?: RefObject<DialogStackHandle>;
            open?: boolean;
            onOpenChange?: (v: boolean) => void;
            /** Allow clicking a background (inactive) panel to navigate back to it */
            clickable?: boolean;
            className?: string;
            children?: ReactNode;
        }>;
        DialogStackTrigger: FC<{ asChild?: boolean; className?: string; children?: ReactNode; onClick?: () => void; [k: string]: unknown }>;
        DialogStackOverlay: FC<{ className?: string; [k: string]: unknown }>;
        /** Wraps all `DialogStackContent` panels. Direct children = individual panels. */
        DialogStackBody: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        /**
         * One panel in the stack. Each direct child of `DialogStackBody` is a panel.
         * `offset` controls the pixel gap between stacked panels. @default 20
         */
        DialogStackContent: FC<{ className?: string; offset?: number; children?: ReactNode; [k: string]: unknown }>;
        DialogStackHeader: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        DialogStackTitle: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        DialogStackDescription: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        DialogStackFooter: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        /** Advances to the next panel. Auto-disabled on last panel. Use `asChild` to style. */
        DialogStackNext: FC<{ asChild?: boolean; className?: string; children?: ReactNode; [k: string]: unknown }>;
        /** Goes back to the previous panel. Auto-disabled on first panel. Use `asChild` to style. */
        DialogStackPrevious: FC<{ asChild?: boolean; className?: string; children?: ReactNode; [k: string]: unknown }>;

        // --- DropdownMenu ---
        /**
         * Trigger-based dropdown menu.
         * Use `align="end"` on `DropdownMenuContent` to align to the right edge of the trigger.
         *
         * @example
         * <DropdownMenu>
         *   <DropdownMenuTrigger asChild><Button variant="outline">Actions</Button></DropdownMenuTrigger>
         *   <DropdownMenuContent align="end">
         *     <DropdownMenuLabel>Record</DropdownMenuLabel>
         *     <DropdownMenuItem onClick={edit}>Edit</DropdownMenuItem>
         *     <DropdownMenuSeparator />
         *     <DropdownMenuItem onClick={del} className="text-destructive">Delete</DropdownMenuItem>
         *   </DropdownMenuContent>
         * </DropdownMenu>
         */
        DropdownMenu: FC<{ open?: boolean; onOpenChange?: (v: boolean) => void; children?: ReactNode; [k: string]: unknown }>;
        DropdownMenuTrigger: FC<{ asChild?: boolean; className?: string; children?: ReactNode; [k: string]: unknown }>;
        DropdownMenuContent: FC<{ align?: 'start' | 'center' | 'end'; className?: string; children?: ReactNode; [k: string]: unknown }>;
        DropdownMenuItem: FC<{ onClick?: () => void; disabled?: boolean; className?: string; children?: ReactNode; inset?: boolean; [k: string]: unknown }>;
        DropdownMenuLabel: FC<{ className?: string; children?: ReactNode; inset?: boolean; [k: string]: unknown }>;
        DropdownMenuSeparator: FC<{ className?: string; [k: string]: unknown }>;
        DropdownMenuGroup: FC<{ children?: ReactNode; [k: string]: unknown }>;
        DropdownMenuPortal: FC<{ children?: ReactNode; [k: string]: unknown }>;
        DropdownMenuSub: FC<{ children?: ReactNode; [k: string]: unknown }>;
        DropdownMenuSubTrigger: FC<{ className?: string; children?: ReactNode; inset?: boolean; [k: string]: unknown }>;
        DropdownMenuSubContent: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        DropdownMenuCheckboxItem: FC<{ checked?: boolean; onCheckedChange?: (v: boolean) => void; children?: ReactNode; [k: string]: unknown }>;
        DropdownMenuRadioGroup: FC<{ value?: string; onValueChange?: (v: string) => void; children?: ReactNode; [k: string]: unknown }>;
        DropdownMenuRadioItem: FC<{ value: string; children?: ReactNode; [k: string]: unknown }>;
        DropdownMenuShortcut: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;

        // --- Input ---
        /**
         * Styled text input. Forwards all native `<input>` props.
         * @example <Input type="text" placeholder="Name" value={v} onChange={e => setV(e.target.value)} />
         */
        Input: FC<{ type?: string; placeholder?: string; value?: string; onChange?: React.ChangeEventHandler<HTMLInputElement>; disabled?: boolean; className?: string; [k: string]: unknown }>;

        // --- Label ---
        /** @example <Label htmlFor="field">Name</Label><Input id="field" /> */
        Label: FC<{ htmlFor?: string; className?: string; children?: ReactNode; [k: string]: unknown }>;

        // --- Menubar ---
        Menubar: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        MenubarMenu: FC<{ children?: ReactNode; [k: string]: unknown }>;
        MenubarTrigger: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        MenubarContent: FC<{ className?: string; children?: ReactNode; align?: 'start' | 'center' | 'end'; [k: string]: unknown }>;
        MenubarItem: FC<{ onClick?: () => void; disabled?: boolean; inset?: boolean; className?: string; children?: ReactNode; [k: string]: unknown }>;
        MenubarLabel: FC<{ inset?: boolean; className?: string; children?: ReactNode; [k: string]: unknown }>;
        MenubarSeparator: FC<{ className?: string; [k: string]: unknown }>;
        MenubarShortcut: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        MenubarGroup: FC<{ children?: ReactNode; [k: string]: unknown }>;
        MenubarPortal: FC<{ children?: ReactNode; [k: string]: unknown }>;
        MenubarSub: FC<{ children?: ReactNode; [k: string]: unknown }>;
        MenubarSubTrigger: FC<{ inset?: boolean; className?: string; children?: ReactNode; [k: string]: unknown }>;
        MenubarSubContent: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        MenubarCheckboxItem: FC<{ checked?: boolean; onCheckedChange?: (v: boolean) => void; children?: ReactNode; [k: string]: unknown }>;
        MenubarRadioGroup: FC<{ value?: string; onValueChange?: (v: string) => void; children?: ReactNode; [k: string]: unknown }>;
        MenubarRadioItem: FC<{ value: string; children?: ReactNode; [k: string]: unknown }>;

        // --- Pagination ---
        Pagination: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        PaginationContent: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        PaginationItem: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        PaginationLink: FC<{ href?: string; isActive?: boolean; className?: string; children?: ReactNode; [k: string]: unknown }>;
        PaginationPrevious: FC<{ href?: string; className?: string; [k: string]: unknown }>;
        PaginationNext: FC<{ href?: string; className?: string; [k: string]: unknown }>;
        PaginationEllipsis: FC<{ className?: string; [k: string]: unknown }>;

        // --- Popover ---
        /**
         * Small floating overlay anchored to a trigger.
         * @example
         * <Popover>
         *   <PopoverTrigger asChild><Button variant="outline">Filters</Button></PopoverTrigger>
         *   <PopoverContent align="start" className="w-80">content</PopoverContent>
         * </Popover>
         */
        Popover: FC<{ open?: boolean; onOpenChange?: (v: boolean) => void; children?: ReactNode; [k: string]: unknown }>;
        PopoverTrigger: FC<{ asChild?: boolean; className?: string; children?: ReactNode; [k: string]: unknown }>;
        PopoverContent: FC<{ align?: 'start' | 'center' | 'end'; className?: string; children?: ReactNode; [k: string]: unknown }>;
        PopoverAnchor: FC<{ asChild?: boolean; children?: ReactNode; [k: string]: unknown }>;

        // --- Select ---
        /**
         * Single-value select box. For multi-value use `window.JSComponents.MultiSelect`.
         *
         * @example
         * <Select value={v} onValueChange={setV}>
         *   <SelectTrigger className="w-48"><SelectValue placeholder="Choose..." /></SelectTrigger>
         *   <SelectContent>
         *     <SelectGroup>
         *       <SelectLabel>Status</SelectLabel>
         *       <SelectItem value="active">Active</SelectItem>
         *     </SelectGroup>
         *   </SelectContent>
         * </Select>
         */
        Select: FC<{ value?: string; onValueChange?: (v: string) => void; defaultValue?: string; disabled?: boolean; children?: ReactNode; [k: string]: unknown }>;
        /** size: `'default' | 'sm'` */
        SelectTrigger: FC<{ size?: SelectTriggerSize; className?: string; children?: ReactNode; [k: string]: unknown }>;
        SelectValue: FC<{ placeholder?: string; [k: string]: unknown }>;
        SelectContent: FC<{ position?: 'popper' | 'item-aligned'; className?: string; children?: ReactNode; [k: string]: unknown }>;
        SelectGroup: FC<{ children?: ReactNode; [k: string]: unknown }>;
        SelectLabel: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        SelectItem: FC<{ value: string; disabled?: boolean; className?: string; children?: ReactNode; [k: string]: unknown }>;
        SelectSeparator: FC<{ className?: string; [k: string]: unknown }>;
        SelectScrollUpButton: FC<{ className?: string; [k: string]: unknown }>;
        SelectScrollDownButton: FC<{ className?: string; [k: string]: unknown }>;

        // --- Separator ---
        /** @example <Separator /> — horizontal. <Separator orientation="vertical" className="h-6" /> */
        Separator: FC<{ orientation?: SeparatorOrientation; className?: string; [k: string]: unknown }>;

        // --- Sheet ---
        /**
         * Slide-over panel from screen edge.
         * `side`: `'top' | 'right' | 'bottom' | 'left'` (default `'right'`)
         *
         * @example
         * <Sheet>
         *   <SheetTrigger asChild><Button>Open</Button></SheetTrigger>
         *   <SheetContent side="right">
         *     <SheetHeader><SheetTitle>Edit</SheetTitle></SheetHeader>
         *     <SheetFooter>
         *       <SheetClose asChild><Button variant="outline">Cancel</Button></SheetClose>
         *     </SheetFooter>
         *   </SheetContent>
         * </Sheet>
         */
        Sheet: FC<{ open?: boolean; onOpenChange?: (v: boolean) => void; children?: ReactNode; [k: string]: unknown }>;
        SheetTrigger: FC<{ asChild?: boolean; children?: ReactNode; [k: string]: unknown }>;
        SheetContent: FC<{ side?: SheetSide; className?: string; children?: ReactNode; [k: string]: unknown }>;
        SheetHeader: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        SheetFooter: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        SheetTitle: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        SheetDescription: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        SheetClose: FC<{ asChild?: boolean; className?: string; children?: ReactNode; [k: string]: unknown }>;

        // --- Sidebar ---
        /**
         * Full sidebar system. Requires `SidebarProvider` at the layout root.
         * Use `useSidebar` hook from `window.UIComponents` to access state from children.
         */
        SidebarProvider: FC<{ children?: ReactNode; className?: string; [k: string]: unknown }>;
        Sidebar: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        SidebarHeader: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        SidebarContent: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        SidebarFooter: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        SidebarGroup: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        SidebarGroupLabel: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        SidebarGroupContent: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        SidebarGroupAction: FC<{ asChild?: boolean; className?: string; children?: ReactNode; [k: string]: unknown }>;
        SidebarMenu: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        SidebarMenuItem: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        SidebarMenuButton: FC<{ asChild?: boolean; isActive?: boolean; className?: string; children?: ReactNode; [k: string]: unknown }>;
        SidebarMenuAction: FC<{ asChild?: boolean; className?: string; children?: ReactNode; [k: string]: unknown }>;
        SidebarMenuBadge: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        SidebarMenuSkeleton: FC<{ showIcon?: boolean; className?: string; [k: string]: unknown }>;
        SidebarMenuSub: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        SidebarMenuSubItem: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        SidebarMenuSubButton: FC<{ asChild?: boolean; isActive?: boolean; size?: 'sm' | 'md'; className?: string; children?: ReactNode; [k: string]: unknown }>;
        SidebarInput: FC<{ className?: string; [k: string]: unknown }>;
        SidebarInset: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        SidebarRail: FC<{ className?: string; [k: string]: unknown }>;
        SidebarSeparator: FC<{ className?: string; [k: string]: unknown }>;
        /** Hamburger toggle button for the sidebar */
        SidebarTrigger: FC<{ className?: string; [k: string]: unknown }>;
        /** Hook — access sidebar open state from any child of SidebarProvider */
        useSidebar: () => { open: boolean; setOpen: (v: boolean) => void; toggle: () => void };

        // --- Skeleton ---
        /**
         * Loading placeholder. Set width/height via className to match the element shape.
         * @example <Skeleton className="h-4 w-48" />
         */
        Skeleton: FC<{ className?: string; [k: string]: unknown }>;

        // --- Slider ---
        /**
         * Draggable range input. `defaultValue` / `value` are arrays (one entry per thumb).
         * @example <Slider min={0} max={100} step={1} defaultValue={[50]} onValueChange={([v]) => setV(v)} />
         */
        Slider: FC<{ min?: number; max?: number; step?: number; defaultValue?: number[]; value?: number[]; onValueChange?: (v: number[]) => void; disabled?: boolean; className?: string; [k: string]: unknown }>;

        // --- Sonner Toaster ---
        /**
         * Toast container. Add once at the app/module root.
         * Trigger toasts via `window.sonner.toast(...)`.
         * @example <Toaster richColors position="bottom-right" />
         */
        Toaster: FC<{ richColors?: boolean; position?: string; expand?: boolean; [k: string]: unknown }>;

        // --- Switch ---
        /** @example <Switch checked={enabled} onCheckedChange={setEnabled} /> */
        Switch: FC<{ checked?: boolean; onCheckedChange?: (v: boolean) => void; disabled?: boolean; className?: string; [k: string]: unknown }>;

        // --- Table ---
        /**
         * Scrollable table wrapper.
         * `wrapperHeight` on `Table` limits container height (sticky header scrolling).
         *
         * @example
         * <Table wrapperHeight="max-h-96">
         *   <TableHeader><TableRow><TableHead>Name</TableHead></TableRow></TableHeader>
         *   <TableBody>{rows.map(r => <TableRow key={r.id}><TableCell>{r.name}</TableCell></TableRow>)}</TableBody>
         * </Table>
         */
        Table: FC<{ wrapperHeight?: string; className?: string; children?: ReactNode; [k: string]: unknown }>;
        TableHeader: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        TableBody: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        TableFooter: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        TableRow: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        TableHead: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        TableCell: FC<{ className?: string; children?: ReactNode; colSpan?: number; [k: string]: unknown }>;
        TableCaption: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;

        // --- Tabs ---
        /**
         * Tab navigation. Controlled: pass `value` + `onValueChange`.
         * @example
         * <Tabs defaultValue="tab1">
         *   <TabsList><TabsTrigger value="tab1">Tab 1</TabsTrigger></TabsList>
         *   <TabsContent value="tab1">Content</TabsContent>
         * </Tabs>
         */
        Tabs: FC<{ value?: string; defaultValue?: string; onValueChange?: (v: string) => void; className?: string; children?: ReactNode; [k: string]: unknown }>;
        TabsList: FC<{ className?: string; children?: ReactNode; [k: string]: unknown }>;
        TabsTrigger: FC<{ value: string; disabled?: boolean; className?: string; children?: ReactNode; [k: string]: unknown }>;
        TabsContent: FC<{ value: string; className?: string; children?: ReactNode; [k: string]: unknown }>;

        // --- Textarea ---
        /**
         * Multiline text input. Forwards all native `<textarea>` props.
         * @example <Textarea placeholder="Description" rows={4} value={v} onChange={e => setV(e.target.value)} />
         */
        Textarea: FC<{ placeholder?: string; value?: string; rows?: number; disabled?: boolean; onChange?: React.ChangeEventHandler<HTMLTextAreaElement>; className?: string; [k: string]: unknown }>;

        // --- Tooltip ---
        /**
         * Hover/focus info bubble. Wrap the app (or module) root once with `TooltipProvider`.
         *
         * @example
         * // Root: <TooltipProvider>{children}</TooltipProvider>
         *
         * <Tooltip>
         *   <TooltipTrigger asChild><Button size="icon"><Pencil /></Button></TooltipTrigger>
         *   <TooltipContent>Edit record</TooltipContent>
         * </Tooltip>
         */
        TooltipProvider: FC<{ children?: ReactNode; delayDuration?: number; [k: string]: unknown }>;
        Tooltip: FC<{ children?: ReactNode; [k: string]: unknown }>;
        TooltipTrigger: FC<{ asChild?: boolean; className?: string; children?: ReactNode; [k: string]: unknown }>;
        TooltipContent: FC<{ side?: 'top' | 'right' | 'bottom' | 'left'; className?: string; children?: ReactNode; [k: string]: unknown }>;

        // --- VanillaJSONEditor (also in JSComponents) ---
        VanillaJSONEditor: FC<{ content?: unknown; onChange?: (content: unknown) => void; className?: string; [k: string]: unknown }>;
    }

    // -----------------------------------------------------------------------
    // JSComponents — specialized editor/table components
    // -----------------------------------------------------------------------

    interface JSComponents {
        /**
         * Multi-value (or single-value) select with search, chips, and optional row actions.
         *
         * Key props:
         * - `options` — `{ label, value, icon? }[]`
         * - `onValueChange` — `(values: string[]) => void`
         * - `mode` — `'multiple'` (default) | `'single'`
         * - `onOpenItem(value)` — renders ExternalLink icon per chip to open related record
         * - `onAddNew()` — renders "+ Add" chip button
         * - `processing` — disables chip removal while saving
         *
         * @example
         * <MultiSelect
         *   options={[{ label: 'Active', value: 'active' }]}
         *   defaultValue={selected}
         *   onValueChange={setSelected}
         *   placeholder="Select..."
         *   search="Search..."
         *   notFound="No options"
         * />
         */
        MultiSelect: FC<MultiSelectProps>;

        /**
         * Monaco code editor (VS Code engine). Auto-adapts to mobile/tablet/desktop.
         * Syncs theme with adminizer's dark/light mode automatically.
         *
         * @example
         * <MonacoEditor value={code} onChange={setCode} options={{ language: 'json' }} />
         * <MonacoEditor value={sql} onChange={setSql} options={{ language: 'sql' }} disabled />
         */
        MonacoEditor: FC<MonacoEditorProps>;

        /**
         * Handsontable spreadsheet grid. For heavy editable data tables.
         * See https://handsontable.com/docs for full config.
         * @example
         * <HandsonTable
         *   data={rows}
         *   config={{
         *     colHeaders: ['Name', 'Value'],
         *     rowHeaders: true,
         *     licenseKey: 'non-commercial-and-evaluation',
         *   }}
         *   onChange={setRows}
         * />
         */
        HandsonTable: FC<HandsonTableProps>;

        /**
         * Interactive JSON editor (vanilla-jsoneditor).
         * @example <VanillaJSONEditor content={{ json: data }} onChange={({ json }) => setData(json)} />
         */
        VanillaJSONEditor: FC<{ content?: unknown; onChange?: (content: unknown) => void; className?: string; [k: string]: unknown }>;
    }
}

// ---------------------------------------------------------------------------
// Module contract types
// ---------------------------------------------------------------------------

/**
 * Props received by a **page module** (loaded via `module.tsx` full-page route).
 *
 * Register via the backend `AbstractControls` or custom module route.
 * The `data` object shape is whatever your backend passes as `moduleData`.
 *
 * @example
 * ```tsx
 * // my-module.tsx  (built as UMD/ESM, served as static JS)
 * import type { PageModuleProps } from 'adminizer/adminizer-module';
 *
 * export default function MyModule({ data }: PageModuleProps<{ items: Item[] }>) {
 *   const { Button, Table, TableHeader, TableBody, TableRow, TableCell, TableHead } = window.UIComponents;
 *   const { items } = data;
 *   return (
 *     <Table>
 *       <TableHeader><TableRow><TableHead>Name</TableHead></TableRow></TableHeader>
 *       <TableBody>{items.map(i => <TableRow key={i.id}><TableCell>{i.name}</TableCell></TableRow>)}</TableBody>
 *     </Table>
 *   );
 * }
 * ```
 */
export interface PageModuleProps<TData = Record<string, unknown>> {
    /** Data passed from backend via Inertia props (`moduleData`) */
    data?: TData;
}

/**
 * Props received by a **field control module** (loaded via `DynamicControls`).
 *
 * Used for custom field editors (wysiwyg, codeEditor, jsonEditor, etc.).
 * Export a default React component matching this signature.
 *
 * @example
 * ```tsx
 * // my-editor.tsx
 * import type { FieldModuleProps } from 'adminizer/adminizer-module';
 *
 * export default function MyEditor({ initialValue, onChange, name, options }: FieldModuleProps) {
 *   const { MonacoEditor } = window.JSComponents;
 *   return (
 *     <MonacoEditor
 *       value={initialValue}
 *       onChange={onChange}
 *       options={{ language: options?.language ?? 'javascript' }}
 *     />
 *   );
 * }
 * ```
 */
export interface FieldModuleProps {
    /** Current field value (string) */
    initialValue: string;
    /** Call this to emit a new value to the form */
    onChange: (value: string) => void;
    /** HTML field name attribute */
    name: string;
    /** Options from the backend control config */
    options?: Record<string, string>;
}
