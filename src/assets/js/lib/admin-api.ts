import axios, {AxiosError, AxiosRequestConfig, AxiosResponse} from 'axios';

type Method = 'get' | 'post' | 'put' | 'delete';

const noCacheHeaders = {
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

const appendCacheBuster = (params: Record<string, unknown> | undefined): Record<string, unknown> => {
    return {
        ...(params ?? {}),
        _ts: Date.now(),
    };
};

const requestJson = async <T>(method: Method, url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    const mergedConfig: AxiosRequestConfig = {
        ...config,
        headers: {
            ...noCacheHeaders,
            ...(config?.headers ?? {}),
        },
        params: appendCacheBuster(config?.params as Record<string, unknown> | undefined),
    };

    try {
        let response: AxiosResponse<T>;
        if (method === 'get') {
            response = await axios.get<T>(url, mergedConfig);
        } else if (method === 'post') {
            response = await axios.post<T>(url, data, mergedConfig);
        } else if (method === 'put') {
            response = await axios.put<T>(url, data, mergedConfig);
        } else {
            response = await axios.delete<T>(url, {...mergedConfig, data});
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
        if (error instanceof AxiosError) {
            const responseContentType = String(error.response?.headers?.['content-type'] ?? '').toLowerCase();
            if (looksLikeHtml(error.response?.data) || responseContentType.includes('text/html')) {
                throw new Error(
                    'Server returned HTML instead of JSON. Most likely auth session expired. ' +
                    'Please reload the page and log in again.',
                );
            }
        }
        throw error;
    }
};

export const adminApi = {
    getJson: <T>(url: string, config?: AxiosRequestConfig) => requestJson<T>('get', url, undefined, config),
    postJson: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => requestJson<T>('post', url, data, config),
    putJson: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => requestJson<T>('put', url, data, config),
    deleteJson: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) => requestJson<T>('delete', url, data, config),
};
