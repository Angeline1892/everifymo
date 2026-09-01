import os
import shutil
from uuid import uuid4, UUID

from fastapi import APIRouter, Depends, Form, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.sessions import get_db
from app.models.walkin_intake_drafts import WalkinIntakeDraft
from app.models.draft_attachments import DraftAttachment
from app.desktop.schemas.drafts.drafts import (
    WalkinIntakeDraftSave,
    WalkinIntakeDraftResponse,
    WalkinIntakeDraftDetailResponse,   
    DraftAttachmentResponse,
    DraftStatus,
    SortOption,
)
from app.core.dependencies import get_current_user


router = APIRouter(prefix="/drafts/walkin", tags=["Walk-in Intake Drafts"])

# Local disk folder for now — swap this one line later when S3 is ready.
# Every other line in this file stays the same when that swap happens.
UPLOAD_DIR = "uploads/draft_attachments"

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf", ".docx"}
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB, matching the UI's stated limit


# Fields the officer's form requires (see Image 4/5) — everything
# EXCEPT full_name, contact_number, id_type, email, address,
# amount_paid, which are allowed to stay blank. At least one
# attached file is also required, but that's checked separately
# below since files aren't part of WalkinIntakeDraftSave's fields.
REQUIRED_TEXT_FIELDS = [
    "product_name", "manufacturer", "product_category",
    "place_of_purchase", "date_of_purchase", "nature_of_complaint",
]


def _determine_draft_status(data: WalkinIntakeDraftSave, has_files: bool) -> DraftStatus:
    # Check every required field one at a time. getattr(data, "product_name")
    # is the same as writing data.product_name — using the string name lets
    # us loop through all 6 fields instead of writing 6 separate if-checks.
    for field_name in REQUIRED_TEXT_FIELDS:
        if getattr(data, field_name) is None:   
            return DraftStatus.incomplete
    # All required text fields are filled in, but no file has been
    # attached yet — still not a complete draft.               
    if not has_files:
        # exists yet — still incomplete
        return DraftStatus.incomplete
    # Every required field is present AND at least one file exists.
    return DraftStatus.draft                        


def _save_file_to_disk(file: UploadFile, draft_id) -> dict:
    # Reject disallowed file types BEFORE ever touching disk — check
    # the filename's extension against our allowed list.
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file_extension}' is not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Create the top-level uploads folder if it doesn't exist yet.
    # exist_ok=True means "don't error if it's already there."
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Prefix the filename with a random UUID so two officers uploading
    # a file with the same name (e.g. "receipt.jpg") on the same day
    # don't silently overwrite each other's file on disk.
    unique_name = f"{uuid4()}_{file.filename}"
    # Store each draft's files inside their own subfolder, keyed by
    # draft_id — keeps everything organized and easy to find manually.
    destination_path = os.path.join(UPLOAD_DIR, str(draft_id), unique_name)
    os.makedirs(os.path.dirname(destination_path), exist_ok=True)

    # "wb" = write, in binary mode (files are bytes, not text).
    # copyfileobj streams the upload to disk in small chunks instead
    # of loading the entire file into memory at once — matters for
    # large PDFs/photos.
    with open(destination_path, "wb") as buffer:
        # file.file is the raw stream FastAPI gives us; shutil.copyfileobj
        # streams it to disk without loading the whole thing into memory
        shutil.copyfileobj(file.file, buffer)

    # Check size AFTER writing (we need the real byte count) — if it's
    # too large, delete what we just wrote and reject.
    actual_size = os.path.getsize(destination_path)
    if actual_size > MAX_FILE_SIZE_BYTES:
        os.remove(destination_path)
        raise HTTPException(status_code=400, detail="File exceeds the 25 MB limit.")

    # Return exactly the fields DraftAttachment needs, so the caller
    # can build the row without repeating this logic.
    return {
        "file_name": file.filename,
        "file_path": destination_path,
        "file_size_bytes": actual_size, 
        "mime_type": file.content_type,
    }

def _delete_file_from_disk(file_path: str) -> None:
    # Only attempt deletion if the file actually still exists — if
    # someone already deleted it manually, or this runs twice by
    # accident, we don't want to crash the whole request over it.
    if os.path.exists(file_path):
        os.remove(file_path)


    #
    #
    #
    #
    #
    #
    # POST /drafts/walkin/
@router.post("/", response_model=WalkinIntakeDraftResponse)
def save_walkin_draft(
    # Multipart requests can't take one Pydantic object as the body
    # the way JSON requests can — each field has to be declared
    # separately so FastAPI knows to parse it out of form data.
    full_name: str | None = Form(None),
    contact_number: str | None = Form(None),
    email: str | None = Form(None),
    id_type: str | None = Form(None),
    address: str | None = Form(None),
    product_name: str | None = Form(None),
    manufacturer: str | None = Form(None),
    product_category: str | None = Form(None),
    place_of_purchase: str | None = Form(None),
    date_of_purchase: str | None = Form(None),
    amount_paid: float | None = Form(None),
    nature_of_complaint: str | None = Form(None),

    # File() marks this as an uploaded file rather than a text field.
    # A list, since the officer can drop multiple files at once
    # (Image 5). default=[] means saving with zero files is allowed.
    files: list[UploadFile] = File(default=[]), 

    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Repackage the loose Form() parameters back into a
    # WalkinIntakeDraftSave object, so _determine_draft_status can
    # reuse the exact same logic regardless of whether the request
    # arrived as JSON or multipart form data.
    data = WalkinIntakeDraftSave(
        full_name=full_name, contact_number=contact_number, email=email,
        id_type=id_type, address=address, product_name=product_name,
        manufacturer=manufacturer, product_category=product_category,
        place_of_purchase=place_of_purchase, date_of_purchase=date_of_purchase,
        amount_paid=amount_paid, nature_of_complaint=nature_of_complaint,
    )

    status = _determine_draft_status(data, has_files=len(files) > 0)

    # Build the draft row. saved_by and region_id come from the
    # logged-in officer's token, NEVER from the request body — an
    # officer should never be able to claim someone else's identity
    # or region just by editing form data.
    new_draft = WalkinIntakeDraft(
        saved_by=current_user.user_id,
        region_id=current_user.region_id,
        draft_status=status,
        **data.model_dump(),
    )
    db.add(new_draft)
    db.commit()
    db.refresh(new_draft)
    # Only past this line does new_draft.draft_id exist as a REAL row
    # in Postgres — which is required before any DraftAttachment can
    # legally reference it via the walkin_draft_id foreign key.

    for uploaded_file in files:
        file_info = _save_file_to_disk(uploaded_file, new_draft.draft_id)
        attachment = DraftAttachment(
            walkin_draft_id=new_draft.draft_id,
            **file_info,
        )
        db.add(attachment)
    # One commit for all attachment rows together, rather than
    # committing inside the loop on every single file.
    db.commit()
    db.refresh(new_draft)

    return new_draft


    #
    #
    #
    #
    #
    #
    # GET /drafts/walkin/{draft_id}
@router.get("/{draft_id}", response_model=WalkinIntakeDraftDetailResponse)   
def get_walkin_draft(
    draft_id: UUID,  
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    draft = db.query(WalkinIntakeDraft).filter(
        WalkinIntakeDraft.draft_id == draft_id,
        # Privacy rule from the original spec — drafts are scoped by
        # saved_by, not region_id. An officer should only ever be able
        # to fetch THEIR OWN drafts, never a colleague's, even if they
        # somehow guessed another draft's ID.
        WalkinIntakeDraft.saved_by == current_user.user_id, 
    ).first()

    if not draft:
        # Deliberately vague — "not found" rather than "not yours."
        # Telling someone "this exists but isn't yours" would leak
        # information about other officers' drafts existing at all.
        raise HTTPException(status_code=404, detail="Draft not found.")

    # ADDED — fetch this draft's attachments separately, then attach
    # them to the response. Pydantic will read `draft`'s own fields
    # via from_attributes as usual, but attachments needs to be built
    # manually since it's not part of the WalkinIntakeDraft model itself.
    attachments = db.query(DraftAttachment).filter(
        DraftAttachment.walkin_draft_id == draft_id
    ).all()

    return WalkinIntakeDraftDetailResponse(
        **WalkinIntakeDraftResponse.model_validate(draft).model_dump(),
        attachments=[DraftAttachmentResponse.model_validate(a) for a in attachments],
    )


    #
    #
    #
    #
    #
    #
    # PUT /drafts/walkin/{draft_id}
@router.put("/{draft_id}", response_model=WalkinIntakeDraftResponse)
def update_walkin_draft(
    draft_id: UUID,
    full_name: str | None = Form(None),
    contact_number: str | None = Form(None),
    email: str | None = Form(None),
    id_type: str | None = Form(None),
    address: str | None = Form(None),
    product_name: str | None = Form(None),
    manufacturer: str | None = Form(None),
    product_category: str | None = Form(None),
    place_of_purchase: str | None = Form(None),
    date_of_purchase: str | None = Form(None),
    amount_paid: float | None = Form(None),
    nature_of_complaint: str | None = Form(None),
    files: list[UploadFile] = File(default=[]),

    # NEW — attachment_ids the officer clicked the X on. A separate
    # list from `files`, since one is "add" and this one is "remove."
    # default=[] means "removed nothing" is a valid, normal case.
    remove_attachment_ids: list[UUID] = Form(default=[]),

    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    draft = db.query(WalkinIntakeDraft).filter(
        WalkinIntakeDraft.draft_id == draft_id,        # 1
        WalkinIntakeDraft.saved_by == current_user.user_id,         # 2
    ).first()

    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found.")   # 3

    # --- Handle removals first ---
    attachments_to_remove = db.query(DraftAttachment).filter(
        DraftAttachment.walkin_draft_id == draft_id,
        # .in_() checks "is this row's attachment_id inside this list" —
        # lets us match multiple rows in one query instead of looping
        # one filter per ID
        DraftAttachment.attachment_id.in_(remove_attachment_ids),
    ).all()

    # Remember the file paths BEFORE deleting the rows, same reasoning
    # as the submit-order notes — grab what we need before anything
    # gets removed
    paths_to_delete_from_disk = [a.file_path for a in attachments_to_remove]

    for attachment in attachments_to_remove:
        db.delete(attachment)

    data = WalkinIntakeDraftSave(
        full_name=full_name, contact_number=contact_number, email=email,
        id_type=id_type, address=address, product_name=product_name,
        manufacturer=manufacturer, product_category=product_category,
        place_of_purchase=place_of_purchase, date_of_purchase=date_of_purchase,
        amount_paid=amount_paid, nature_of_complaint=nature_of_complaint,
    )

    for field_name, value in data.model_dump().items():
        setattr(draft, field_name, value)

    # Add any newly uploaded files
    for uploaded_file in files:
        file_info = _save_file_to_disk(uploaded_file, draft_id)
        attachment = DraftAttachment(
            walkin_draft_id=draft_id,
            **file_info,
        )
        db.add(attachment)

    # Commit everything (removals, field updates, new attachments)
    # together first, since draft_status depends on knowing the FINAL
    # count, which we can only be sure of once removals are counted
    db.commit()

    # NOW check how many attachments actually remain, straight from
    # the database, after removals and additions are both committed
    remaining_attachment_count = db.query(DraftAttachment).filter(
        DraftAttachment.walkin_draft_id == draft_id
    ).count()

    draft.draft_status = _determine_draft_status(data, has_files=remaining_attachment_count > 0)
    db.commit()
    db.refresh(draft)   

    # Only delete from disk AFTER the database commit succeeded —
    # confirms the removal was really saved before touching real files
    for path in paths_to_delete_from_disk:
        _delete_file_from_disk(path)

    return draft


    #
    #
    #
    #
    #
    #
    # DELETE /drafts/walkin/{draft_id}
@router.delete("/{draft_id}")
def delete_walkin_draft(
    draft_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Same ownership-scoped fetch pattern as get_walkin_draft and
    # update_walkin_draft — reused a third time now
    draft = db.query(WalkinIntakeDraft).filter(
        WalkinIntakeDraft.draft_id == draft_id,
        WalkinIntakeDraft.saved_by == current_user.user_id,
    ).first()

    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found.")

    # Grab every attachment's file path BEFORE we delete the draft —
    # once the draft is deleted, ON DELETE CASCADE wipes these rows
    # automatically, and we'd lose access to file_path forever
    attachments = db.query(DraftAttachment).filter(
        DraftAttachment.walkin_draft_id == draft_id
    ).all()

    paths_to_delete_from_disk = [a.file_path for a in attachments]

    # Deleting the draft automatically cascades and removes all its
    # draft_attachments rows too — no need to manually delete those
    db.delete(draft)
    db.commit()

    # Only NOW, after the database confirms the deletion succeeded,
    # do we touch the real filesystem
    for path in paths_to_delete_from_disk:
        _delete_file_from_disk(path)

    return {"message": "Draft deleted successfully."}


    #
    #
    #
    #
    #
    #
    # GET /drafts/walkin/
@router.get("/", response_model=list[WalkinIntakeDraftResponse])
def list_walkin_drafts(
    status: DraftStatus | None = Query(None),
    search: str | None = Query(None),
    sort: SortOption = Query(SortOption.recently_edited),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = db.query(WalkinIntakeDraft).filter(
        WalkinIntakeDraft.saved_by == current_user.user_id
    )

    if status is not None:
        query = query.filter(WalkinIntakeDraft.draft_status == status)

    if search is not None:
        query = query.filter(WalkinIntakeDraft.product_name.ilike(f"%{search}%"))

    # No join needed here — unlike verification drafts, product_name
    # lives directly on this table
    if sort == SortOption.recently_edited:
        query = query.order_by(WalkinIntakeDraft.updated_at.desc())
    elif sort == SortOption.oldest_first:
        query = query.order_by(WalkinIntakeDraft.updated_at.asc())
    elif sort == SortOption.product_name_az:
        query = query.order_by(WalkinIntakeDraft.product_name.asc())

    return query.all()

