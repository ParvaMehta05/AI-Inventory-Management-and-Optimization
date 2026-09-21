from datetime import datetime

from pydantic import BaseModel, Field


class TransferSuggestion(BaseModel):
    """One recommended move, produced by the redistribution engine."""

    product_id: int
    product_sku: str
    from_warehouse_id: int
    from_warehouse_name: str
    to_warehouse_id: int
    to_warehouse_name: str
    quantity: int
    reason: str


class TransferExecute(BaseModel):
    """Request body to actually perform a move."""

    product_id: int = Field(gt=0)
    from_warehouse_id: int = Field(gt=0)
    to_warehouse_id: int = Field(gt=0)
    quantity: int = Field(gt=0)
    reason: str = Field(default="Manual redistribution", max_length=200)


class TransferResponse(BaseModel):
    id: int
    product_id: int
    from_warehouse_id: int
    to_warehouse_id: int
    quantity: int
    reason: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True