const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

export async function getHealthStatus() {
  const response = await fetch(`${apiBaseUrl}/health`)

  if (!response.ok) {
    throw new Error(`Backend health check failed with status ${response.status}`)
  }

  return response.json()
}
