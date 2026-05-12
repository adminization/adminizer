import { http } from '@inertiajs/react';
import type { HttpRequestHeaders, HttpResponseHeaders } from '@inertiajs/core';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';
type QueryParams = Record<string, unknown>;

interface HttpRequestOptions {
    headers?: HttpRequestHeaders;
    params?: QueryParams;
    signal?: AbortSignal;
    responseType?: 'arraybuffer' | 'blob' | 'document' | 'json' | 'text';
}

interface HttpResponse<T> {
    data: T;
    status: number;
    headers: HttpResponseHeaders;
}

interface HttpResponseError<T = unknown> extends Error {
    response?: HttpResponse<T>;
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

const normalizeHeaders = (headers: Headers): HttpResponseHeaders => {
    const result: HttpResponseHeaders = {};
    headers.forEach((value, key) => {
        result[key.toLowerCase()] = value;
    });
    return result;
};

const getCookie = (name: string): string | undefined => {
    if (typeof document === 'undefined') {
        return undefined;
    }

    const cookie = document.cookie
        .split('; ')
        .find((part) => part.startsWith(`${encodeURIComponent(name)}=`));

    return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : undefined;
};

const buildUrlWithParams = (url: string, params?: QueryParams): string => {
    const nextUrl = new URL(url, window.location.origin);

    Object.entries(appendCacheBuster(params)).forEach(([key, value]) => {
        if (value === undefined || value === null) {
            return;
        }

        if (Array.isArray(value)) {
            value.forEach((item) => nextUrl.searchParams.append(key, String(item)));
            return;
        }

        nextUrl.searchParams.set(key, String(value));
    });

    return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
};

const requestBinary = async <TResponse>(
    method: HttpMethod,
    url: string,
    data?: unknown,
    options?: HttpRequestOptions
): Promise<HttpResponse<TResponse>> => {
    const xsrfToken = getCookie('XSRF-TOKEN');
    const headers = new Headers(noCacheHeaders as Record<string, string>);

    headers.set('X-Requested-With', 'XMLHttpRequest');
    if (xsrfToken) {
        headers.set('x-xsrf-token', xsrfToken);
    }

    Object.entries(options?.headers ?? {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            headers.set(key, String(value));
        }
    });

    let body: BodyInit | undefined;
    if (data instanceof FormData) {
        body = data;
    } else if (data !== undefined && data !== null) {
        body = typeof data === 'string' ? data : JSON.stringify(data);
        if (!headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }
    }

    const response = await fetch(buildUrlWithParams(url, options?.params), {
        method: method.toUpperCase(),
        body,
        headers,
        credentials: 'same-origin',
        signal: options?.signal,
    });
    const responseHeaders = normalizeHeaders(response.headers);
    let responseData: unknown;

    switch (options?.responseType) {
        case 'arraybuffer':
            responseData = await response.arrayBuffer();
            break;
        case 'document': {
            const text = await response.text();
            const parser = new DOMParser();
            const mimeType = responseHeaders['content-type']?.includes('xml')
                ? 'application/xml'
                : 'text/html';
            responseData = parser.parseFromString(text, mimeType);
            break;
        }
        default:
            responseData = await response.blob();
            break;
    }

    const httpResponse = {
        data: responseData as TResponse,
        status: response.status,
        headers: responseHeaders,
    };

    if (!response.ok) {
        const error = new Error(`Request failed with status ${response.status}`) as HttpResponseError<TResponse>;
        error.response = httpResponse;
        throw error;
    }

    return httpResponse;
};

const request = async <TResponse>(
    method: HttpMethod,
    url: string,
    data?: unknown,
    options?: HttpRequestOptions
): Promise<HttpResponse<TResponse>> => {
    if (options?.responseType && options.responseType !== 'json' && options.responseType !== 'text') {
        return requestBinary<TResponse>(method, url, data, options);
    }

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
