# ベースイメージとしてNode.js 20を使用
FROM node:20

# アプリケーションの作業ディレクトリを設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストールする前に、ホストOSで生成された
# package-lock.jsonを削除し、Linux環境で再生成してインストールを成功させる
RUN rm -f package-lock.json && npm install

# 残りのソースコードをコピー
COPY . .

# 開発サーバーがリッスンするポートを公開
EXPOSE 3000

# Vite開発サーバーを起動し、ホスト 0.0.0.0 にバインドして外部からのアクセスを許可
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
