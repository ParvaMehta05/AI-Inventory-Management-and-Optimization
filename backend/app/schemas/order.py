from datetime import datetime

from pydantic import BaseModel, Field


class OrderCreate(BaseModel):
    product_id: int
    warehouse_id: int
    quantity: int = Field(gt=0)


class OrderResponse(BaseModel):
    id: int
    product_id: int
    warehouse_id: int
    quantity: int
    status: str
    order_date: datetime

    class Config:
        from_attributes = True