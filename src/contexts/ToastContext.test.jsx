// src/contexts/ToastContext.test.jsx
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { ToastProvider, useToast } from './ToastContext'

function ToastTrigger({ message, type }) {
  const { toast } = useToast()
  return (
    <button onClick={() => toast(message, type)}>Show Toast</button>
  )
}

function renderWithProvider(message = 'Hello!', type = 'success') {
  return render(
    <ToastProvider>
      <ToastTrigger message={message} type={type} />
    </ToastProvider>
  )
}

describe('ToastContext', () => {
  it('does not show a toast before it is triggered', () => {
    renderWithProvider()
    expect(screen.queryByText('Hello!')).not.toBeInTheDocument()
  })

  it('shows a toast message when toast() is called', async () => {
    renderWithProvider('Account created!', 'success')
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(screen.getByText('Account created!')).toBeInTheDocument()
    })
  })

  it('shows error toasts', async () => {
    renderWithProvider('Something went wrong', 'error')
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
  })
})
