# Database Foundation — Code Reference

This file explains *why* each line in `config.py`, `base.py`, and `session.py`
exists. The actual `.py` files in the repo are kept clean, without inline
comments — read this file alongside them when you need the reasoning.

Covers: `app/core/config.py`, `app/database/base.py`, `app/database/session.py`

---

## `app/core/config.py`

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    MIGRATIONS_DATABASE_URL: str
    SECRET_KEY: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
```

| Line | Why it's there |
|---|---|
| `class Settings(BaseSettings)` | `pydantic_settings.BaseSettings` automatically reads matching variable names from `.env` and validates their types. This is the single source of truth for config — other files import `settings`, instead of calling `os.getenv()` everywhere. |
| `DATABASE_URL: str` | Used by `app/database/session.py`. Points to the **`everify_app`** role — the restricted role the live FastAPI app connects with. This is the role our Row-Level Security (RLS) policies will apply to. |
| `MIGRATIONS_DATABASE_URL: str` | Used only by `alembic/env.py`. Points to the **`postgres`** superuser role, which can freely create/alter tables. Never used inside `app/`. |
| `SECRET_KEY: str = ""` | Not used yet — reserved for JWT signing once authentication is built. Defaults to empty so the app doesn't crash on startup before auth work begins. |
| `env_file = ".env"` | Tells pydantic-settings which file to read. |
| `settings = Settings()` | The object every other file imports: `from app.core.config import settings`. |

**Key behavior:** if a required key is missing from `.env`, the app fails immediately on startup with a clear error, instead of failing later in a confusing way mid-request.

---

## `app/database/base.py`

```python
from sqlalchemy.orm import declarative_base

Base = declarative_base()
```

| Line | Why it's there |
|---|---|
| `Base = declarative_base()` | The shared parent class every table model will inherit from, e.g. `class Complaint(Base): ...` in `app/models/`. Alembic also imports this `Base` (see `alembic/env.py`) to compare Python model classes against what actually exists in the database, and generate migrations for the difference. |

This file does nothing visible on its own — it only becomes meaningful once real model classes exist in `app/models/`.

---

## `app/database/session.py`

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

| Line | Why it's there |
|---|---|
| `create_engine(settings.DATABASE_URL)` | The connection pool to Postgres. **Important:** uses `DATABASE_URL` (`everify_app`), **not** `MIGRATIONS_DATABASE_URL` (`postgres`). This is intentional — the live app must connect as the role RLS policies actually apply to. `postgres` bypasses RLS entirely and must only be used by Alembic. |
| `sessionmaker(autocommit=False, autoflush=False, bind=engine)` | Factory that creates new sessions. One session ≈ one unit of work (roughly, one request's worth of DB activity). `autocommit=False` means we control exactly when changes save. `autoflush=False` means pending changes aren't sent to the DB until we explicitly flush/commit. |
| `get_db()` | FastAPI dependency used in routes as `Depends(get_db)`. The `yield` pattern guarantees `db.close()` runs even if the route raises an exception — prevents connection leaks. |

**The one rule to never break in this file:** never swap `DATABASE_URL` for `MIGRATIONS_DATABASE_URL` here, even temporarily for debugging. Doing so would mean the live app connects as a superuser and silently bypasses every RLS policy without any error being thrown.

---

## Quick mental model

```
.env
 ├─ DATABASE_URL  ───────────► session.py  ───► live app queries (RLS applies)
 └─ MIGRATIONS_DATABASE_URL ─► alembic/env.py ► schema changes (RLS bypassed, on purpose)
```

Two roles, two jobs, never mixed.
