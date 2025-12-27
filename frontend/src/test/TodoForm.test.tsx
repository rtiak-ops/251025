import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TodoForm from '../components/TodoForm'

// 1. api.ts のモック化 (axios本体ではなく、作成したapiインスタンスと関数を操作)
vi.mock('../api', () => {
  const mockApi = {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
  }
  return {
    default: mockApi,
    api: mockApi,
    createTodo: vi.fn(),
    breakdownTask: vi.fn(),
    getTodos: vi.fn(),
    clearToken: vi.fn(),
    getStoredToken: vi.fn(),
    saveToken: vi.fn(),
    registerUser: vi.fn(),
    loginUser: vi.fn(),
    updateTodo: vi.fn(),
    deleteTodo: vi.fn(),
    reorderTodos: vi.fn(),
  }
})

// モック化された各関数を取得するためのヘルパー
import { createTodo as mockCreateTodo } from '../api'

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

describe('TodoForm', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
    vi.clearAllMocks()
  })

  it('タスクを入力して送信できる', async () => {
    const mockOnAdd = vi.fn().mockResolvedValue({})
    // 2. createTodo が成功するように設定
    vi.mocked(mockCreateTodo).mockResolvedValue({ id: 1, title: 'テストタスク', description: '', completed: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), owner_id: 1, order: 0 })

    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <TodoForm onAdd={mockOnAdd} />
      </QueryClientProvider>
    )

    const input = screen.getByPlaceholderText(/何をしますか？/i)
    const button = screen.getByRole('button', { name: /追加/i })

    await user.type(input, 'テストタスク')
    await user.click(button)

    // 送信ボタンが押された後の非同期処理を待つ
    await waitFor(() => {
      expect(mockOnAdd).toHaveBeenCalled()
    })

    expect(input).toHaveValue('')
  })

  it('空のタスクは送信できない', async () => {
    const mockOnAdd = vi.fn()
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <TodoForm onAdd={mockOnAdd} />
      </QueryClientProvider>
    )

    const button = screen.getByRole('button', { name: /追加/i })
    await user.click(button)

    expect(mockOnAdd).not.toHaveBeenCalled()
  })

  it('送信中はボタンが無効化される', async () => {
    // 意図的に解決を遅らせるPromiseを返す
    vi.mocked(mockCreateTodo).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ id: 1, title: '待機テスト', description: '', completed: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), owner_id: 1, order: 0 }), 500))
    )
    
    const mockOnAdd = vi.fn().mockResolvedValue({})
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <TodoForm onAdd={mockOnAdd} />
      </QueryClientProvider>
    )

    const input = screen.getByPlaceholderText(/何をしますか？/i)
    const button = screen.getByRole('button', { name: /追加/i })

    await user.type(input, '待機テスト')
    await user.click(button)

    // ボタンが disabled になっていることを確認
    expect(button).toBeDisabled()
  })
})