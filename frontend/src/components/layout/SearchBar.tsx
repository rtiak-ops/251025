/**
 * SearchBarProps: SearchBarコンポーネントが受け取る情報の定義
 * @param value 現在入力されている検索文字
 * @param onChange 文字が入力されたときに実行される関数
 * @param onClear 入力をクリア（空に）するときに実行される関数
 */
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

/**
 * 全画面で共通して使用される検索インターフェース。
 */
export default function SearchBar({ value, onChange, onClear }: SearchBarProps) {
  return (
    <div className="mb-6 relative">
      <input 
        id="search_query"
        name="search_query"
        type="text" 
        placeholder="タスクを検索..." 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-2xl py-3 px-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium dark:text-white"
      />
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
      {value && (
        <button 
          onClick={onClear}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
        >
          ✕
        </button>
      )}
    </div>
  );
}
