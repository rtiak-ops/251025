from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
h = pwd_context.hash("password123")
print(f"Verify correct: {pwd_context.verify('password123', h)}")
print(f"Verify wrong: {pwd_context.verify('wrong', h)}")
