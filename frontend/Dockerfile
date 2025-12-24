# ==============================================
# ステージ1: ビルド用（重いツールを使って料理を作る）
# ==============================================
FROM node:23-slim AS build-stage

# コンテナ内の作業ディレクトリを指定
WORKDIR /app

# ライブラリの定義ファイルを先にコピー（キャッシュを効かせてビルドを速くするため）
COPY package*.json ./

# 必要なライブラリ（node_modules）をインストール
RUN npm install

# プロジェクトの全ファイルをコピー
COPY . .

# ReactやVueなどのソースコードを、ブラウザで読み込める静的ファイル（dist）に変換
# ※この工程が終われば、Node.js自体はもう不要になります
RUN npm run build


# ==============================================
# ステージ2: 実行用（できた料理を軽量なサーバーで配る）
# ==============================================
FROM nginx:alpine

# 1. ビルドステージで生成された「成果物（dist内のファイル）」だけを取り出す
# これにより、最終的なイメージサイズを劇的に軽量化できます
COPY --from=build-stage /app/dist /usr/share/nginx/html

# 2. 環境変数の設定（バックエンドの接続先など）
# コンテナ起動時に上書き可能ですが、何も指定しない場合のデフォルト値を決めておきます
ENV BACKEND_URL=http://backend:8000

# 3. Nginxの設定テンプレートをコピー
# /etc/nginx/templates/ 内に .template ファイルを置くと、
# 起動時に環境変数が適用された設定ファイルが自動生成されます（Nginx公式の仕組み）
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# コンテナが80番ポートで待機することを明示
EXPOSE 80

# Nginxをフォアグラウンドで実行（コンテナが終了しないようにするため）
CMD ["nginx", "-g", "daemon off;"]