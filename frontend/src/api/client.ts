import axios from "axios";

export const api = axios.create({
    baseURL: "http://localhost:8888/koteihi-cho/public/api",
    withCredentials: true,
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const url = error?.config?.url ?? "";

        // authチェックは除外
        if (error.response?.status === 401 && !url.includes("/auth/")) {
            window.location.href = "/login";
        }

        return Promise.reject(error);
    }
);