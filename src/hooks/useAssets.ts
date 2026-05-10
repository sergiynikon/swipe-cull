import { useCallback, useEffect, useRef, useState } from 'react';

import { CleanerAsset, loadPage } from '../lib/media';

type State = {
  assets: CleanerAsset[];
  totalCount: number;
  hasNextPage: boolean;
  loading: boolean;
  error: string | null;
  permissionDenied: boolean;
};

const initialState: State = {
  assets: [],
  totalCount: 0,
  hasNextPage: true,
  loading: false,
  error: null,
  permissionDenied: false,
};

function isPermissionError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('permission') || m.includes('not authorized') || m.includes('denied');
}

export function useAssets() {
  const [state, setState] = useState<State>(initialState);
  const cursorRef = useRef<string | undefined>(undefined);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const page = await loadPage(cursorRef.current);
      cursorRef.current = page.endCursor;
      setState((s) => ({
        assets: [...s.assets, ...page.assets],
        totalCount: page.totalCount,
        hasNextPage: page.hasNextPage,
        loading: false,
        error: null,
        permissionDenied: false,
      }));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load photos';
      setState((s) => ({
        ...s,
        loading: false,
        error: message,
        permissionDenied: isPermissionError(message),
      }));
    } finally {
      loadingRef.current = false;
    }
  }, []);

  const reset = useCallback(() => {
    cursorRef.current = undefined;
    setState(initialState);
  }, []);

  useEffect(() => {
    loadMore();
  }, [loadMore]);

  return { ...state, loadMore, reset };
}
