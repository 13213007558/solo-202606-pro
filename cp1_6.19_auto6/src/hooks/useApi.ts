import { useState, useCallback } from 'react';
import axios, { AxiosRequestConfig } from 'axios';

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  request: (config?: AxiosRequestConfig) => Promise<T | null>;
}

export function useApi<T = unknown>(
  defaultConfig?: AxiosRequestConfig
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(
    async (config?: AxiosRequestConfig): Promise<T | null> => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios({ ...defaultConfig, ...config });
        setData(response.data);
        return response.data;
      } catch (err) {
        let message = '请求失败，请稍后重试';
        if (axios.isAxiosError(err)) {
          if (err.response) {
            message = `服务器错误 (${err.response.status})`;
          } else if (err.request) {
            message = '网络连接失败，请检查网络';
          }
        }
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [defaultConfig]
  );

  return { data, loading, error, request };
}

export interface Recipe {
  id: number;
  name: string;
  ingredients: string[];
  match_percentage: number;
  cook_time: number;
  description: string;
  image_url?: string;
  steps?: string;
  categories?: string[];
}

export interface RecommendResponse {
  recipes: Recipe[];
}

export interface ShareRecipeRequest {
  name: string;
  ingredients: string[];
  steps: string;
  image_url?: string;
  categories: string[];
}

export interface ShareRecipeResponse {
  success: boolean;
  message: string;
}
