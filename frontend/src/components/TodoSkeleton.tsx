/**
 * Todoリストのローディング中に表示するスケルトンコンポーネント
 * ユーザーに「読み込み中」であることを視覚的に伝えます。
 */
export default function TodoSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {/* 3つのスケルトンアイテムを表示 */}
      {[1, 2, 3].map((i) => (
        <div 
          key={i} 
          className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-2 w-full">
            {/* チェックボックスの代わり */}
            <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700"></div>
            {/* テキストの代わり */}
            <div className="h-4 bg-gray-200 rounded dark:bg-gray-700 w-3/4"></div>
          </div>
          {/* 削除ボタンの代わり */}
          <div className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-700"></div>
        </div>
      ))}
    </div>
  );
}
