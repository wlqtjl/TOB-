/**
 * useApiData — Hook that fetches from API with mock data fallback
 *
 * Pattern:
 * 1. Immediately returns mock data for instant rendering (SSR-friendly)
 * 2. In background, attempts API fetch
 * 3. If API succeeds, replaces mock data with live data
 * 4. If API fails, continues showing mock data seamlessly
 *
 * This allows the app to work both with and without the backend running.
 */

'use client';

import { useState, useEffect, useRef } from 'react';

type ApiState<T> = {
  data: T;
  isFromApi: boolean;
  isLoading: boolean;
  error: string | null;
};

/**
 * Fetch data from API with mock fallback
 * @param mockData - Immediate mock data to show
 * @param apiFetcher - Async function that returns data from API (null = unavailable)
 */
export function useApiData<T>(
  mockData: T,
  apiFetcher: () => Promise<T | null>,
): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({
    data: mockData,
    isFromApi: false,
    isLoading: true,
    error: null,
  });

  const fetcherRef = useRef(apiFetcher);
  fetcherRef.current = apiFetcher;

  useEffect(() => {
    let cancelled = false;

    async function tryApi() {
      try {
        const apiData = await fetcherRef.current();
        if (!cancelled && apiData !== null) {
          setState({
            data: apiData,
            isFromApi: true,
            isLoading: false,
            error: null,
          });
          return;
        }
      } catch {
        // API unavailable — use mock data
      }

      if (!cancelled) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
        }));
      }
    }

    void tryApi();
    return () => { cancelled = true; };
  }, []);

  return state;
}
