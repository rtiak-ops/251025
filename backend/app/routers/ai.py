from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
import openai
import os
import json
import logging
from typing import List

# ----------------------------------------------------------------------
# AI (LLM) 連携用のルーター
# ----------------------------------------------------------------------

router = APIRouter(prefix="/ai", tags=["AI"])
logger = logging.getLogger(__name__)

class AIRequest(BaseModel):
    title: str

class AIResponse(BaseModel):
    subtasks: List[str]

@router.post("/breakdown", response_model=AIResponse)
async def breakdown_task(req: AIRequest):
    """
    タスク分解API:
    ユーザーが入力した「大きなタスク」を、AIが「3〜5個の具体的なサブタスク」に分解して返します。
    """
    api_key = os.getenv("OPENAI_API_KEY")
    
    # APIキーが設定されていない場合、またはテスト用のダミー値の場合はモックデータを返す
    if not api_key or api_key == "dummy":
        logger.warning("OPENAI_API_KEYが設定されていないため、モックデータを返します。")
        # 0.5秒程度の擬似的な遅延を入れると本物っぽくなりますが、ここでは省略
        return AIResponse(subtasks=[
            f"【AI提案】{req.title} の詳細を調査する",
            f"【AI提案】{req.title} の計画を立てる",
            f"【AI提案】{req.title} に必要なものを準備する",
        ])

    client = openai.AsyncOpenAI(api_key=api_key)
    
    # プロンプトエンジニアリング
    # 具体的なJSON配列のみを返すように強く指示
    prompt = f"""
    あなたは優秀なタスク管理アシスタントです。
    以下のタスクを達成するための、具体的で実行可能な3〜5個のサブタスクに分解してください。
    出力は必ず JSON の文字配列（List[str]）形式だけにしてください。余計な文章は不要です。
    言語は日本語でお願いします。

    タスク: "{req.title}"
    """

    try:
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo", # コストパフォーマンスの良いモデル
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )
        content = response.choices[0].message.content
        
        # JSONパース (Markdownのコードブロック ```json ... ``` が含まれる場合の除去処理)
        if "```json" in content:
            content = content.replace("```json", "").replace("```", "")
        elif "```" in content:
            content = content.replace("```", "")
            
        subtasks = json.loads(content.strip())
        
        # 配列であることを確認
        if not isinstance(subtasks, list):
            raise ValueError("AIが配列形式を返しませんでした")
            
        return AIResponse(subtasks=subtasks)

    except Exception as e:
        logger.error(f"AI生成中にエラーが発生しました: {e}", exc_info=True)
        # 失敗時は500エラーではなく、空のリストなどを返す実装も考えられますが、
        # ここではユーザーに通知するためにエラーを上げます
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AIサービスの呼び出しに失敗しました。"
        )
