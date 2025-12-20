# --- 1. ビルドステージ (ビルド用の道具を揃える) ---
FROM node:23-slim AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# 本番用に最適化されたファイルを生成します (dist フォルダができる)
RUN npm run build

# --- 2. 実行ステージ (軽量なNginxで配信する) ---
FROM nginx:alpine
# ビルドステージで作られた「完成品」だけを、Nginxの公開フォルダにコピーします
COPY --from=build-stage /app/dist /usr/share/nginx/html
# Nginxのテンプレート機能を活用して、起動時に環境変数を注入できるようにします
# デフォルト値として、ローカル環境用のURLを設定しておきます
ENV BACKEND_URL=http://backend:8000
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]