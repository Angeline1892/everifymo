import uuid

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings


engine = create_engine(settings.DATABASE_URL)


@event.listens_for(engine, "connect")
def _register_sqlite_uuid_functions(dbapi_connection, connection_record):
    if settings.DATABASE_URL.startswith("sqlite"):
        dbapi_connection.create_function("gen_random_uuid", 0, lambda: str(uuid.uuid4()))
        dbapi_connection.create_function("uuid_generate_v4", 0, lambda: str(uuid.uuid4()))


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _is_postgres() -> bool:
    return engine.dialect.name == "postgresql"


@event.listens_for(engine, "checkout")
def reset_rls_context_on_checkout(dbapi_conn, connection_record, connection_proxy):
    if not _is_postgres():
        return
    cursor = dbapi_conn.cursor()
    cursor.execute("SET app.bypass_rls = 'false'")
    cursor.execute("SET app.current_region_id = ''")
    cursor.close()


@event.listens_for(SessionLocal, "after_begin")
def reapply_rls_context(session, transaction, connection):
    if not _is_postgres():
        return
    bypass = session.info.get("bypass_rls", False)
    region_id = session.info.get("region_id", "")
    connection.execute(text("SET app.bypass_rls = :val"), {"val": "true" if bypass else "false"})
    connection.execute(text("SET app.current_region_id = :region"), {"region": region_id})


def set_bypass_rls(db, value: bool = True):
    db.info["bypass_rls"] = value
    if _is_postgres():
        db.execute(text("SET app.bypass_rls = :val"), {"val": "true" if value else "false"})


def set_region_context(db, region_id: str | None):
    region_id = region_id or ""
    db.info["region_id"] = region_id
    if _is_postgres():
        db.execute(text("SET app.current_region_id = :region"), {"region": region_id})