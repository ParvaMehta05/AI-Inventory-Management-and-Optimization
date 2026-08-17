from fastapi import FastAPI

from fastapi import Depends
from app.core.security import get_current_user

from app.database.database import Base, engine
from app.models.user import User
from app.models.product import Product
from app.models.warehouse import Warehouse
from app.models.inventory import Inventory
from app.routes.auth import router as auth_router
from app.routes.products import router as product_router
from app.routes.warehouse import router as warehouse_router
from app.routes.inventory import router as inventory_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Inventory Optimization System",
    description="Backend API for inventory synchronization and optimization",
    version="1.0.0"
)

app.include_router(auth_router)
app.include_router(product_router)
app.include_router(warehouse_router)
app.include_router(inventory_router)
@app.get("/")
def root():
    return {
        "message": "Inventory Optimization API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }

@app.get("/me")
def get_me(
    current_user: User = Depends(get_current_user)
):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "is_active": current_user.is_active
    }