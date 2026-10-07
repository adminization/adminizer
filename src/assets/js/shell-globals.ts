import * as shell from '@/shell';

export function registerShellComponents(): void {
    //@ts-ignore
    window.AdminizerShell ??= {};
    //@ts-ignore
    Object.assign(window.AdminizerShell, shell);
}
