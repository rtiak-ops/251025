/**
 * Todoリストの読み込み中に表示する「スケルトン（骨組み）」コンポーネントです。
 * 
 * データがまだ届いていない時に、真っ白な画面を見せるのではなく、
 * 「ここにこういう形のデータが表示されますよ」という枠組みを表示することで、
 * ユーザーに「読み込み中であること」を優しく伝え、体感的な待ち時間を短く感じさせる効果があります。
 */
export default function TodoSkeleton() {
  return (
    // animate-pulse: 全体をゆっくり点滅（パルスアニメーション）させて、読み込み中であることを表現します
    // space-y-4: アイテム同士の間に縦方向の隙間（スペース）を空けます
    <div className="animate-pulse space-y-4">
      
      {/* 
        [1, 2, 3]というダミーの配列を使って、3つ分のスケルトンアイテムを表示します。
        実際のリストも複数あることが多いので、それらしく見せるためです。
      */}
      {[1, 2, 3].map((i) => (
        <div 
          key={i} 
          // flex: 横並びのレイアウトにします
          // justify-between: 両端（左のテキスト部分と、右の削除ボタン部分）に配置します
          // border-b: 下線（ボーダー）を引いて、リストっぽく見せます
          className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700"
        >
          {/* 左側のエリア（チェックボックスとテキスト用） */}
          <div className="flex items-center gap-2 w-full">
            {/* 
              チェックボックスが表示される予定の場所です。
              bg-gray-200 (ダークモードでは bg-gray-700) でグレーの四角を表示しています。
            */}
            <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700"></div>
            
            {/* 
              Todoのテキストが表示される予定の場所です。
              w-3/4 (幅75%) にして、文字が入っているような横長の棒を表示します。
            */}
            <div className="h-4 bg-gray-200 rounded dark:bg-gray-700 w-3/4"></div>
          </div>

          {/* 
            右側のエリア（削除ボタン用）。
            ボタンのような正方形のグレーを表示します。
          */}
          <div className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-700"></div>
        </div>
      ))}
    </div>
  );
}
