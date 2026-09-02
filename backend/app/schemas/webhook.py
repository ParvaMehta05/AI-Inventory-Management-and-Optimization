from typing import Literal

from pydantic import BaseModel, Field


class OrderWebhook(BaseModel):
    channel: Literal["amazon", "flipkart", "shopify"]
    order_id: str = Field(min_length=1, max_length=100)
    product_id: int
    warehouse_id: int
    quantity: int = Field(gt=0)
    status: str = "PLACED"