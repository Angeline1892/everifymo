# Walk-in Intake Drafts — Feature Documentation

**Project:** E-VerifyMo (LEA-CIDG Workspace)
**Feature:** Saved Drafts → Walk-in Intake
**Last updated:** July 2026
**Status:** Save (create) endpoint fully built and tested. List, Get, Update, Delete, and Submit are not built yet.

---

## 1. What This Feature Does (Plain Explanation)

When an LEA officer starts filling out the **New Walk-in Intake** form (complainant info + product info + evidence files), they may not want to finish and submit it right away. Instead of losing their progress, they can click **"Save as Draft."**

A draft is **not** a real complaint yet. It is a temporary, private row that only the officer who created it can see. Nothing else in the system (other officers, FDA, reports) knows this draft exists until the officer eventually clicks **"Log Complaint & Queue for FDA,"** which is a completely separate step (not covered in this document — see the Submit Service documentation once that's built).

### The Two Draft Statuses

| Status | Meaning |
|---|---|
| `incomplete` | Some required fields are still empty, OR no file has been attached yet. |
| `draft` | Every required field is filled in, **and** at least one file is attached. |

The officer never picks which status applies — the backend decides this automatically every time a save happens, based on what data was actually sent.

---

## 2. Database Tables Involved

### `walkin_intake_drafts`
Stores the draft's text data (complainant details + product details). Model file: `app/models/walkin_intake_drafts.py`

Key facts:
- `draft_id` — Primary key, auto-generated UUID.
- `saved_by` — The officer who owns this draft. **Private** — only this officer can see/edit it.
- `region_id` — Comes from the officer's login token, never from what the officer typed.
- `draft_status` — Either `'incomplete'` or `'draft'` (enforced by a database CHECK constraint).
- No `case_reference` column — that only gets generated later, when the draft is actually submitted and becomes a real `complaints` row.

### `draft_attachments`
Stores the files an officer uploaded for a specific draft. Model file: `app/models/draft_attachments.py`

Key facts:
- `walkin_draft_id` — Foreign key pointing back to `walkin_intake_drafts.draft_id`. **This is required (`NOT NULL`)**, which means a file can never exist without an already-existing draft row. This detail shapes the order of operations inside the save endpoint (see Section 5).
- `ON DELETE CASCADE` — if a draft gets deleted, its attachment rows are automatically deleted too. You don't need to manually delete attachments first.

---

## 3. Schema File (Pydantic)

**File:** `app/desktop/schemas/drafts/drafts.py`

Pydantic schemas describe the *shape* of data going in and out of the API. They are separate from the SQLAlchemy models — models describe the database table, schemas describe the request/response JSON.

### Enums
```python
class DraftStatus(str, Enum):
    incomplete = "incomplete"
    draft = "draft"

class IdType(str, Enum):
    philsys = "philsys"
    passport = "passport"
    drivers_license = "drivers_license"
    other = "other"
```
These mirror the exact strings allowed by the database's CHECK constraints. If the database only allows these values, the schema should not allow anything else either — this catches typos before they ever reach a SQL query.

### `WalkinIntakeDraftSave`
What the officer's form sends when saving. Every field is optional at the schema level, because the officer might save a half-filled form — the backend decides completeness separately (see Section 4).

### `WalkinIntakeDraftResponse`
What gets sent back (e.g., reopening a saved draft). Inherits all fields from `WalkinIntakeDraftSave`, then adds system-controlled fields: `draft_id`, `saved_by`, `region_id`, `draft_status`, `created_at`, `updated_at`.

```python
model_config = ConfigDict(from_attributes=True)
```
This one line matters a lot. Normally Pydantic expects a dictionary-like input (`field=value`). But when we fetch a row from the database, SQLAlchemy gives us a **model object** instead, where you access fields with a dot (`draft_row.full_name`) rather than a dictionary key. `from_attributes=True` tells Pydantic "it's fine to read this object using dots" — without it, returning a raw database row directly would crash.

### `DraftAttachmentResponse`
Read-only schema representing one uploaded file's metadata. There is no matching "Save" schema for attachments, because files are never submitted as JSON — they arrive through the file upload part of the request (see Section 5).

---

## 4. Completeness Logic (Incomplete vs. Draft)

**Location:** inside `app/desktop/routers/drafts/walkin_drafts.py`

### Required Fields (per the UI form)
```python
REQUIRED_TEXT_FIELDS = [
    "product_name", "manufacturer", "product_category",
    "place_of_purchase", "date_of_purchase", "nature_of_complaint",
]
```

### Optional Fields
`full_name`, `contact_number`, `id_type`, `email`, `address`, `amount_paid`

### The Rule
A draft becomes `"draft"` status only if **both** of these are true:
1. Every field in `REQUIRED_TEXT_FIELDS` has a value (not `None`).
2. At least one file has been attached.

If either condition fails, the status is `"incomplete"`.

```python
def _determine_draft_status(data: WalkinIntakeDraftSave, has_files: bool) -> DraftStatus:
    for field_name in REQUIRED_TEXT_FIELDS:
        if getattr(data, field_name) is None:
            return DraftStatus.incomplete
    if not has_files:
        return DraftStatus.incomplete
    return DraftStatus.draft
```

**Important:** The frontend never gets to decide the status directly. Even if the officer's UI shows a "Draft" label somewhere, the backend re-checks everything itself and can override it. This protects data integrity if the frontend has a bug or someone tries to manually send a fake status.

---

## 5. Why the Save Endpoint Uses `multipart/form-data` (Not Plain JSON)

The officer can attach files (photos, receipts, IDs) in the **same** save action as the text fields. FastAPI cannot accept a single JSON body containing both text fields and file uploads — when files are involved, the whole request must be sent as `multipart/form-data`, and every field has to be declared individually using `Form(...)` (for text) or `File(...)` (for files), instead of one combined Pydantic object.

### The Required Order of Operations

This part is critical and easy to get backwards:

1. **Create the `walkin_intake_drafts` row first**, and `commit()` it.
2. **Only after that commit succeeds**, create the `draft_attachments` rows.

Why this order matters: `draft_attachments.walkin_draft_id` is a **foreign key** that is `NOT NULL`. A foreign key is Postgres's way of saying "this value must point to a row that genuinely exists in the other table." Before the first `commit()`, the draft only exists in Python's memory — Postgres itself doesn't know about it yet. If we tried to insert an attachment before that commit, Postgres would reject it, because there would be no real `draft_id` for it to point to yet.

```python
new_draft = WalkinIntakeDraft(...)
db.add(new_draft)
db.commit()
db.refresh(new_draft)
# Only NOW does new_draft.draft_id exist as a real row in the database.

for uploaded_file in files:
    file_info = _save_file_to_disk(uploaded_file, new_draft.draft_id)
    attachment = DraftAttachment(walkin_draft_id=new_draft.draft_id, **file_info)
    db.add(attachment)

db.commit()
db.refresh(new_draft)
```

### Where Files Are Actually Stored

**For now:** local disk, inside `backend/uploads/draft_attachments/<draft_id>/<uuid>_<original filename>/`

This was a deliberate, temporary decision — the project has no AWS deployment yet, so building against S3 right now would require AWS credentials and setup just to test a basic save. Since `file_path` is just a plain text column in the database, it doesn't matter whether it holds a local file path or an S3 key — switching to S3 later will only require changing the one function that writes the file (`_save_file_to_disk`), nothing else in the endpoint or schema needs to change.

The random UUID prefix on each filename (e.g. `a1b2c3d4-...-example_receipt.jpg`) prevents two different officers from accidentally overwriting each other's file if they both happen to upload something with the same original name (like `receipt.jpg`) on the same day.

---

## 6. Authentication: `get_current_user`

**Location:** `app/core/dependencies.py` (shared file, owned by a teammate — not this feature's own code)

Every protected endpoint (including the drafts save endpoint) requires a valid login token, checked through this dependency:

```python
def get_current_user(
    authorization: str = Header(...),
    db: Session = Depends(get_db),
) -> User:
    ...
    token = authorization.removeprefix("Bearer ")
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    user = db.query(User).filter(User.user_id == user_id).first()
    ...
    return user
```

The request must include a header like:
```
authorization: Bearer <token>
```

### ⚠️ Important Fix Required Here (RLS)

See Section 7 below — without a small fix, this dependency **cannot find any FDA/LEA officer at all**, because of how Row-Level Security (RLS) works on the `users` table. This is not specific to the drafts feature — it blocks **every** protected endpoint in the whole app. If you're reading this and the fix hasn't been applied yet, nothing involving login will work.

The `saved_by` and `region_id` fields on a new draft always come from `current_user` (the officer's real, verified identity from their token) — **never** from anything the officer typed in the request body. This is a security rule: an officer should never be able to claim someone else's identity or region just by editing form data.

---

## 7. Understanding Row-Level Security (RLS) — Read This Carefully

This tripped us up multiple times during testing, so it's worth explaining properly.

### What RLS Actually Is

RLS is **not** a one-time setup you configure once and then forget about. It is a filter that Postgres re-applies to **every single query, every single time**, based on session variables that the *current database connection* has to explicitly set. Nothing is remembered between connections — every new connection (a new API request, a new script run, a new pgAdmin session) starts completely "blank," with zero context about who is asking.

### The Actual Policy on `users`

```sql
CREATE POLICY region_isolation_policy ON users
USING (
    current_setting('app.bypass_rls', true) = 'true'
    OR role = 'superadmin'
    OR region_id::text = current_setting('app.current_region_id', true)
);
```

A row is visible only if **one** of these is true:
1. The session explicitly set `app.bypass_rls = 'true'`
2. The row being looked at has `role = 'superadmin'` (any superadmin row is visible to anyone, always)
3. The row's `region_id` matches a `current_region_id` the session already set

### Why This Broke Login for FDA/LEA Officers

To log in, the system must look up an officer's row **before** it knows anything about them (their region, their role — that's the whole point of looking them up). But condition #3 above requires the session to *already* know the region before the lookup is even allowed to succeed. This is a chicken-and-egg deadlock: you can't know the region without the lookup, and you can't do the lookup without the region.

This is why:
- Seeding a **superadmin** account worked fine with no special handling — superadmin rows are always visible (condition #2).
- Seeding and looking up an **FDA/LEA** officer silently failed — not with an error, but by returning "no rows found," even though the row clearly existed in pgAdmin. RLS blocks `SELECT` queries silently; there's no error message, it just looks like the data isn't there.

### The Fix

Anywhere in the code that needs to look up a user **before** their identity/region is already known (registration, login, and — critically — `get_current_user` itself), a bypass must be set right before that specific lookup:

```python
from sqlalchemy import text

db.execute(text("SET app.bypass_rls = 'true'"))
user = db.query(User).filter(User.user_id == user_id).first()
```

This should be scoped narrowly — only around the identity-lookup step, not the entire endpoint — so that everything else in the request still respects RLS normally once the user's identity is confirmed.

**This fix was applied to `get_current_user` in `app/core/dependencies.py`.** If this file gets reverted or rebuilt later, this bypass line needs to be added back, or no FDA/LEA officer will ever be able to authenticate.

---

## 8. Testing Setup (Since Real Login Doesn't Exist Yet)

At the time of building this feature, the real FDA/LEA login endpoint had not been built yet by the teammate responsible for it. Two temporary scripts were created to allow testing anyway:

### `scripts/seed_test_officer.py`
Creates a test FDA or LEA account directly in the database, skipping the invite/approval flow. Prompts for email, password, role, and region code interactively (nothing hardcoded). Must include the RLS bypass line before inserting, or the insert will fail with:
```
psycopg2.errors.InsufficientPrivilege: new row violates row-level security policy for table "users"
```

### `scripts/mint_test_token.py`
Looks up the seeded officer by email and generates a real, properly-signed JWT for them using the same `create_access_token()` function the real login endpoint will eventually use. The resulting token works exactly like one issued by a genuine login. Also requires the RLS bypass line before its lookup.

**Both scripts should be deleted (or clearly marked as dev-only / never deployed) once the real login endpoint exists.**

---

## 9. How to Test This Endpoint

### Why Swagger UI (`/docs`) Doesn't Fully Work Here

There is a known Swagger UI limitation: when an endpoint requires **both** a header parameter (like `authorization`) **and** a `multipart/form-data` body (needed here because of file uploads), Swagger sometimes fails to actually attach the header to the outgoing request — even though the field looks correctly filled in on screen. This was confirmed during testing: the header showed correctly in the UI, but the generated `curl` command underneath consistently omitted it.

**Conclusion:** Use direct `curl` commands (via terminal) to test this specific endpoint, not Swagger's "Try it out" button. Pure JSON endpoints (no file uploads) should still work fine in Swagger.

### Getting a Token
```bash
python -m scripts.mint_test_token
```
Enter the seeded officer's email. Copy the printed token (the long string after "Bearer token:").

**Note:** Tokens expire after 60 minutes (`create_access_token`'s default). If a test suddenly fails with an auth error after a while, mint a fresh token first.

### Testing Without Files (should return `"incomplete"`)

**Important — Windows PowerShell users:** PowerShell has its own built-in `curl` that is secretly an alias for a different tool (`Invoke-WebRequest`) with completely different syntax. Use `curl.exe` explicitly to get the real curl program, and keep the whole command on one line (PowerShell doesn't support the `^` line-continuation character the way cmd.exe does).

```powershell
curl.exe -X POST "http://127.0.0.1:8000/drafts/walkin/" -H "authorization: Bearer PASTE_TOKEN_HERE" -F "product_name=Test Product" -F "manufacturer=Test Manufacturer" -F "product_category=Cosmetics" -F "place_of_purchase=Public market" -F "date_of_purchase=2026-01-15" -F "nature_of_complaint=Test complaint statement"
```

### Testing With a File Attached (should return `"draft"`)

The `@` symbol before a file path tells curl "read this from disk and upload it as an actual file," rather than sending it as plain text.

```powershell
curl.exe -X POST "http://127.0.0.1:8000/drafts/walkin/" -H "authorization: Bearer PASTE_TOKEN_HERE" -F "product_name=Test Product" -F "manufacturer=Test Manufacturer" -F "product_category=Cosmetics" -F "place_of_purchase=Public market" -F "date_of_purchase=2026-01-15" -F "nature_of_complaint=Test complaint statement" -F "files=@C:\path\to\your\test-file.jpg"
```

To attach multiple files, repeat the `-F "files=@..."` flag once per file.

### What to Verify After Each Test
1. **Status code / response body** — does `draft_status` match what you expected (`incomplete` vs `draft`)?
2. **`saved_by` and `region_id`** in the response — these should match the seeded officer's real `user_id`/`region_id` in pgAdmin, confirming the token → `get_current_user` → real user chain is genuinely working (not accidentally returning placeholder values).
3. **If files were sent:** check `backend/uploads/draft_attachments/<draft_id>/` on disk — the actual file should physically be there. Also check the `draft_attachments` table in pgAdmin:
   ```sql
   SELECT * FROM draft_attachments WHERE walkin_draft_id = '<draft_id>';
   ```
   Confirm `file_path` matches the real file location and `file_size_bytes` is a sensible non-zero number.

---

## 10. Common Errors Encountered During Development (Troubleshooting Log)

| Error | Cause | Fix |
|---|---|---|
| `ModuleNotFoundError: No module named 'app'` | Ran a test script directly (`python tests/file.py`) instead of as a module | Run with `python -m tests.file` instead, from the project root |
| `ModuleNotFoundError: No module named 'pydantic'` | Virtual environment (`.venv`) wasn't activated in that terminal | Run `.venv\Scripts\activate` first |
| `jwt.exceptions.InvalidKeyError: HMAC key must not be empty` | `SECRET_KEY` (or similar) missing from local `.env` file | Add a `.env` file locally with your own secret key value (get the variable name from a teammate, value can be different per developer for local testing) |
| `RuntimeError: Form data requires "python-multipart"` | Missing package needed to parse file uploads | `pip install python-multipart` |
| `new row violates row-level security policy for table "users"` | Script/endpoint tried to insert/query `users` without setting the RLS bypass first | Add `db.execute(text("SET app.bypass_rls = 'true'"))` before the query |
| `{"detail":"User not found."}` even though the user exists in pgAdmin | Same RLS issue, but on a `SELECT` instead of `INSERT` — RLS blocks silently, no error, just an empty result | Same fix — bypass before the lookup |
| Swagger UI: `authorization` header missing from generated curl, even though the field looked filled in | Known Swagger UI bug with header + multipart/form-data combination | Test via direct `curl.exe` commands instead |
| PowerShell: `curl : A parameter cannot be found that matches parameter name 'X'` | PowerShell's built-in `curl` alias is actually `Invoke-WebRequest`, not real curl | Use `curl.exe` explicitly |
| `Value error, Expected UploadFile, received: <class 'str'>` on `files` in Swagger | Swagger's "Send empty value" checkbox was checked, sending an empty string instead of a truly empty array | Uncheck "Send empty value" for the `files` field |

---

## 11. What's Left to Build

- [ ] **List endpoint** — combined view for the Saved Drafts page (both walk-in and verification request drafts, with filters: type, status, search, sort)
- [ ] **Get one endpoint** — reopen a specific draft for editing
- [ ] **Update endpoint** — edit an existing draft; this is also where the completeness check needs to re-run, including checking the database for existing attached files (since files are attached via this save endpoint, tied to an already-existing `draft_id`)
- [ ] **Delete endpoint**
- [ ] **Submit service** (`draft_submit_service.py`) — converts a completed draft into a real `complaints` row (+ `walkin_complainants`, `shared_files`), following the strict fetch → insert → commit → delete-draft → cleanup-files order
- [ ] **Verification Request Draft** endpoints (separate from walk-in — simpler, no file attachments of its own)
- [ ] Swap local disk storage for AWS S3 once the team's AWS deployment is ready (isolated change, only affects `_save_file_to_disk`)
- [ ] Delete the temporary test scripts (`seed_test_officer.py`, `mint_test_token.py`) once the real FDA/LEA login endpoint exists
