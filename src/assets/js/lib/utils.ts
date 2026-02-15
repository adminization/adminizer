import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}
export function simpleSanitizeHtml(html: string): string {
    return html
        // Removing script tags
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Removing iframe, embed, object
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
        // Removing dangerous event attributes
        .replace(/ on\w+="[^"]*"/g, '')
        .replace(/ on\w+='[^']*'/g, '')
        .replace(/ on\w+=[^ >]+/g, '')
        // Removing javascript: links
        .replace(/href="javascript:[^"]*"/gi, 'href="#"')
        .replace(/href='javascript:[^']*'/gi, 'href="#"');
}