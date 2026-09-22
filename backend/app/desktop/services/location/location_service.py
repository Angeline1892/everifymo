import math
import uuid
import httpx
from datetime import datetime, timezone
from typing import Optional, Tuple

from fastapi import Request, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session

from app.core.audit import write_audit_log, get_user_region_code
from app.core.constants import Role, AuditAction
from app.models.users import User
from app.models.regions import Region
from app.models.workspace_locations import WorkspaceLocation
from app.models.personnel_location_logs import PersonnelLocationLog
from app.desktop.schemas.workspace_locations.workspace_location import (
    WorkspaceLocationResponse,
    PersonnelLocationLogResponse,
)
from app.desktop.services.admin_notifications import admin_notification_service as notification_service
from app.desktop.schemas.admin_notifications.notification_enums import NotificationEventType
from app.desktop.services.auth.email import send_location_anomaly_email


def calculate_haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> int:
    """
    Calculate the great circle distance between two points on the Earth
    specified in decimal degrees using the Haversine formula.
    Returns distance rounded to the nearest integer in meters.
    """
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return int(round(R * c))


def format_distance_string(distance_meters: Optional[int | float]) -> str:
    if distance_meters is None:
        return "—"
    if distance_meters < 1000:
        return f"{int(round(distance_meters))} m"
    return f"{distance_meters / 1000.0:.1f} km"


def get_client_ip(http_request: Optional[Request]) -> str:
    if not http_request:
        return "127.0.0.1"
    forwarded = http_request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = http_request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    if http_request.client:
        return http_request.client.host
    return "127.0.0.1"


def get_coordinates_from_ip(ip_address: str) -> Optional[Tuple[float, float]]:
    """
    Looks up approximate coordinates (latitude, longitude) from IP address.
    If private/loopback IP (e.g. localhost, 127.0.0.1, 192.168.x.x, 10.x.x.x),
    queries the public IP geolocation API.
    """
    is_private = (
        not ip_address
        or ip_address in ("127.0.0.1", "localhost", "::1", "testclient")
        or ip_address.startswith("192.168.")
        or ip_address.startswith("10.")
        or ip_address.startswith("172.16.")
    )

    url = "http://ip-api.com/json/" if is_private else f"http://ip-api.com/json/{ip_address}"
    try:
        with httpx.Client(timeout=3.0) as client:
            resp = client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "success" or ("lat" in data and "lon" in data):
                    lat = float(data.get("lat"))
                    lon = float(data.get("lon"))
                    return (lat, lon)
    except Exception as exc:
        print(f"IP Geolocation lookup failed for {ip_address}: {exc}")
    return None


def format_admin_display_name(user: Optional[User]) -> str:
    if not user:
        return "—"
    if user.first_name and user.last_name:
        return f"{user.first_name[0]}. {user.last_name}"
    return user.email


def format_workspace_office_name(agency: str, region_name: Optional[str]) -> str:
    if not region_name:
        return "Workspace office"
    clean_region = region_name.replace("Region ", "").replace("region ", "").strip()
    if not clean_region:
        return "Workspace office"
    if "fda" in agency.lower():
        return f"FDA Region {clean_region} office"
    return f"CIDG Region {clean_region} office"


def format_footer_agency_region(agency: str, region_name: Optional[str]) -> str:
    if not region_name:
        return "Regional Office"
    clean_region = region_name.replace("Region ", "").replace("region ", "").strip()
    if "fda" in agency.lower():
        return f"Regional Office {clean_region}"
    return f"Regional Field Unit {clean_region}"


def agency_of_user(user: User) -> str:
    if user.role in (Role.FDA_ADMIN, Role.FDA_PERSONNEL):
        return "FDA"
    if user.role in (Role.LEA_ADMIN, Role.LEA_PERSONNEL):
        return "LEA-CIDG"
    return "FDA"


def get_workspace_location_for_user(db: Session, user: User) -> Optional[WorkspaceLocationResponse]:
    if not user.region_id:
        return None

    agency = agency_of_user(user)
    ws = (
        db.query(WorkspaceLocation)
        .filter(
            WorkspaceLocation.agency == agency,
            WorkspaceLocation.region_id == user.region_id,
        )
        .first()
    )

    region = db.query(Region).filter(Region.region_id == user.region_id).first()
    region_name = region.region_name if region else None

    if not ws:
        return WorkspaceLocationResponse(
            workspace_location_id=None,
            agency=agency,
            region=region_name,
            region_id=user.region_id,
            latitude=None,
            longitude=None,
            radius_meters=500,
            created_at=None,
            updated_at=None,
            updated_by=None,
        )

    updater = db.query(User).filter(User.user_id == ws.updated_by).first() if ws.updated_by else None

    return WorkspaceLocationResponse(
        workspace_location_id=ws.workspace_location_id,
        agency=ws.agency,
        region=region_name,
        region_id=ws.region_id,
        latitude=float(ws.latitude) if ws.latitude is not None else None,
        longitude=float(ws.longitude) if ws.longitude is not None else None,
        radius_meters=ws.radius_meters,
        created_at=ws.created_at,
        updated_at=ws.updated_at or ws.created_at,
        updated_by=format_admin_display_name(updater) if updater else None,
    )


def save_workspace_location(
    db: Session,
    current_admin: User,
    latitude: float,
    longitude: float,
    radius_meters: int = 500,
    http_request: Optional[Request] = None,
) -> WorkspaceLocationResponse:
    if current_admin.role not in Role.ADMIN_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Only Regional Administrators can configure workspace location coordinates.",
        )

    if not current_admin.region_id:
        raise HTTPException(
            status_code=400,
            detail="Admin has no assigned region.",
        )

    agency = agency_of_user(current_admin)
    ws = (
        db.query(WorkspaceLocation)
        .filter(
            WorkspaceLocation.agency == agency,
            WorkspaceLocation.region_id == current_admin.region_id,
        )
        .first()
    )

    now = datetime.now(timezone.utc)
    old_value = None

    if ws:
        old_value = {
            "latitude": float(ws.latitude),
            "longitude": float(ws.longitude),
            "radius_meters": ws.radius_meters,
        }
        ws.latitude = latitude
        ws.longitude = longitude
        ws.radius_meters = radius_meters
        ws.updated_by = current_admin.user_id
        ws.updated_at = now
        action = AuditAction.UPDATE_WORKSPACE_LOCATION
    else:
        ws = WorkspaceLocation(
            agency=agency,
            region_id=current_admin.region_id,
            latitude=latitude,
            longitude=longitude,
            radius_meters=radius_meters,
            created_by=current_admin.user_id,
            updated_by=current_admin.user_id,
            created_at=now,
            updated_at=now,
        )
        db.add(ws)
        action = AuditAction.SET_WORKSPACE_LOCATION

    db.commit()
    db.refresh(ws)

    new_value = {
        "latitude": float(ws.latitude),
        "longitude": float(ws.longitude),
        "radius_meters": ws.radius_meters,
    }

    region = db.query(Region).filter(Region.region_id == current_admin.region_id).first()
    region_name = region.region_name if region else None

    write_audit_log(
        db,
        user=current_admin,
        action=action,
        target_table="workspace_locations",
        target_id=ws.workspace_location_id,
        target_reference=f"{agency} {region_name or ''}".strip(),
        old_value=old_value,
        new_value=new_value,
        request=http_request,
        region_code=get_user_region_code(db, current_admin),
    )

    return WorkspaceLocationResponse(
        workspace_location_id=ws.workspace_location_id,
        agency=ws.agency,
        region=region_name,
        region_id=ws.region_id,
        latitude=float(ws.latitude),
        longitude=float(ws.longitude),
        radius_meters=ws.radius_meters,
        created_at=ws.created_at,
        updated_at=ws.updated_at,
        updated_by=format_admin_display_name(current_admin),
    )


def log_personnel_location_and_check_geofence(
    db: Session,
    personnel_user: User,
    latitude: float,
    longitude: float,
    source: str = "gps",
    session_id: Optional[uuid.UUID] = None,
    background_tasks: Optional[BackgroundTasks] = None,
    http_request: Optional[Request] = None,
) -> PersonnelLocationLog:
    """
    Logs personnel coordinates, verifies against workspace geofence radius,
    and handles security anomaly alerts if outside the boundary.
    """
    agency = agency_of_user(personnel_user)
    ws = None
    if personnel_user.region_id:
        ws = (
            db.query(WorkspaceLocation)
            .filter(
                WorkspaceLocation.agency == agency,
                WorkspaceLocation.region_id == personnel_user.region_id,
            )
            .first()
        )

    distance_meters = None
    is_anomaly = False
    radius_meters = 500

    if ws and ws.latitude is not None and ws.longitude is not None:
        radius_meters = ws.radius_meters
        distance_meters = calculate_haversine_distance_meters(
            latitude, longitude, float(ws.latitude), float(ws.longitude)
        )
        if distance_meters > radius_meters:
            is_anomaly = True
    else:
        # If no workspace location configured yet, we record the coordinates without flagging anomaly
        distance_meters = 0
        is_anomaly = False

    log_entry = PersonnelLocationLog(
        personnel_id=personnel_user.user_id,
        workspace_location_id=ws.workspace_location_id if ws else None,
        session_id=session_id,
        latitude=latitude,
        longitude=longitude,
        distance_meters=distance_meters,
        is_anomaly=is_anomaly,
        source=source if source in ("gps", "ip") else "gps",
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)

    # If an anomaly is detected, dispatch alerts
    if is_anomaly:
        region = db.query(Region).filter(Region.region_id == personnel_user.region_id).first() if personnel_user.region_id else None
        region_name = region.region_name if region else "Region"

        admin_role = Role.FDA_ADMIN if personnel_user.role == Role.FDA_PERSONNEL else Role.LEA_ADMIN
        personnel_name = f"{personnel_user.first_name or ''} {personnel_user.last_name or ''}".strip() or personnel_user.email
        formatted_distance = format_distance_string(distance_meters)
        workspace_name = format_workspace_office_name(agency, region_name)
        footer_region = format_footer_agency_region(agency, region_name)
        detection_label = "device GPS" if source == "gps" else "IP address (approximate)"
        login_timestamp = datetime.now().strftime("%b %d, %Y, %I:%M %p")

        # 1. Audit Log
        write_audit_log(
            db,
            user=personnel_user,
            action=AuditAction.LOCATION_ANOMALY_DETECTED,
            target_table="personnel_location_logs",
            target_id=log_entry.log_id,
            target_reference=personnel_user.email,
            new_value={
                "latitude": float(latitude),
                "longitude": float(longitude),
                "distance_meters": distance_meters,
                "radius_meters": radius_meters,
                "source": source,
            },
            request=http_request,
            region_code=get_user_region_code(db, personnel_user),
        )

        # 2. In-App Notification to Regional Admin Workspace
        notification_service.notify_regional_admin_workspace(
            db=db,
            agency_admin_role=admin_role,
            region_id=personnel_user.region_id,
            agency=agency,
            event_type=NotificationEventType.LOCATION_ANOMALY_DETECTED,
            title="Location Anomaly Detected",
            message=f"Personnel {personnel_name} ({personnel_user.email}) logged in from {formatted_distance} away — outside the {radius_meters}m workspace radius.",
            related_user_id=personnel_user.user_id,
        )

        # 3. Automated Alert Email to Regional Admins
        active_admins = (
            db.query(User)
            .filter(
                User.role == admin_role,
                User.region_id == personnel_user.region_id,
                User.is_active == True,
            )
            .all()
        )

        for admin in active_admins:
            if background_tasks:
                background_tasks.add_task(
                    send_location_anomaly_email,
                    to_email=admin.email,
                    agency=agency,
                    personnel_name=personnel_name,
                    personnel_email=personnel_user.email,
                    login_at=login_timestamp,
                    distance=formatted_distance,
                    workspace_name=workspace_name,
                    radius_meters=radius_meters,
                    detection_source=detection_label,
                    footer_agency_region=footer_region,
                )

    return log_entry
