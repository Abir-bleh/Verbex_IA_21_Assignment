"""Pydantic models for auth-service"""
from pydantic import BaseModel, EmailStr

class SignupRequest(BaseModel):
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    token: str

class UserResponse(BaseModel):
    userId: str
    email: str

class SuccessResponse(BaseModel):
    data: dict | list

class ErrorResponse(BaseModel):
    error: str
