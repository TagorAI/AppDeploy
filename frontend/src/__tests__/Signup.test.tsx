import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Signup from '../pages/Signup'

// Mock fetch function
global.fetch = jest.fn()

describe('Signup Component', () => {
  beforeEach(() => {
    // Clear mock before each test
    jest.clearAllMocks()
  })

  it('validates required fields', async () => {
    render(
      <BrowserRouter>
        <Signup />
      </BrowserRouter>
    )

    // Try to move to next step without required fields
    const nextButton = screen.getByText('Next')
    fireEvent.click(nextButton)

    // Should show error for missing required fields
    expect(screen.getByText('Please enter your name')).toBeInTheDocument()
  })

  it('allows optional fields to be empty', async () => {
    // Mock successful signup response
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Success' })
    })

    render(
      <BrowserRouter>
        <Signup />
      </BrowserRouter>
    )

    // Fill only required fields
    fireEvent.change(screen.getByLabelText('Email'), { 
      target: { value: 'test@example.com' } 
    })
    fireEvent.change(screen.getByLabelText('Password'), { 
      target: { value: 'password123' } 
    })
    fireEvent.change(screen.getByLabelText('Name'), { 
      target: { value: 'Test User' } 
    })
    fireEvent.change(screen.getByLabelText('Country of residence'), { 
      target: { value: 'Canada' } 
    })

    // Move through all steps
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByText('Next'))
    }

    // Submit form
    const submitButton = screen.getByText('Create account')
    fireEvent.click(submitButton)

    // Should successfully submit with only required fields
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('test@example.com')
        })
      )
    })
  })
}) 