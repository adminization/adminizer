import { useState, useRef, useCallback, memo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePage } from '@inertiajs/react';
import { MessageSquarePlus, Paperclip, X, Loader2, CheckCircle2 } from 'lucide-react';
import { apiHttp } from '@/lib/http-client';
import {
    DialogStack,
    DialogStackTrigger,
    DialogStackOverlay,
    DialogStackBody,
    DialogStackContent,
    DialogStackHeader,
    DialogStackTitle,
    DialogStackFooter,
} from '@/components/ui/dialog-stack';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SharedData } from '@/types';
import { useI18n } from '@/hooks/use-i18n';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const getErrorMessage = (error: unknown, fallback: string): string => {
    const responseData = (error as { response?: { data?: unknown } })?.response?.data;
    if (!responseData) return fallback;

    if (typeof responseData === 'string') {
        try {
            const parsed = JSON.parse(responseData) as { error?: string; message?: string };
            return parsed.error ?? parsed.message ?? fallback;
        } catch {
            return responseData || fallback;
        }
    }

    if (typeof responseData === 'object') {
        const payload = responseData as { error?: string; message?: string };
        return payload.error ?? payload.message ?? fallback;
    }

    return fallback;
};

interface FeedbackFormProps {
    routePrefix: string
    triggerLabel: string | null
    placeholder: string | null
    t: (key: string) => string
    onClose: () => void
}

// Isolated so that typing in fields does NOT re-render the parent DialogStack
const FeedbackForm = memo(({ routePrefix, triggerLabel, placeholder, t, onClose }: FeedbackFormProps) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const addFiles = (incoming: FileList | null) => {
        if (!incoming) return;
        const newErrors: Record<string, string> = {};
        const valid: File[] = [];
        Array.from(incoming).forEach((f) => {
            if (f.size > MAX_FILE_SIZE) {
                newErrors[f.name] = t('File size exceeds the 5 MB limit');
            } else {
                valid.push(f);
            }
        });
        setFiles((prev) => [...prev, ...valid]);
        if (Object.keys(newErrors).length) setErrors((e) => ({ ...e, ...newErrors }));
    };

    const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) { setErrors({ title: t('Title is required') }); return; }

        setSending(true);
        setErrors({});

        const form = new FormData();
        form.append('title', title.trim());
        form.append('description', description.trim());
        files.forEach((f) => form.append('files', f));

        try {
            await apiHttp.post(`${routePrefix}/api/feedback`, form);
            setSuccess(true);
        } catch (err: unknown) {
            const msg = getErrorMessage(err, t('Internal server error'));
            setErrors({ _global: msg });
            setSending(false);
        }
    };

    useEffect(() => {
        if (!success) return;
        const timer = setTimeout(onClose, 2000);
        return () => clearTimeout(timer);
    }, [success, onClose]);

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
                <CheckCircle2 size={48} className="text-green-500 dark:text-green-400" />
                <p className="text-base font-medium">{t('Feedback sent successfully')}</p>
            </div>
        );
    }

    return (
        <>
            <DialogStackHeader className="mb-4">
                <DialogStackTitle>{triggerLabel ?? t('Feedback')}</DialogStackTitle>
                {placeholder && (
                    <p className="text-sm text-muted-foreground mt-1">{placeholder}</p>
                )}
            </DialogStackHeader>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div className="space-y-1.5">
                    <Label htmlFor="fb-title">{t('Title')}</Label>
                    <Input
                        id="fb-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={sending}
                        placeholder={t('Title')}
                        className={errors.title ? 'border-destructive' : ''}
                    />
                    {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="fb-desc">{t('Description')}</Label>
                    <Textarea
                        id="fb-desc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={sending}
                        placeholder={t('Description')}
                        rows={5}
                        className="resize-none"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label>{t('Attach files')}</Label>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={sending}
                        >
                            <Paperclip size={14} className="mr-1" />
                            {t('Attach files')}
                        </Button>
                        <span className="text-xs text-muted-foreground">{t('Max 5 MB per file')}</span>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => addFiles(e.target.files)}
                        disabled={sending}
                    />
                    {files.length > 0 && (
                        <ul className="mt-2 space-y-1">
                            {files.map((f, i) => (
                                <li key={i} className="flex items-center justify-between rounded-md border bg-muted/40 px-3 py-1.5 text-xs">
                                    <span className="truncate max-w-[340px]">{f.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(i)}
                                        className="ml-2 text-muted-foreground hover:text-destructive transition-colors"
                                        aria-label={t('Remove file')}
                                        disabled={sending}
                                    >
                                        <X size={13} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    {Object.entries(errors)
                        .filter(([k]) => k !== 'title' && k !== '_global')
                        .map(([k, v]) => <p key={k} className="text-xs text-destructive">{v}</p>)}
                </div>

                {errors._global && <p className="text-xs text-destructive">{errors._global}</p>}

                <DialogStackFooter>
                    <Button type="submit" disabled={sending}>
                        {sending ? (
                            <><Loader2 size={14} className="mr-1.5 animate-spin" />{t('Sending...')}</>
                        ) : t('Send')}
                    </Button>
                </DialogStackFooter>
            </form>
        </>
    );
});

FeedbackForm.displayName = 'FeedbackForm';

export function FeedbackModal() {
    const page = usePage<SharedData>();
    const { t } = useI18n();
    const routePrefix = (page.props as any).routePrefix as string ?? window.routePrefix ?? '';
    const triggerLabel: string | null = (page.props as any).feedbackTriggerLabel ?? null;
    const placeholder: string | null = (page.props as any).feedbackPlaceholder ?? null;

    const [open, setOpen] = useState(false);
    const [formKey, setFormKey] = useState(0);

    const handleClose = useCallback(() => setOpen(false), []);
    const handleOpenChange = useCallback((v: boolean) => {
        setOpen(v);
        if (!v) setFormKey(k => k + 1); // сбрасываем форму при закрытии
    }, []);

    return (
        <DialogStack open={open} onOpenChange={handleOpenChange}>
            <DialogStackTrigger asChild>
                <button
                    className="flex items-center gap-1.5 text-xs opacity-60 hover:opacity-100 transition-opacity cursor-pointer mt-1 mx-auto"
                    aria-label={triggerLabel ?? t('Send feedback')}
                >
                    <MessageSquarePlus size={13} />
                    {triggerLabel ?? t('Send feedback')}
                </button>
            </DialogStackTrigger>

            {createPortal(<DialogStackOverlay />, document.body)}

            <DialogStackBody>
                <DialogStackContent>
                    <FeedbackForm
                        key={formKey}
                        routePrefix={routePrefix}
                        triggerLabel={triggerLabel}
                        placeholder={placeholder}
                        t={t}
                        onClose={handleClose}
                    />
                </DialogStackContent>
            </DialogStackBody>
        </DialogStack>
    );
}
