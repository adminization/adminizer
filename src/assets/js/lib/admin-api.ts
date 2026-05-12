import type { HttpRequestHeaders } from '@inertiajs/core';
import { apiHttp } from '@/lib/http-client';

type Method = 'get' | 'post' | 'put' | 'delete';
type QueryParams = Record<string, unknown>;

export interface AdminApiRequestConfig {
    headers?: HttpRequestHeaders;
    params?: QueryParams;
    signal?: AbortSignal;
}

export interface AdminApiResponse<T> {
    data: T;
    status: number;
    headers: Record<string, string>;
}

const noCacheHeaders: HttpRequestHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
};

const looksLikeHtml = (value: unknown): boolean => {
    if (typeof value !== 'string') {
        return false;
    }

    const normalized = value.trim().toLowerCase();
    return normalized.startsWith('<!doctype html') || normalized.startsWith('<html') || normalized.startsWith('<');
};

const appendCacheBuster = (params: QueryParams | undefined): QueryParams => {
    return {
        ...(params ?? {}),
        _ts: Date.now(),
    };
};

const requestJson = async <T>(method: Method, url: string, data?: unknown, config?: AdminApiRequestConfig): Promise<AdminApiResponse<T>> => {
    const mergedConfig: AdminApiRequestConfig = {
        ...config,
        headers: {
            ...noCacheHeaders,
            ...(config?.headers ?? {}),
        },
        params: appendCacheBuster(config?.params),
    };

    try {
        let response: AdminApiResponse<T>;
        if (method === 'get') {
            response = await apiHttp.get<T>(url, mergedConfig);
        } else if (method === 'post') {
            response = await apiHttp.post<T>(url, data, mergedConfig);
        } else if (method === 'put') {
            response = await apiHttp.put<T>(url, data, mergedConfig);
        } else {
            response = await apiHttp.delete<T>(url, data, mergedConfig);
        }

        const contentType = String(response.headers?.['content-type'] ?? '').toLowerCase();
        if ((contentType && !contentType.includes('application/json')) || looksLikeHtml(response.data)) {
            throw new Error(
                `Expected JSON response from "${url}", but received "${contentType || 'unknown'}". ` +
                'This usually means the session expired and server returned an HTML login page.',
            );
        }

        return response;
    } catch (error) {
        const httpError = error as { response?: { headers?: Record<string, string>; data?: unknown } };
        const responseContentType = String(httpError.response?.headers?.['content-type'] ?? '').toLowerCase();
        if (looksLikeHtml(httpError.response?.data) || responseContentType.includes('text/html')) {
            throw new Error(
                'Server returned HTML instead of JSON. Most likely auth session expired. ' +
                'Please reload the page and log in again.',
            );
        }
        throw error;
    }
};

export const adminApi = {
    getJson: <T>(url: string, config?: AdminApiRequestConfig) => requestJson<T>('get', url, undefined, config),
    postJson: <T>(url: string, data?: unknown, config?: AdminApiRequestConfig) => requestJson<T>('post', url, data, config),
    putJson: <T>(url: string, data?: unknown, config?: AdminApiRequestConfig) => requestJson<T>('put', url, data, config),
    deleteJson: <T>(url: string, data?: unknown, config?: AdminApiRequestConfig) => requestJson<T>('delete', url, data, config),
};
