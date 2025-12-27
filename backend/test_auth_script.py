import urllib.request
import json
import urllib.error

def test_login():
    data = json.dumps({'email': '1@1.com', 'password': 'password'}).encode()
    req = urllib.request.Request('http://localhost:8000/auth/login', data=data, headers={'Content-Type': 'application/json'})
    try:
        resp = urllib.request.urlopen(req)
        print(f"SUCCESS: {resp.read().decode()}")
    except urllib.error.HTTPError as e:
        print(f"HTTP ERROR: {e.code}, Body: {e.read().decode()}")
    except Exception as e:
        print(f"OTHER ERROR: {e}")

if __name__ == "__main__":
    test_login()
