# backend/app/desktop/routers/workspace_locations/workspace_location.py
from typing import Optional
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.database.sessions import get_db
from app.models.users import User
from app.core.dependencies import get_current_user
from app.desktop.schemas.workspace_locations.workspace_location import (
    WorkspaceLocationSaveRequest,
    WorkspaceLocationResponse,
)
from app.desktop.services.location.workspace_location_service import (
    get_workspace_location,
    save_workspace_location,
)

router = APIRouter(prefix="/workspace-location", tags=["workspace-location"])


@router.get("", response_model=Optional[WorkspaceLocationResponse])
def get_current_workspace_location(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_workspace_location(db, current_user)


@router.post("", response_model=WorkspaceLocationResponse, status_code=status.HTTP_200_OK)
@router.put("", response_model=WorkspaceLocationResponse, status_code=status.HTTP_200_OK)
def update_current_workspace_location(
    payload: WorkspaceLocationSaveRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return save_workspace_location(db, current_user, payload, http_request)
