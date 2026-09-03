from sqlalchemy import Date, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.database.database import Base


class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True
    )

    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id"),
        nullable=False,
        index=True
    )

    warehouse_id: Mapped[int] = mapped_column(
        ForeignKey("warehouses.id"),
        nullable=False,
        index=True
    )

    sale_date: Mapped[Date] = mapped_column(
        Date,
        nullable=False,
        index=True
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )