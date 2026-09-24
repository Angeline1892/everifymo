# backend/app/desktop/routers/verification/verification_response.py
from uuid import UUID

from fastapi import Request

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.sessions import get_db
from app.core.dependencies import get_current_user
from app.core.constants import Role
from app.desktop.schemas.verification.verification import (
    FdaVerificationSubmitRequest,
    FdaVerificationSubmitResponse,
    FdaVerificationRejectRequest,
    FdaVerificationRejectResponse,
    LeaInitiateTakedownRequest,
    LeaFdaResponseActionResponse,
)

from app.desktop.services.verification.fda_verification_response import (
    submit_fda_verification_response,
    reject_fda_verification_response,
)

from app.desktop.services.verification.lea_verification_response import (
    acknowledge_fda_response,
    initiate_takedown,
)

fda_response_router = APIRouter(prefix="/verification-requests", tags=["Verification Requests"])


    #
    #
    #
    #
    #
    #
    # POST /verification-requests/{request_id}/fda-response
@fda_response_router.post("/{request_id}/fda-response", response_model=FdaVerificationSubmitResponse)
def submit_fda_response(
    request_id: UUID,
    data: FdaVerificationSubmitRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != Role.FDA_PERSONNEL:
        raise HTTPException(status_code=403, detail="Only FDA personnel can submit a verification response.")

    verification_request, complaint = submit_fda_verification_response(
        db, request_id, current_user, data, http_request
    )

    return FdaVerificationSubmitResponse(
        request_id=verification_request.request_id,
        verification_request_status=verification_request.verification_request_status,
        cpr_number=verification_request.cpr_number,
        cpr_expiry=verification_request.cpr_expiry,
        response_notes=verification_request.response_notes,
        unregistered_reason=verification_request.unregistered_reason,
        responded_by=verification_request.responded_by,
        responded_at=verification_request.responded_at,
        complaint_id=complaint.complaint_id,
        complaint_status=complaint.status,
    )


    #
    #
    #
    #
    #
    #
    # POST /verification-requests/{request_id}/fda-reject
@fda_response_router.post("/{request_id}/fda-reject", response_model=FdaVerificationRejectResponse)
def reject_fda_response(
    request_id: UUID,
    data: FdaVerificationRejectRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != Role.FDA_PERSONNEL:
        raise HTTPException(status_code=403, detail="Only FDA personnel can reject a verification request.")

    verification_request, complaint = reject_fda_verification_response(db, request_id, current_user, data, http_request)

    return FdaVerificationRejectResponse(
        request_id=verification_request.request_id,
        verification_request_status=verification_request.verification_request_status,
        rejection_reason=verification_request.rejection_reason,
        responded_by=verification_request.responded_by,
        responded_at=verification_request.responded_at,
        complaint_id=complaint.complaint_id,
        complaint_status=complaint.status,
    )


    # added by Darlene --start
    #
    #
    #
    #
    #
    # POST /verification-requests/{request_id}/acknowledge
@fda_response_router.post("/{request_id}/acknowledge", response_model=LeaFdaResponseActionResponse)
def acknowledge_fda_response_endpoint(
    request_id: UUID,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != Role.LEA_PERSONNEL:
        raise HTTPException(status_code=403, detail="Only LEA personnel can acknowledge an FDA response.")
    return acknowledge_fda_response(db, request_id, current_user, http_request)


    #
    #
    #
    #
    #
    #
    # POST /verification-requests/{request_id}/initiate-takedown
@fda_response_router.post("/{request_id}/initiate-takedown", response_model=LeaFdaResponseActionResponse)
def initiate_takedown_endpoint(
    request_id: UUID,
    data: LeaInitiateTakedownRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != Role.LEA_PERSONNEL:
        raise HTTPException(status_code=403, detail="Only LEA personnel can initiate a takedown.")
    return initiate_takedown(db, request_id, current_user, data, http_request)
    # added by Darlene --end