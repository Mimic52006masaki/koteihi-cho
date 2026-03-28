// frontend/src/api/client.ts
import axios from "axios";
import toast from "react-hot-toast";
import type { ApiResponse } from "../types";

export const api = axios.create({
    baseURL: "/koteihi-cho/public/api",
    withCredentials: true,
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const url = error?.config?.url ?? "";

        if (error.response?.status === 401 && !url.includes("/auth/")) {
            window.location.href = "/login";
        }

        if (error.response?.data?.error) {
            toast.error(error.response.data.error);
        }

        return Promise.reject(error);
    }
);

export async function apiGet<T>(url: string): Promise<ApiResponse<T>> {
    const res = await api.get<ApiResponse<T>>(url);
    return res.data;
}

export async function apiPost<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    const res = await api.post<ApiResponse<T>>(url, data);
    return res.data;
}