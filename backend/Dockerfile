# ベースイメージとしてPython 3.12の軽量版（Alpine Linuxベース）を使用します。
# より小さいイメージサイズを実現し、セキュリティリスクを減らします。
FROM python:3.12-slim

# 作業ディレクトリをコンテナ内に設定します。
# 以降の命令はこのディレクトリを基準に実行されます。
WORKDIR /app

# 1. 依存関係のインストール（高速化とキャッシュのために独立したレイヤーに）
# requirements.txtのみをまずコピーします。
COPY requirements.txt .

# 依存関係をインストールします。
# --no-cache-dir: pipキャッシュを無効にし、イメージサイズを小さくします。
# この層はrequirements.txtが変更されない限りキャッシュされ再利用されます。
RUN pip install --default-timeout=1000 --no-cache-dir -r requirements.txt

# 2. アプリケーションコードのコピー
# 依存関係のインストールが完了した後で、アプリケーションコード全体をコピーします。
# これにより、コードの変更時でも、requirements.txtが変わらなければ上のpip installの層はキャッシュが効きます。
COPY ./app ./app

# 3. コンテナが起動したときに実行されるコマンド
# Uvicornを使ってFastAPIアプリケーション（またはStarlette）を起動します。
# app.main:app は、appディレクトリ内のmain.pyファイルで定義されている 'app' オブジェクトを指します。
# --host 0.0.0.0: 外部からの接続を受け入れるようにします。
# --port 8000: アプリケーションがリッスンするポートを指定します。
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]