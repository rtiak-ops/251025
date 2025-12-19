from fastapi import FastAPI, Request
from pydantic import BaseModel, EmailStr
from httpx import AsyncClient, ASGITransport
import asyncio

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

app = FastAPI()

@app.post("/register")
async def register(request: Request, user: UserCreate):
    return user

async def main():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/register", json={"email": "a@b.com", "password": "pass"})
        print(f"Status: {res.status_code}")
        print(f"Body: {res.text}")

if __name__ == "__main__":
    asyncio.run(main())
