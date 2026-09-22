# backend/app/desktop/routers/workspace_locations/workspace_location.py
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from sqlalchemy.orm import Session

from app.database.sessions import get_db
from app.core.dependencies import get_current_user, get_current_agency_admin
from app.models.users import User
from app.desktop.schemas.workspace_locations.workspace_location import (
    WorkspaceLocationResponse,
    WorkspaceLocationCreateOrUpdateRequest,
    PersonnelLocationLogCreate,
    PersonnelLocationLogResponse,
)
from app.desktop.services.location.location_service import (
    get_workspace_location_for_user,
    save_workspace_location,
    log_personnel_location_and_check_geofence,
)

router = APIRouter(prefix="/workspace-location", tags=["workspace-location"])


@router.get("", response_model=WorkspaceLocationResponse)
def get_workspace_location(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    loc = get_workspace_location_for_user(db, current_user)
    if not loc:
        raise HTTPException(
            status_code=404,
            detail="Workspace location not configured for this agency and region.",
        )
    return loc


@router.post("", response_model=WorkspaceLocationResponse)
def set_workspace_location(
    payload: WorkspaceLocationCreateOrUpdateRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_agency_admin),
):
    return save_workspace_location(
        db=db,
        current_admin=current_admin,
        latitude=payload.latitude,
        longitude=payload.longitude,
        radius_meters=payload.radius_meters,
        http_request=http_request,
    )


@router.put("", response_model=WorkspaceLocationResponse)
def update_workspace_location(
    payload: WorkspaceLocationCreateOrUpdateRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_agency_admin),
):
    return save_workspace_location(
        db=db,
        current_admin=current_admin,
        latitude=payload.latitude,
        longitude=payload.longitude,
        radius_meters=payload.radius_meters,
        http_request=http_request,
    )


@router.post("/personnel-log", response_model=PersonnelLocationLogResponse)
def record_personnel_location(
    payload: PersonnelLocationLogCreate,
    http_request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log_entry = log_personnel_location_and_check_geofence(
        db=db,
        personnel_user=current_user,
        latitude=payload.latitude,
        longitude=payload.longitude,
        source=payload.source,
        background_tasks=background_tasks,
        http_request=http_request,
    )
    return log_entry
