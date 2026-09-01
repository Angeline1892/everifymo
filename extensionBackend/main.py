from fastapi.middleware.cors import CORSMiddleware

from fastapi import Depends, FastAPI, HTTPException, status
from typing import Annotated

from app.database.base import Base
from app.database.sessions import engine, get_db
from app.models import consumer_accounts
from app.routers import consumer_acc as consumer_acc_router
from app.routers import auth as auth_router
from app.core.security import get_current_user
from app.routers import complaints

app = FastAPI()
Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(consumer_acc_router.router)
app.include_router(auth_router.router)
app.include_router(complaints.router)

consumer_dependency = Annotated[dict, Depends(get_current_user)]

@app.get("/", status_code=status.HTTP_200_OK)
async def user(consumer: consumer_dependency):
    if consumer is None:
        raise HTTPException(status_code=401,
                            detail = "Authentication Failed")
    return {
        "User": consumer
    }

