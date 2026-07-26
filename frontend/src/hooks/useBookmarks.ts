import { useState, useEffect, useCallback } from "react"
import { apiClient } from "../api/client"
import type { Bookmark } from "../types"

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.get<Bookmark[]>("/bookmarks")
      setBookmarks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch bookmarks")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refetch = useCallback(() => {
    fetchData()
  }, [fetchData])

  return { bookmarks, loading, error, refetch }
}
