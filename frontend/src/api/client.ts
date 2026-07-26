const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"

type TokenProvider = () => Promise<string | null>

class ApiClientClass {
  private tokenProvider: TokenProvider = async () => null

  setTokenProvider(provider: TokenProvider) {
    this.tokenProvider = provider
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await this.tokenProvider()
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }))
      throw new Error(error.message || `HTTP ${res.status}`)
    }

    if (res.status === 204) {
      return undefined as T
    }

    return res.json()
  }

  get<T>(path: string) {
    return this.request<T>(path)
  }

  post<T>(path: string, data: unknown) {
    return this.request<T>(path, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  put<T>(path: string, data: unknown) {
    return this.request<T>(path, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  patch<T>(path: string, data: unknown) {
    return this.request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  }

  delete(path: string) {
    return this.request(path, { method: "DELETE" })
  }
}

export const apiClient = new ApiClientClass()
