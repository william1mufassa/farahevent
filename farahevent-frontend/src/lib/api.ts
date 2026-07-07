import axios, { type AxiosInstance } from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 15000,
});

export type ApiError = {
  message: string;
  status?: number;
};

export function toApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail;
    return {
      message:
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map((d) => d.msg ?? JSON.stringify(d)).join(', ')
            : err.message,
      status: err.response?.status,
    };
  }
  return { message: err instanceof Error ? err.message : 'Erreur inconnue' };
}
