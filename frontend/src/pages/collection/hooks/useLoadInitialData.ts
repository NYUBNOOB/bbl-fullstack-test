import { collectionService } from "@/services/collection";
import type { CollectionDetail } from "@/types/collection/collectionDetail";
import { useCallback, useEffect, useState } from "react";

export function useLoadInitialData() {
  const [collections, setCollections] = useState<CollectionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const callGetCollections = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response = await collectionService.getCollections();
      setCollections(response);
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load collections",
      );
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInitialData = useCallback(
    () => callGetCollections(),
    [callGetCollections],
  );

  const reloadCollections = useCallback(
    () => callGetCollections(),
    [callGetCollections],
  );

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  return {
    collections,
    loading,
    error,
    loadInitialData,
    reloadCollections,
  };
}
