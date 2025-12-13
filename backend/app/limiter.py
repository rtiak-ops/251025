from slowapi import Limiter
from slowapi.util import get_remote_address

# 【Rate Limiter の設定】
# slowapiというライブラリを使用して、APIへのアクセス頻度を制限します。
#
# - key_func: 制限の単位を何にするか。get_remote_address は「IPアドレスごと」にカウントすることを意味します。
# - default_limits: 個別に制限が設定されていないAPIに対するデフォルトの制限（ここでは1分間に100回まで）。
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
