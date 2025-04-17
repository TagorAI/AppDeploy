import { useState } from 'react'

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false)

  const getToken = async () => {
    return localStorage.getItem('access_token')
  }

  return {
    isLoading,
    getToken
  }
} 