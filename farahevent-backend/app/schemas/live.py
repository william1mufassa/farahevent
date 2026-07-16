from pydantic import BaseModel, EmailStr

class LiveAccessRequest(BaseModel):
    order_ref: str
    email: EmailStr

class LiveAccessResponse(BaseModel):
    token: str
