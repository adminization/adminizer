# UI Components

All components are available at runtime via `window.UIComponents` and `window.JSComponents`.  
Icons are available via `window.LucideReact`.

> Styling note: a module's markup can only use Tailwind classes that Adminizer's own stylesheet
> already contains — the panel's content scan does not cover app modules, so arbitrary values such
> as `text-[11px]` render as nothing. Use an inline style, or ship a module stylesheet through
> `moduleComponentCSS`. See “Styling App Modules” in BuildingModules.md.

## Runtime access

```js
const { Button, Dialog, DialogContent, DialogHeader, DialogTitle } = window.UIComponents;
const { MonacoEditor, MultiSelect } = window.JSComponents;
const { Pencil } = window.LucideReact;
```

## NPM import (after `npm run build`)

```tsx
import { Button } from 'adminizer/ui/button.js';
```

---

## window.UIComponents

### Avatar

User image with fallback initials.

```tsx
const { Avatar, AvatarImage, AvatarFallback } = window.UIComponents;

<Avatar>
  <AvatarImage src="/user.png" alt="John" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

---

### Badge

Small inline label. Supports `variant`: `default` | `secondary` | `destructive` | `outline`.

```tsx
const { Badge } = window.UIComponents;

<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Draft</Badge>
```

---

### Breadcrumb

Hierarchical navigation trail.

```tsx
const { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } = window.UIComponents;

<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem><BreadcrumbPage>Current</BreadcrumbPage></BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

---

### Button

Styled button. Supports `variant` and `size`. Use `asChild` to render as another element (e.g. `<a>`).

**variant:** `default` | `destructive` | `green` | `outline` | `secondary` | `ghost` | `link`  
**size:** `default` | `sm` | `lg` | `icon` | `list`

```tsx
const { Button } = window.UIComponents;

<Button variant="destructive" size="sm" onClick={handleDelete}>Delete</Button>
<Button variant="outline" asChild><a href="/settings">Settings</a></Button>
<Button variant="ghost" size="icon"><Pencil /></Button>
```

Best practice: always set `variant` explicitly; never rely on the default.  
Use `size="icon"` for icon-only buttons — it produces a square 36px target.  
Use `asChild` when the button must render as an `<a>` or custom component.

---

### Calendar

Date picker built on `react-day-picker`.

```tsx
const { Calendar } = window.UIComponents;
const [date, setDate] = React.useState();

<Calendar mode="single" selected={date} onSelect={setDate} />
```

---

### Card

Container with structured slots.

```tsx
const { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter } = window.UIComponents;

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Subtitle</CardDescription>
    <CardAction><Button size="sm">Edit</Button></CardAction>
  </CardHeader>
  <CardContent>Body content</CardContent>
  <CardFooter><Button>Save</Button></CardFooter>
</Card>
```

`CardAction` renders in the top-right corner of the header.

---

### Checkbox

```tsx
const { Checkbox } = window.UIComponents;

<Checkbox id="agree" checked={value} onCheckedChange={setValue} />
```

---

### Collapsible

Show/hide content with animation.

```tsx
const { Collapsible, CollapsibleTrigger, CollapsibleContent } = window.UIComponents;

<Collapsible>
  <CollapsibleTrigger>Toggle</CollapsibleTrigger>
  <CollapsibleContent>Hidden content</CollapsibleContent>
</Collapsible>
```

---

### Command

Command palette. Use inside `CommandDialog` for a modal palette.

```tsx
const { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } = window.UIComponents;

<Command>
  <CommandInput placeholder="Search..." />
  <CommandList>
    <CommandEmpty>No results.</CommandEmpty>
    <CommandGroup heading="Actions">
      <CommandItem onSelect={() => doSomething()}>Create record</CommandItem>
    </CommandGroup>
  </CommandList>
</Command>
```

---

### ContextMenu

Right-click context menu.

```tsx
const { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } = window.UIComponents;

<ContextMenu>
  <ContextMenuTrigger>Right-click me</ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem onClick={handleEdit}>Edit</ContextMenuItem>
    <ContextMenuItem onClick={handleDelete}>Delete</ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>
```

---

### Dialog

Modal dialog centered on screen. Includes built-in close button (X).

```tsx
const { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } = window.UIComponents;

<Dialog>
  <DialogTrigger asChild><Button>Open</Button></DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm action</DialogTitle>
      <DialogDescription>This cannot be undone.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
      <Button variant="destructive" onClick={handleConfirm}>Delete</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

`DialogContent` renders its own overlay and close button — do not add them manually.  
Use `DialogClose asChild` to turn any element into a close trigger.

---

### DialogStack

Stackable slide-over dialogs for multi-step flows (e.g. record → relation → sub-record).  
Panels slide in from the right. Previous panels are visible behind (dimmed).

**Props on `DialogStack`:**  
- `open?: boolean` — controlled open state  
- `onOpenChange?: (open: boolean) => void`  
- `clickable?: boolean` — allow clicking a background panel to navigate back to it  

**Imperative ref handle** (`DialogStackHandle`):  
`open()` | `close()` | `closeAll()` | `next()` | `prev()` | `closeCurrent()`

**`DialogStackContent` props:**  
- `offset?: number` (default `20`) — pixel shift per stacked panel

```tsx
const { DialogStack, DialogStackTrigger, DialogStackOverlay, DialogStackBody,
        DialogStackContent, DialogStackHeader, DialogStackTitle, DialogStackDescription,
        DialogStackFooter, DialogStackNext, DialogStackPrevious } = window.UIComponents;

const stackRef = React.useRef(null);

<DialogStack ref={stackRef} clickable>
  <DialogStackTrigger asChild><Button>Open wizard</Button></DialogStackTrigger>
  <DialogStackOverlay />
  <DialogStackBody>
    {/* Step 1 */}
    <DialogStackContent>
      <DialogStackHeader>
        <DialogStackTitle>Step 1</DialogStackTitle>
        <DialogStackDescription>Fill in details</DialogStackDescription>
      </DialogStackHeader>
      {/* form fields */}
      <DialogStackFooter>
        <DialogStackNext asChild><Button>Next</Button></DialogStackNext>
      </DialogStackFooter>
    </DialogStackContent>

    {/* Step 2 */}
    <DialogStackContent>
      <DialogStackHeader>
        <DialogStackTitle>Step 2</DialogStackTitle>
      </DialogStackHeader>
      <DialogStackFooter>
        <DialogStackPrevious asChild><Button variant="outline">Back</Button></DialogStackPrevious>
        <Button onClick={() => stackRef.current?.closeAll()}>Finish</Button>
      </DialogStackFooter>
    </DialogStackContent>
  </DialogStackBody>
</DialogStack>
```

Long-press the X button to close all panels at once.  
`DialogStackNext` is automatically disabled when on the last panel; `DialogStackPrevious` on the first.

---

### DropdownMenu

Trigger-based dropdown. Use `asChild` on `DropdownMenuTrigger` to wrap any element.

```tsx
const { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
        DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } = window.UIComponents;

<DropdownMenu>
  <DropdownMenuTrigger asChild><Button variant="outline">Actions</Button></DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuLabel>Record</DropdownMenuLabel>
    <DropdownMenuItem onClick={handleEdit}>Edit</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={handleDelete} className="text-destructive">Delete</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

### Input

Styled text input. Forwards all native `<input>` props.

```tsx
const { Input } = window.UIComponents;

<Input type="text" placeholder="Name" value={val} onChange={e => setVal(e.target.value)} />
```

---

### Label

Text label associated with a form element.

```tsx
const { Label, Input } = window.UIComponents;

<Label htmlFor="name">Name</Label>
<Input id="name" />
```

---

### Menubar

Horizontal navigation bar with dropdown menus.

```tsx
const { Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem } = window.UIComponents;

<Menubar>
  <MenubarMenu>
    <MenubarTrigger>File</MenubarTrigger>
    <MenubarContent>
      <MenubarItem>New</MenubarItem>
      <MenubarItem>Save</MenubarItem>
    </MenubarContent>
  </MenubarMenu>
</Menubar>
```

---

### Pagination

Page navigation. `PaginationLink` accepts `isActive` and `href`.

```tsx
const { Pagination, PaginationContent, PaginationItem,
        PaginationPrevious, PaginationNext, PaginationLink, PaginationEllipsis } = window.UIComponents;

<Pagination>
  <PaginationContent>
    <PaginationItem><PaginationPrevious href="?page=1" /></PaginationItem>
    <PaginationItem><PaginationLink href="?page=2" isActive>2</PaginationLink></PaginationItem>
    <PaginationItem><PaginationEllipsis /></PaginationItem>
    <PaginationItem><PaginationNext href="?page=3" /></PaginationItem>
  </PaginationContent>
</Pagination>
```

---

### Popover

Small floating overlay anchored to a trigger.

```tsx
const { Popover, PopoverTrigger, PopoverContent } = window.UIComponents;

<Popover>
  <PopoverTrigger asChild><Button variant="outline">Filters</Button></PopoverTrigger>
  <PopoverContent align="start" className="w-80">
    Filter form here
  </PopoverContent>
</Popover>
```

---

### Select

Styled single-value select box.

**`SelectTrigger` size:** `default` | `sm`

```tsx
const { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup,
        SelectLabel, SelectItem, SelectSeparator } = window.UIComponents;

<Select value={val} onValueChange={setVal}>
  <SelectTrigger className="w-48">
    <SelectValue placeholder="Choose..." />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Status</SelectLabel>
      <SelectItem value="active">Active</SelectItem>
      <SelectItem value="inactive">Inactive</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>
```

For multi-value selection use `MultiSelect` from `window.JSComponents`.

---

### Separator

Horizontal (default) or vertical divider.

```tsx
const { Separator } = window.UIComponents;

<Separator />
<Separator orientation="vertical" className="h-6" />
```

---

### Sheet

Slide-over panel from screen edge. `side` prop: `top` | `right` | `bottom` | `left` (default `right`).

```tsx
const { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } = window.UIComponents;

<Sheet>
  <SheetTrigger asChild><Button>Open panel</Button></SheetTrigger>
  <SheetContent side="right">
    <SheetHeader>
      <SheetTitle>Edit record</SheetTitle>
      <SheetDescription>Make changes and save.</SheetDescription>
    </SheetHeader>
    {/* form */}
    <SheetFooter>
      <SheetClose asChild><Button variant="outline">Cancel</Button></SheetClose>
      <Button>Save</Button>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

---

### Sidebar

Full sidebar system. Requires `SidebarProvider` at the root.

```tsx
const { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter,
        SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup,
        SidebarGroupLabel, SidebarGroupContent, SidebarTrigger } = window.UIComponents;

<SidebarProvider>
  <Sidebar>
    <SidebarHeader>App name</SidebarHeader>
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild><a href="/dashboard">Dashboard</a></SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
    <SidebarFooter>Footer</SidebarFooter>
  </Sidebar>
  <main><SidebarTrigger />{/* page content */}</main>
</SidebarProvider>
```

Use `useSidebar` hook to access `open`, `setOpen`, `toggle` from any child component.

---

### Skeleton

Loading placeholder that mimics element shape.

```tsx
const { Skeleton } = window.UIComponents;

<Skeleton className="h-4 w-48" />
<Skeleton className="h-10 w-full rounded-md" />
```

---

### Slider

Draggable range input.

```tsx
const { Slider } = window.UIComponents;

<Slider min={0} max={100} step={1} defaultValue={[50]} onValueChange={([v]) => setVal(v)} />
```

---

### Sonner (Toaster)

Toast notifications. Add `<Toaster />` once at the app root, then call `sonner.toast()`.

```tsx
const { Toaster } = window.UIComponents;
// In app root:
<Toaster richColors position="bottom-right" />

// Anywhere in the app:
window.sonner.toast('Saved successfully');
window.sonner.toast.error('Something went wrong');
window.sonner.toast.promise(fetchData(), { loading: 'Loading...', success: 'Done', error: 'Failed' });
```

---

### Switch

Toggle switch control.

```tsx
const { Switch } = window.UIComponents;

<Switch checked={enabled} onCheckedChange={setEnabled} />
```

---

### Table

Scrollable table. `wrapperHeight` on `Table` sets the container's max height for sticky headers.

```tsx
const { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableCaption } = window.UIComponents;

<Table wrapperHeight="max-h-96">
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {rows.map(row => (
      <TableRow key={row.id}>
        <TableCell>{row.name}</TableCell>
        <TableCell>{row.status}</TableCell>
      </TableRow>
    ))}
  </TableBody>
  <TableCaption>Total: {rows.length}</TableCaption>
</Table>
```

---

### Tabs

Tab navigation with content panels. `value` + `onValueChange` for controlled mode.

```tsx
const { Tabs, TabsList, TabsTrigger, TabsContent } = window.UIComponents;

<Tabs defaultValue="general">
  <TabsList>
    <TabsTrigger value="general">General</TabsTrigger>
    <TabsTrigger value="advanced">Advanced</TabsTrigger>
  </TabsList>
  <TabsContent value="general">General settings</TabsContent>
  <TabsContent value="advanced">Advanced settings</TabsContent>
</Tabs>
```

---

### Textarea

Multiline text input. Forwards all native `<textarea>` props.

```tsx
const { Textarea } = window.UIComponents;

<Textarea placeholder="Description" rows={4} value={val} onChange={e => setVal(e.target.value)} />
```

---

### Tooltip

Hover/focus information bubble. Requires `TooltipProvider` at the root.

```tsx
const { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } = window.UIComponents;

// Wrap app root once:
<TooltipProvider>
  {/* ... */}
</TooltipProvider>

// Usage:
<Tooltip>
  <TooltipTrigger asChild><Button size="icon"><Pencil /></Button></TooltipTrigger>
  <TooltipContent>Edit record</TooltipContent>
</Tooltip>
```

---

## window.JSComponents

### MultiSelect

Multi-value (or single-value) select with search, chips, and optional actions.

**Key props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `options` | `{label, value, icon?}[]` | required | Available choices |
| `onValueChange` | `(values: string[]) => void` | required | Called on change |
| `defaultValue` | `string[]` | `[]` | Pre-selected values |
| `mode` | `'multiple' \| 'single'` | `'multiple'` | Selection mode |
| `placeholder` | `string` | `''` | Placeholder text |
| `search` | `string` | `''` | Search input placeholder |
| `notFound` | `string` | `''` | Empty state text |
| `maxCount` | `number` | `3` | Max chips shown before "+N more" |
| `onOpenItem` | `(value: string) => void` | — | Renders ExternalLink icon per chip |
| `onAddNew` | `() => void` | — | Renders "Add" chip button |
| `processing` | `boolean` | — | Disables chip removal while loading |
| `disabled` | `boolean` | — | Disables the whole control |
| `modalPopover` | `boolean` | `false` | Render dropdown in a portal modal |

```tsx
const { MultiSelect } = window.JSComponents;

<MultiSelect
  options={[
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ]}
  defaultValue={selected}
  onValueChange={setSelected}
  placeholder="Select status..."
  search="Search..."
  notFound="No options found"
/>
```

Single-select mode (closes popover on pick):

```tsx
<MultiSelect mode="single" options={options} onValueChange={([v]) => setVal(v)} defaultValue={[val]} />
```

With open-item and add-new actions:

```tsx
<MultiSelect
  options={relatedOptions}
  defaultValue={selectedIds}
  onValueChange={setSelectedIds}
  onOpenItem={id => openRecordDialog(id)}
  onAddNew={() => openCreateDialog()}
/>
```

---

### MonacoEditor

Full-featured code editor. Adapts layout to mobile/tablet/desktop automatically. Syncs theme with app appearance.

**Props:**

| Prop | Type | Description |
|---|---|---|
| `value` | `string` | Current editor content |
| `onChange` | `(value: string) => void` | Called on every change |
| `options` | `{language: string}` | Editor language (e.g. `'json'`, `'javascript'`, `'sql'`) |
| `disabled` | `boolean` | Makes editor read-only and visually dimmed |

```tsx
const { MonacoEditor } = window.JSComponents;

<MonacoEditor
  value={code}
  onChange={setCode}
  options={{ language: 'json' }}
/>
```

---

### HandsonTable

Spreadsheet-style data table via Handsontable. Use for editable grid data.

```tsx
const { HandsonTable } = window.JSComponents;

<HandsonTable data={rows} colHeaders={['Name', 'Value']} rowHeaders={true} licenseKey="non-commercial-and-evaluation" />
```

Refer to [Handsontable docs](https://handsontable.com/docs) for full configuration.

---

### VanillaJSONEditor

Interactive JSON editor (vanilla-jsoneditor). Also available in `window.UIComponents.VanillaJSONEditor`.

```tsx
const { VanillaJSONEditor } = window.JSComponents;

<VanillaJSONEditor content={{ json: data }} onChange={({ json }) => setData(json)} />
```

---

## Global libraries

| Global | Contents |
|---|---|
| `window.React` | React 19 |
| `window.ReactDOM` | ReactDOM 19 |
| `window.LucideReact` | All Lucide icons (`window.LucideReact.Pencil`, etc.) |
| `window.InertiajsReact` | Inertia.js React adapter |
| `window.adminApi` | Typed HTTP client for API calls. Use `*Json` methods for JSON endpoints. |
| `window.axios` | Legacy Axios-compatible compatibility client. Logs a deprecation message; prefer `window.adminApi`. |
| `window.sonner` | Sonner toast API (`toast`, `toast.error`, `toast.promise`, etc.) |
