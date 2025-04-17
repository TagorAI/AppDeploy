import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Component that scrolls to the top of the page when the route changes
 * This fixes scroll position issues when navigating between pages
 */
export default function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
} 