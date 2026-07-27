from pydantic import BaseModel, Field


class AccountClosureRequest(BaseModel):
    confirmation: str = Field(min_length=1, max_length=30)


class AccountClosureCancelRequest(BaseModel):
    confirmation: str = Field(min_length=1, max_length=30)
