import axios from 'axios'
import { attachInterceptors } from './interceptors'

const baseURL = import.meta.env.VITE_API_URL

if (!baseURL && import.meta.env.PROD) {
  console.error('VITE_API_URL is not set. API requests will fail.')
}

export const apiClient = axios.create({
  baseURL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

attachInterceptors(apiClient)
