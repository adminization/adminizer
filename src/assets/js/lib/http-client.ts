import { http } from '@inertiajs/react';
import type { HttpRequestHeaders, HttpResponseHeaders } from '@inertiajs/core';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';
type QueryParams = Record<string, unknown>;

interface HttpRequestOptions {
    headers?: HttpRequestHeaders;
    params?: QueryParams;
    signal?: AbortSignal;
}

interface HttpResponse<T> {
    data: T;
    status: number;
    headers: HttpResponseHeaders;
}

const noCacheHeaders: HttpRequestHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
};

const appendCacheBuster = (params?: QueryParams): QueryParams => ({
    ...(params ?? {}),
    _ts: Date.now(),
});

const parseResponseData = <T>(payload: string): T => {
    if (payload === '') {
        return '' as T;
    }

    try {
        return JSON.parse(payload) as T;
    } catch {
        return payload as T;
    }
};

const request = async <TResponse>(
    method: HttpMethod,
    url: string,
    data?: unknown,
    options?: HttpRequestOptions
): Promise<HttpResponse<TResponse>> => {
    const response = await http.getClient().request({
        method,
        url,
        data,
        params: appendCacheBuster(options?.params),
        headers: {
            ...noCacheHeaders,
            ...(options?.headers ?? {}),
        },
        signal: options?.signal,
    });

    return {
        data: parseResponseData<TResponse>(response.data),
        status: response.status,
        headers: response.headers,
    };
};

export const apiHttp = {
    get: <TResponse>(url: string, options?: HttpRequestOptions) =>
        request<TResponse>('get', url, undefined, options),
    post: <TResponse>(url: string, data?: unknown, options?: HttpRequestOptions) =>
        request<TResponse>('post', url, data, options),
    put: <TResponse>(url: string, data?: unknown, options?: HttpRequestOptions) =>
        request<TResponse>('put', url, data, options),
    patch: <TResponse>(url: string, data?: unknown, options?: HttpRequestOptions) =>
        request<TResponse>('patch', url, data, options),
    delete: <TResponse>(url: string, data?: unknown, options?: HttpRequestOptions) =>
        request<TResponse>('delete', url, data, options),
};

export type { HttpRequestOptions, HttpResponse };
