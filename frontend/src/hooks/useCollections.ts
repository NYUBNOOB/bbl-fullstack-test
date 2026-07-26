import { useState, useEffect, useCallback } from "react"
import { apiClient } from "../api/client"
import type { Collection } from "../types"

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.get<Collection[]>("/collections")
      setCollections(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch collections")
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

  return { collections, loading, error, refetch }
}
