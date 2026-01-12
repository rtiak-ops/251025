import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TodoForm from '../components/TodoForm'

/**
 * api.ts のモック化
 * 実際のバックエンドAPIを呼び出さずに、テスト用の偽の動作（モック）を定義します。
 */
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

// モック化された api 関数の型安全なアクセスのためのインポート
import { createTodo as mockCreateTodo } from '../api'

/**
 * テスト用の React Query クライアントを作成するヘルパー関数
 * テスト間での状態干渉を避けるため、クエリの再試行（retry）をオフに設定しています。
 */
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

describe('TodoForm コンポーネントのテスト', () => {
  let queryClient: QueryClient

  // 各テストの実行前にクリーンアップと初期化を行う
  beforeEach(() => {
    queryClient = createTestQueryClient()
    vi.clearAllMocks() // 前のテストの呼び出し履歴をリセット
  })

  it('タスクを入力して送信できる', async () => {
    // 成功時のコールバックのモック
    const mockOnAdd = vi.fn().mockResolvedValue({})
    
    // API呼び出しの結果をあらかじめ定義（正常終了をシミュレート）
    vi.mocked(mockCreateTodo).mockResolvedValue({ 
      id: 1, 
      title: 'テストタスク', 
      description: '', 
      completed: false, 
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString(), 
      owner_id: 1, 
      order: 0, 
      status: 'TODO', 
      priority: 'MEDIUM' 
    })

    const user = userEvent.setup() // ユーザー操作をシミュレートするためのセットアップ

    render(
      <QueryClientProvider client={queryClient}>
        <TodoForm onAdd={mockOnAdd} />
      </QueryClientProvider>
    )

    // 入力フィールドを取得
    const input = screen.getByPlaceholderText(/新しいタスクをクイック追加/i)
    
    // フォームを展開するためにインプットをクリック（フォーカス）
    await user.click(input)
    
    // 展開後に表示される「タスクを追加」ボタンを取得
    const button = screen.getByRole('button', { name: /タスクを追加/i })

    // 文字を入力してボタンをクリック
    await user.type(input, 'テストタスク')
    await user.click(button)

    // 非同期処理（API呼び出しやコールバック）の完了を待機
    await waitFor(() => {
      expect(mockOnAdd).toHaveBeenCalled() // コールバックが呼ばれたことを確認
    })

    // 入力フィールドが空に戻っていることを確認
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

    const input = screen.getByPlaceholderText(/新しいタスクをクイック追加/i)
    await user.click(input)
    
    const button = screen.getByRole('button', { name: /タスクを追加/i })
    
    // 何も入力せずにクリック
    await user.click(button)

    // コールバックが呼ばれていないことを確認
    expect(mockOnAdd).not.toHaveBeenCalled()
  })

  it('送信中はボタンが無効化される', async () => {
    // APIのレスポンスを意図的に遅らせて（500ms）、送信中の状態を作る
    vi.mocked(mockCreateTodo).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ 
        id: 1, 
        title: '待機テスト', 
        description: '', 
        completed: false, 
        created_at: new Date().toISOString(), 
        updated_at: new Date().toISOString(), 
        owner_id: 1, 
        order: 0, 
        status: 'TODO', 
        priority: 'MEDIUM' 
      }), 500))
    )
    
    const mockOnAdd = vi.fn().mockResolvedValue({})
    const user = userEvent.setup()

    render(
      <QueryClientProvider client={queryClient}>
        <TodoForm onAdd={mockOnAdd} />
      </QueryClientProvider>
    )

    const input = screen.getByPlaceholderText(/新しいタスクをクイック追加/i)
    await user.click(input)
    
    const button = screen.getByRole('button', { name: /タスクを追加/i })

    await user.type(input, '待機テスト')
    await user.click(button)

    // 保存中の表示に切り替わり、ボタンが disabled になっていることを確認
    const loadingButton = screen.getByRole('button', { name: /保存中/i })
    expect(loadingButton).toBeDisabled()
  })
})
