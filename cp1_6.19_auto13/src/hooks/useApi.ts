import { useState, useCallback } from 'react';
import axios, { AxiosRequestConfig } from 'axios';

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (config?: AxiosRequestConfig) => Promise<T | null>;
  reset: () => void;
}

export function useApi<T = unknown>(
  defaultConfig: AxiosRequestConfig = {}
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (config?: AxiosRequestConfig): Promise<T | null> => {
      setLoading(true);
      setError(null);
      try {
        const mergedConfig: AxiosRequestConfig = { ...defaultConfig, ...config };
        const response = await axios(mergedConfig);
        setData(response.data as T);
        return response.data as T;
      } catch (err) {
        let message = '请求失败，请稍后重试';
        if (axios.isAxiosError(err)) {
          if (err.response) {
            message = `服务器错误 (${err.response.status})`;
          } else if (err.request) {
            message = '网络连接失败，请检查网络';
          } else {
            message = err.message || message;
          }
        } else if (err instanceof Error) {
          message = err.message;
        }
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [defaultConfig]
  );

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return { data, loading, error, execute, reset };
}
