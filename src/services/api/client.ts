import axios from 'axios'

// Server-side (Node) needs an absolute URL to reach the backend; browser uses /api (rewritten by Next.js).
const baseURL =
  typeof window === 'undefined'
    ? `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api`
    : '/api'

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
})
