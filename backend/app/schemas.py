# ======================================================================
# インポート: 必要なライブラリとモジュールを読み込む
# ======================================================================

from __future__ import annotations  # Python 3.10+: 型ヒントの前方参照を簡潔に

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

# ======================================================================
# ユーザー認証関連のスキーマ
# ======================================================================

# ----------------------------------------------------------------------
# 1. ユーザーの基本情報を定義するスキーマ (UserBase)
# ----------------------------------------------------------------------

class UserBase(BaseModel):
    """
    ユーザーが持つ基本的な属性を定義する。
    他のユーザー関連スキーマの基底クラスとなる。
    """
    # ユーザーのメールアドレス。EmailStr型を使うことで、
    # Pydanticが自動的にメールアドレスの形式をチェックしてくれる。
    email: EmailStr

# ----------------------------------------------------------------------
# 2. ユーザー登録時に入力されるデータ構造 (UserCreate)
# ----------------------------------------------------------------------

class UserCreate(UserBase):
    """
    新しいユーザーを作成（登録）するためのスキーマ。
    UserBaseを継承し、emailに加えてpasswordも受け付ける。
    """
    # ユーザーのパスワード。セキュリティのため、後でハッシュ化される。
    password: str

    # パスワードのバリデーション（検証）を行うメソッド
    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """
        パスワードが安全な条件を満たしているかチェックする。
        - 8文字以上であること（セキュリティ上の最低要件）
        - 72バイト以下であること（bcryptハッシュ化の制限）
        """
        # パスワードの長さが8文字未満の場合はエラー
        if len(v) < 8:
            raise ValueError("パスワードは8文字以上である必要があります")
        
        # パスワードのバイト数が72バイトを超える場合はエラー
        # bcryptは72バイト以降を無視するため、明示的にエラーを返す
        if len(v.encode("utf-8")) > 72:
            raise ValueError("パスワードは72バイト以下である必要があります (bcryptの制限)")
        
        # 検証に合格したパスワードを返す
        return v

# ----------------------------------------------------------------------
# 3. APIからクライアントへ返却されるユーザー情報 (UserOut)
# ----------------------------------------------------------------------

class UserOut(UserBase):
    """
    データベースから取得したユーザー情報をクライアントに返すためのスキーマ。
    UserBaseの属性（email）に加え、DB側で自動生成されるIDと作成日時を含める。
    ※ セキュリティのため、パスワードは含めない。
    """
    # データベース側で自動採番される一意なID
    id: int
    
    # ユーザーアカウントの作成日時
    created_at: datetime
    
    # 役割
    role: str

    # Pydantic V2方式: orm_modeの代替としてmodel_configを使用
    # これにより、SQLAlchemyのモデルオブジェクトから直接データを取得できる
    model_config = ConfigDict(from_attributes=True)

# ----------------------------------------------------------------------
# 4. ログイン成功時に返されるトークン情報 (Token)
# ----------------------------------------------------------------------

class Token(BaseModel):
    """
    ユーザーがログインに成功した際に返されるJWTトークンの情報。
    このトークンを使って、以降のAPIリクエストで認証を行う。
    """
    # JWT（JSON Web Token）形式のアクセストークン
    access_token: str
    
    # トークンの種類。通常は "bearer" を使用（OAuth 2.0の標準）
    token_type: str = "bearer"

# ----------------------------------------------------------------------
# 5. トークンから取り出したユーザー情報 (TokenData)
# ----------------------------------------------------------------------

class TokenData(BaseModel):
    """
    JWTトークンをデコード（解読）した際に取り出されるユーザー情報。
    トークンが有効かどうかを確認する際に使用される。
    """
    # トークンに含まれるユーザーのメールアドレス
    # トークンが無効な場合はNoneになる可能性がある
    email: str | None = None

# ======================================================================
# To Do（タスク）管理関連のスキーマ
# ======================================================================

# ----------------------------------------------------------------------
# 1. 基本となるTo Doアイテムのスキーマ (TodoBase)
# ----------------------------------------------------------------------

class TodoBase(BaseModel):
    """
    To Doアイテムが持つ基本的な属性を定義する。
    他の全てのTodo関連スキーマの基底クラスとなる。
    
    このクラスは直接使用されることはなく、
    TodoCreate、TodoUpdate、TodoOutなどの親クラスとして機能する。
    """
    # To Doのタイトル（例: "買い物に行く"、"レポートを書く"）
    # 必須項目で、空にすることはできない。
    title: str 
    
    # To Doの詳細な説明（例: "スーパーで牛乳と卵を買う"）
    # 任意項目 (Noneを許容) で、デフォルトはNone（説明なし）。
    # Python 3.10以降の記法 'str | None' を使用。
    description: str | None = None
    
    # 完了状態を示すフラグ
    # True: 完了済み、False: 未完了
    # 任意項目で、デフォルトはFalse（未完了）。
    completed: bool = False

    # プロジェクトID
    project_id: int | None = None

    # ステータス (TODO, IN_PROGRESS, REVIEW, DONE)
    status: str = "TODO"

    # 優先度 (LOW, MEDIUM, HIGH, URGENT)
    priority: str = "MEDIUM"

    # 期限日
    due_date: datetime | None = None

    # タイトルのバリデーション（検証）を行うメソッド
    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        """
        タイトルが適切な条件を満たしているかチェックする。
        - 空白のみのタイトルは許可しない
        - 100文字以内であること（データベースの制限や表示上の理由）
        """
        # タイトルが空白のみの場合はエラー
        # strip()で前後の空白を削除して、残りが空かチェック
        if not v.strip():
            raise ValueError("Title cannot be empty")
        
        # タイトルが100文字を超える場合はエラー
        if len(v) > 100:
            raise ValueError("Title must be 100 characters or less")
        
        # 検証に合格したタイトルを返す（前後の空白を削除した状態で）
        return v.strip()

# ----------------------------------------------------------------------
# 2. To Doアイテム作成時に入力されるデータ構造 (TodoCreate)
# ----------------------------------------------------------------------

class TodoCreate(TodoBase):
    """
    新しいTo Doアイテムを作成するためのスキーマ。
    
    TodoBaseをそのまま継承し、title, description, completed (任意) を全て受け付ける。
    - titleはTodoBaseで必須なので、作成時にも必須。
    - descriptionは任意なので、省略可能。
    - completedは任意で、省略した場合はFalse（未完了）になる。
    
    使用例:
    {
        "title": "買い物に行く",
        "description": "スーパーで牛乳と卵を買う",
        "completed": false
    }
    """
    pass  # TodoBaseの定義をそのまま使用するため、追加の定義は不要

# ----------------------------------------------------------------------
# 3. To Doアイテム更新時に入力されるデータ構造 (TodoUpdate)
# ----------------------------------------------------------------------

class TodoUpdate(BaseModel): 
    """
    既存のTo Doアイテムを更新するためのスキーマ。
    
    更新対象のフィールドを全て任意にするため、
    あえてTodoBaseを直接継承しない。
    
    理由:
    - 更新では、どれか一つのフィールドだけを変更したい場合がある
      （例: タイトルだけ変更、完了状態だけ変更など）
    - 全てのフィールドを必須にすると、一部だけ変更したい時に不便
    
    使用例（タイトルだけ更新）:
    {
        "title": "買い物に行く（明日）"
    }
    
    使用例（完了状態だけ更新）:
    {
        "completed": true
    }
    """
    # titleを任意に変更。
    # 更新時にタイトルを変更しない場合はNoneのまま。
    title: str | None = None
    
    # descriptionを任意に変更。
    # 更新時に説明を変更しない場合はNoneのまま。
    description: str | None = None
    
    # completedを任意に変更。
    # 更新時に完了状態を変更しない場合はNoneのまま。
    completed: bool | None = None

    # project_idを任意に変更
    project_id: int | None = None

    # statusを任意に変更
    status: str | None = None

    # priorityを任意に変更
    priority: str | None = None

    # due_dateを任意に変更
    due_date: datetime | None = None

# ----------------------------------------------------------------------
# 4. APIからクライアントへ返却されるTo Doアイテムのデータ構造 (TodoOut)
# ----------------------------------------------------------------------

class TodoOut(TodoBase):
    """
    データベースから取得したTo Doアイテムの情報をクライアントに返すためのスキーマ。
    
    TodoBaseの属性（title, description, completed）に加え、
    DB側で自動生成される情報（ID、作成日時、更新日時など）を含める。
    
    このスキーマは、APIのレスポンスとして使用され、
    フロントエンドがTo Doアイテムを表示する際に必要な全ての情報を提供する。
    """
    # データベース側で自動採番される一意なID
    # このIDを使って、特定のTo Doアイテムを識別・更新・削除する
    id: int

    # 作成日時: レコード作成時に現在の日時を自動設定
    # いつこのTo Doが作成されたかを記録する
    created_at: datetime

    # 更新日時: レコード更新時に現在の日時を自動設定
    # 最後にこのTo Doが更新された日時を記録する
    updated_at: datetime

    # このTo Doを所有するユーザーのID
    # 任意項目で、ユーザー認証が実装されている場合に使用される
    # これにより、各ユーザーが自分のTo Doだけを見ることができる
    owner_id: int | None = None
    
    # To Doアイテムの表示順序を示す番号
    # ユーザーがドラッグ&ドロップでTo Doの順番を変更した際に使用される
    # 小さい数字ほど上に表示される（デフォルトは0）
    order: int = 0
                
    # Pydantic V2方式: orm_modeの代替としてmodel_configを使用
    # Pydanticモデルが、Pythonのオブジェクト（例: SQLAlchemyのモデル）
    # からデータを受け取れるようにする設定。
    # これにより、DBから取得したオブジェクトの属性をモデルにマッピングできる。
    model_config = ConfigDict(from_attributes=True)
    
    # (注意) Pydantic V1の書き方 (非推奨):
    #     orm_mode = True

# ----------------------------------------------------------------------
# 5. To Doアイテムの並び替え（リオーダー）用のスキーマ (TodoReorder)
# ----------------------------------------------------------------------

class TodoReorder(BaseModel):
    """
    To Doアイテムの表示順序を変更するためのスキーマ。
    
    ユーザーがドラッグ&ドロップでTo Doの順番を変更した際、
    新しい順序をサーバーに送信するために使用される。
    
    使用例:
    {
        "todo_ids": [3, 1, 2, 5, 4]
    }
    
    上記の例では、ID=3のTo Doが最初に表示され、
    次にID=1、ID=2、ID=5、ID=4の順に表示される。
    """
    # To DoのIDのリスト。表示したい順番に並べる。
    # 例: [3, 1, 2] → ID=3が1番目、ID=1が2番目、ID=2が3番目に表示される
    todo_ids: list[int]

# ======================================================================
# プロジェクト管理関連のスキーマ
# ======================================================================

class ProjectBase(BaseModel):
    name: str
    description: str | None = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None

class CollaboratorBase(BaseModel):
    user_id: int
    permission: str = "editor"

class CollaboratorCreate(CollaboratorBase):
    pass

class CollaboratorOut(CollaboratorBase):
    id: int
    user_email: str | None = None # フロントエンド表示用
    
    model_config = ConfigDict(from_attributes=True)

class ProjectOut(ProjectBase):
    id: int
    created_at: datetime
    updated_at: datetime
    owner_id: int
    collaborators: list[CollaboratorOut] = []
    
    model_config = ConfigDict(from_attributes=True)

class ProjectSummary(ProjectOut):
    """
    ダッシュボード用などのプロジェクトサマリー
    """
    todo_count: int = 0
    completed_count: int = 0
    role: str | None = None
class AuditLogOut(BaseModel):
    """
    監査ログ出力用スキーマ
    """
    id: int
    user_id: int | None
    user_email: str | None = None
    action: str
    resource_type: str
    resource_id: int | None
    details: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
