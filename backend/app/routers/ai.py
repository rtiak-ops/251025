# ----------------------------------------------------------------------
# インポート
# ----------------------------------------------------------------------
from __future__ import annotations  # Python 3.10+: 型ヒントの前方参照を簡潔に

import json  # AIからのJSON形式のレスポンスをパースするために使用
import logging  # エラーや警告をログに記録するために使用
import os  # 環境変数(OPENAI_API_KEY)を取得するために使用

import openai  # OpenAI APIを呼び出すための公式ライブラリ
from fastapi import APIRouter, HTTPException, status  # FastAPIのルーティングとエラーハンドリング
from pydantic import BaseModel  # リクエスト/レスポンスのデータ構造を定義するために使用

# ----------------------------------------------------------------------
# AI (LLM) 連携用のルーター
# このファイルでは、OpenAI APIを使ってタスクを自動的に分解する機能を提供します。
# ユーザーが「大きなタスク」を入力すると、AIが「具体的なサブタスク」に分解してくれます。
# ----------------------------------------------------------------------

# ルーターの作成: すべてのエンドポイントは /ai で始まります
router = APIRouter(prefix="/ai", tags=["AI"])

# ロガーの設定: エラーや警告をコンソールに出力するために使用
logger = logging.getLogger(__name__)

# ----------------------------------------------------------------------
# データモデル(Pydantic)
# ----------------------------------------------------------------------

class AIRequest(BaseModel):
    """
    AIタスク分解APIへのリクエストデータ
    
    Attributes:
        title (str): ユーザーが入力した大きなタスクのタイトル
                     例: "Webアプリを作る", "旅行の準備をする"
    """
    title: str

class AIResponse(BaseModel):
    """
    AIタスク分解APIからのレスポンスデータ
    
    Attributes:
        subtasks (list[str]): AIが生成した3〜5個のサブタスクのリスト
                              例: ["要件定義をする", "デザインを考える", "実装する"]
    """
    subtasks: list[str]

from ..auth import get_current_user
from .. import schemas

# ----------------------------------------------------------------------
# エンドポイント: タスク分解API
# ----------------------------------------------------------------------

@router.post("/breakdown", response_model=AIResponse)
async def breakdown_task(
    req: AIRequest,
    current_user: schemas.UserOut = Depends(get_current_user) # 認証を必須にする
):
    """
    タスク分解API:
    ユーザーが入力した「大きなタスク」を、AIが「3〜5個の具体的なサブタスク」に分解して返します。
    ※ 認証済みユーザーのみ利用可能です。
    """
    
    # セキュリティ: 入力文字数の制限
    if len(req.title) > 200:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="タスクのタイトルが長すぎます(200文字以内)"
        )
    
    # ステップ1: 環境変数からOpenAI APIキーを取得
    # .envファイルに OPENAI_API_KEY=sk-... の形式で設定されている必要があります
    api_key = os.getenv("OPENAI_API_KEY")
    
    # ステップ2: APIキーが設定されていない場合の処理
    # APIキーが設定されていない場合、またはテスト用のダミー値の場合はモックデータを返す
    # これにより、OpenAI APIキーがなくても開発やテストを進めることができます
    if not api_key or api_key == "dummy":
        logger.warning("OPENAI_API_KEYが設定されていないため、モックデータを返します。")
        # 0.5秒程度の擬似的な遅延を入れると本物っぽくなりますが、ここでは省略
        return AIResponse(subtasks=[
            f"【AI提案】{req.title} の詳細を調査する",
            f"【AI提案】{req.title} の計画を立てる",
            f"【AI提案】{req.title} に必要なものを準備する",
        ])

    # ステップ3: OpenAI APIクライアントの作成
    # AsyncOpenAIを使うことで、非同期処理が可能になり、他のリクエストをブロックしません
    client = openai.AsyncOpenAI(api_key=api_key)
    
    # ステップ4: プロンプトエンジニアリング
    # AIに対して、どのような形式で回答してほしいかを明確に指示します
    # 具体的なJSON配列のみを返すように強く指示することで、パースエラーを減らします
    prompt = f"""
    あなたは優秀なタスク管理アシスタントです。
    以下のタスクを達成するための、具体的で実行可能な3〜5個のサブタスクに分解してください。
    出力は必ず JSON の文字配列(List[str])形式だけにしてください。余計な文章は不要です。
    言語は日本語でお願いします。

    タスク: "{req.title}"
    """

    try:
        # ステップ5: OpenAI APIの呼び出し
        # gpt-3.5-turboはコストパフォーマンスが良く、タスク分解には十分な性能です
        # temperature=0.7は、ある程度の創造性を持たせつつ、安定した結果を得るための設定です
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",  # コストパフォーマンスの良いモデル
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,  # 0.0〜2.0の範囲で、高いほど創造的(ランダム)になります
        )
        
        # ステップ6: AIからのレスポンスを取得
        # response.choices[0].message.contentにAIの回答が入っています
        content = response.choices[0].message.content
        
        # ステップ7: JSONパース前の前処理
        # AIが ```json ... ``` のようなMarkdownのコードブロックで囲んで返すことがあるため、
        # それらを除去してから、JSON.parseを行います
        if "```json" in content:
            # ```json と ``` を削除
            content = content.replace("```json", "").replace("```", "")
        elif "```" in content:
            # ``` のみを削除
            content = content.replace("```", "")
            
        # ステップ8: JSON文字列をPythonのリストに変換
        # strip()で前後の空白や改行を削除してからパースします
        subtasks = json.loads(content.strip())
        
        # ステップ9: 配列であることを確認
        # AIが配列以外の形式(例: 辞書やテキスト)を返した場合はエラーにします
        if not isinstance(subtasks, list):
            raise ValueError("AIが配列形式を返しませんでした")
            
        # ステップ10: 正常なレスポンスを返す
        return AIResponse(subtasks=subtasks)

    except Exception as e:
        # エラーハンドリング
        # AIの呼び出しやJSONパースで何らかのエラーが発生した場合の処理
        logger.error(f"AI生成中にエラーが発生しました: {e}", exc_info=True)
        
        # 失敗時は500エラーではなく、空のリストなどを返す実装も考えられますが、
        # ここではユーザーに通知するためにエラーを上げます
        # 502 Bad Gatewayは、外部サービス(OpenAI)との通信に問題があったことを示します
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AIサービスの呼び出しに失敗しました。"
        )

