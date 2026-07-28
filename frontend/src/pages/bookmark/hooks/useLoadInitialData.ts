import { bookmarkService } from "@/services/bookmark";
import { collectionService } from "@/services/collection";
import type { BookmarkDetail } from "@/types/bookmark/bookmarkDetail";
import type { CollectionDetail } from "@/types/collection/collectionDetail";
import { useCallback, useEffect, useState } from "react";

export function useLoadInitialData() {
  const [bookmarks, setBookmarks] = useState<BookmarkDetail[]>([]);
  const [collections, setCollections] = useState<CollectionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const callGetBookmarks = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const data = await bookmarkService.getBookmarks();
      setBookmarks(data);
      return true;
    } catch {
      setError("Failed to load bookmarks");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ชุด collection ของผู้ใช้ ใช้เป็นตัวเลือกใน dropdown ของ dialog form
  // ตั้งใจไม่แตะ `loading` เพราะเป็นข้อมูลรอง ไม่ควรทำให้ทั้งหน้าค้างเป็น spinner
  const callGetCollections = useCallback(async (): Promise<boolean> => {
    try {
      const data = await collectionService.getCollections();
      setCollections(data);
      return true;
    } catch {
      setError("Failed to load collections");
      return false;
    }
  }, []);

  const loadInitialData = useCallback(
    () => Promise.all([callGetBookmarks(), callGetCollections()]),
    [callGetBookmarks, callGetCollections],
  );

  const reloadBookmarks = useCallback(
    () => callGetBookmarks(),
    [callGetBookmarks],
  );

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  return {
    bookmarks,
    collections,
    loading,
    error,
    loadInitialData,
    reloadBookmarks,
  };
}
