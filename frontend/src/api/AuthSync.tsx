import { useEffect } from "react"
import { apiClient } from "./client"
import { useAuth } from "../stores/auth/authContext"

/**
 * Syncs the auth token provider into the shared apiClient.
 *
 * Mount this once near the app root, inside the AuthContextProvider,
 * so the API client can fetch fresh tokens for every request without
 * each hook needing to import useAuth directly.
 */
export default function AuthSync() {
  const { getToken } = useAuth()

  useEffect(() => {
    apiClient.setTokenProvider(getToken)
  }, [getToken])

  return null
}
