# ----------------------------------------------------------------------
# インポート
# ----------------------------------------------------------------------
from __future__ import annotations  # Python 3.10+: 型ヒントの前方参照を簡潔に

import json  # AIからのJSON形式のレスポンスをパースするために使用
import logging  # エラーや警告をログに記録するために使用
import os  # 環境変数(OPENAI_API_KEY)を取得するために使用

import openai  # OpenAI APIを呼び出すための公式ライブラリ
import google.generativeai as genai  # Google Gemini APIを呼び出すためのライブラリ
from fastapi import APIRouter, Depends, HTTPException, status  # FastAPIのルーティングとエラーハンドリング
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
    
    # ステップ1: 環境変数からAPIキーを取得
    openai_api_key = os.getenv("OPENAI_API_KEY")
    google_api_key = os.getenv("GOOGLE_API_KEY")
    
    logger.info(f"API Keys: OpenAI={'Found' if openai_api_key else 'Missing'}, Google={'Found' if google_api_key else 'Missing'}")

    # 共通のプロンプト
    prompt = f"""
    あなたは優秀なタスク管理アシスタントです。
    以下のタスクを達成するための、具体的で実行可能な3〜5個のサブタスクに分解してください。
    出力は必ず JSON の文字配列(List[str])形式だけにしてください。余計な文章は不要です。
    言語は日本語でお願いします。

    タスク: "{req.title}"
    """

    content = ""
    success = False

    # 1. Google Gemini APIを試行 (無料枠があるため優先)
    if not success and google_api_key and google_api_key != "dummy":
        try:
            logger.info("Gemini APIを使用してタスクを分解します。")
            genai.configure(api_key=google_api_key)
            
            # 利用可能なモデルを動的に取得
            available_models = []
            try:
                for m in genai.list_models():
                    if 'generateContent' in m.supported_generation_methods:
                        available_models.append(m.name)
                
                # 特定のモデル（2.5 -> 3.0）を最優先にするように並び替え
                priority_order = ["models/gemini-2.5-flash", "models/gemini-3.0-flash"]
                # 優先リストにあるものを抽出し、残りを後ろに結合
                sorted_models = [m for m in priority_order if m in available_models]
                sorted_models += [m for m in available_models if m not in priority_order]
                available_models = sorted_models
                
            except Exception:
                # 取得失敗時は、指定された優先順位で設定
                available_models = ["models/gemini-2.5-flash", "models/gemini-3.0-flash"]

            last_error = ""
            for model_name in available_models:
                # flash または pro 系モデルを優先して試す
                if "flash" in model_name or "pro" in model_name:
                    try:
                        logger.info(f"モデル {model_name} を試行中...")
                        model = genai.GenerativeModel(model_name)
                        response = await model.generate_content_async(prompt)
                        content = response.text
                        success = True
                        logger.info(f"モデル {model_name} での生成に成功しました。")
                        break
                    except Exception as e:
                        last_error = str(e)
                        logger.warning(f"モデル {model_name} でエラー: {last_error}")
                        continue

            if not success:
                logger.error(f"Geminiの全候補モデルで失敗しました。最後のエラー: {last_error}")

        except Exception as e:
            logger.warning(f"Gemini API実行中にエラーが発生しました: {e}")

    # 2. OpenAI APIを試行 (Geminiが失敗、またはキーがない場合)
    if not success and openai_api_key and openai_api_key != "dummy":
        try:
            logger.info("OpenAI APIを使用してタスクを分解します。")
            client = openai.AsyncOpenAI(api_key=openai_api_key)
            response = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
            )
            content = response.choices[0].message.content
            success = True
        except Exception as e:
            logger.error(f"OpenAI APIでの生成にも失敗しました: {e}")

    # 3. いずれも失敗した場合は最終手段としてモックデータを返す (UX維持のため)
    if not success:
        logger.warning("すべてのAIサービスが利用できないため、モックデータを返します。")
        return AIResponse(subtasks=[
            f"【AI提案】{req.title} の重要ポイントを書き出す",
            f"【AI提案】{req.title} を進めるための時間を作る",
            f"【AI提案】{req.title} の完了を確認する",
        ])

    try:
        # レスポンスの前処理
        if "```json" in content:
            content = content.replace("```json", "").replace("```", "")
        elif "```" in content:
            content = content.replace("```", "")
            
        subtasks = json.loads(content.strip())
        
        if not isinstance(subtasks, list):
            raise ValueError("AIが配列形式を返しませんでした")
            
        return AIResponse(subtasks=subtasks)

    except Exception as e:
        logger.error(f"JSONパース中にエラーが発生しました: {e}\nContent: {content}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AIレスポンスの解析に失敗しました。({type(e).__name__})"
        )

