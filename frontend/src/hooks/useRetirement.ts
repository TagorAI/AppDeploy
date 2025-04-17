import { useState } from 'react'
import { useAuth } from './useAuth'

interface RetirementPlan {
  monthlyIncome: number
  monthlyExpenses: number
  currentSavings: number
  monthlyContribution: number
  retirementAge: number
  lifeExpectancy: number
}

interface RetirementScenario extends RetirementPlan {
  adjustedRetirementAge?: number
  adjustedContribution?: number
  riskLevel?: 'conservative' | 'moderate' | 'aggressive'
}

export function useRetirement() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { getToken } = useAuth()

  const fetchCurrentPlan = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const response = await fetch('/api/retirement/current-plan', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) throw new Error('Failed to fetch retirement plan')
      return await response.json()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const calculateScenario = async (scenario: RetirementScenario) => {
    setIsLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const response = await fetch('/api/retirement/scenarios', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scenario)
      })
      if (!response.ok) throw new Error('Failed to calculate scenario')
      return await response.json()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isLoading,
    error,
    fetchCurrentPlan,
    calculateScenario
  }
} 