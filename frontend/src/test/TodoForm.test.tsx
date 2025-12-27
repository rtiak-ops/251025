import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TodoForm from '../components/TodoForm'

// テスト用のQueryClientを作成
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

describe('TodoForm', () => {
  it('タスクを入力して送信できる', async () => {
    const mockOnAdd = vi.fn()
    const queryClient = createTestQueryClient()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <TodoForm onAdd={mockOnAdd} />
      </QueryClientProvider>
    )

    // 入力フィールドを探す
    const input = screen.getByPlaceholderText(/何をしますか？/i)
    expect(input).toBeInTheDocument()

    // タスクを入力
    await user.type(input, 'テストタスク')
    expect(input).toHaveValue('テストタスク')
  })

  it('空のタスクは送信できない', async () => {
    const mockOnAdd = vi.fn()
    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <TodoForm onAdd={mockOnAdd} />
      </QueryClientProvider>
    )

    const input = screen.getByPlaceholderText(/何をしますか？/i)
    expect(input).toHaveValue('')
  })
})
