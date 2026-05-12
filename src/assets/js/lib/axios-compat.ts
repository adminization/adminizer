import type { HttpRequestHeaders } from '@inertiajs/core';
import { apiHttp } from '@/lib/http-client';

type QueryParams = Record<string, unknown>;

export interface AxiosRequestConfig {
    headers?: HttpRequestHeaders;
    params?: QueryParams;
    signal?: AbortSignal;
    data?: unknown;
}

export interface AxiosResponse<T = unknown> {
    data: T;
    status: number;
    headers: Record<string, string>;
}

export interface AxiosError<T = unknown> extends Error {
    isAxiosError: true;
    response?: AxiosResponse<T>;
}

const toAxiosError = (error: unknown): AxiosError => {
    if (typeof error === 'object' && error !== null && 'isAxiosError' in error) {
        return error as AxiosError;
    }

    const message = error instanceof Error ? error.message : 'Request failed';
    const nextError = new Error(message) as AxiosError;
    nextError.isAxiosError = true;

    const response = (error as { response?: AxiosResponse }).response;
    if (response) {
        nextError.response = response;
    }

    return nextError;
};

const axios = {
    async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        try {
            return await apiHttp.get<T>(url, config);
        } catch (error) {
            throw toAxiosError(error);
        }
    },

    async post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        try {
            return await apiHttp.post<T>(url, data, config);
        } catch (error) {
            throw toAxiosError(error);
        }
    },

    async put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        try {
            return await apiHttp.put<T>(url, data, config);
        } catch (error) {
            throw toAxiosError(error);
        }
    },

    async patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        try {
            return await apiHttp.patch<T>(url, data, config);
        } catch (error) {
            throw toAxiosError(error);
        }
    },

    async delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        try {
            return await apiHttp.delete<T>(url, config?.data, config);
        } catch (error) {
            throw toAxiosError(error);
        }
    },

    isAxiosError(error: unknown): error is AxiosError {
        return Boolean(error && typeof error === 'object' && 'isAxiosError' in error);
    },
};

export default axios;
