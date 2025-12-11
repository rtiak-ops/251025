# ToDo アプリ

## 📌 概要
このアプリは、タスクの追加・編集・削除ができるシンプルな ToDo 管理アプリです。  
React（TypeScript）＋ FastAPI ＋ PostgreSQL ＋ Docker で構築しています。

---

## ✨ 主な機能
- タスクの追加
- タスクの編集
- タスクの削除
- 完了状態の切り替え
- 永続化（PostgreSQL）

---

## 🛠 使用技術（Tech Stack）
- **Frontend:** React / TypeScript / Tailwind CSS  
- **Backend:** FastAPI  
- **Database:** PostgreSQL  
- **Infrastructure:** Docker / docker-compose

---

## 🚀 ローカル開発環境の起動方法

### 1. リポジトリをクローン
git clone https://github.com/rtiak-ops/251025
cd リポジトリ名

### 2. Docker で起動
docker compose up --build

### 3. アクセス
ブラウザで開く  
http://localhost:5173

---

## 📂 ディレクトリ構成
/
├─ frontend/ # React / TypeScript
├─ backend/ # FastAPI
├─ db/ # PostgreSQL
└─ docker-compose.yml

---

## 🧑‍💻 開発者
- rtiak-ops
