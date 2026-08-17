from pydantic import BaseModel


class ProductCreate(BaseModel):
    name: str
    sku: str
    category: str
    price: float


class ProductResponse(BaseModel):
    id: int
    name: str
    sku: str
    category: str
    price: float

    class Config:
        from_attributes = True