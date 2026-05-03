import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Login, { userOptions } from '../../../../src/components/auth/Login'

vi.mock('../../../../public/logo.svg', () => ({
  ReactComponent: () => <svg data-testid="logo">Logo</svg>,
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

const navigateMock = vi.fn()

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.getItem.mockReturnValue(JSON.stringify(userOptions.viewer))
  })

  it('does not expose Viewer from the public login UI', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>,
    )

    expect(screen.getByText('Admin demo access')).toBeInTheDocument()
    expect(screen.queryByText('Viewer')).not.toBeInTheDocument()
    expect(screen.queryByText(/Viewers only/i)).not.toBeInTheDocument()
  })

  it('logs in as Admin even when Viewer was previously stored', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: /login/i }))

    expect(localStorage.setItem).toHaveBeenLastCalledWith(
      'userData',
      JSON.stringify(userOptions.admin),
    )
    expect(navigateMock).toHaveBeenCalledWith('/workspace')
  })

  it('keeps the internal Viewer role available for role-aware tests', () => {
    expect(userOptions.viewer).toEqual({
      id: 'viewer',
      name: 'Viewer',
      role: 'VIEWER_ROLE',
    })
  })
})
