# scripts/seed_audit_logs_fda.py
"""Seed script: create sample FDA audit log entries for testing.

Run this once you have at least one FDA personnel user already
created (via seed_test_officer.py), so the seeded logs can reference
a real user_id. You'll be prompted for that user's email so the
right user_id gets attached to the seeded rows.
"""
import uuid
from datetime import datetime, timedelta, timezone

from app.database.sessions import SessionLocal
from app.core.constants import Role
from app.models.users import User
from app.models.audit_logs import AuditLog
from sqlalchemy import text


def main():
    fda_email = input("FDA personnel email (used for the seeded rows' user_id): ")

    db = SessionLocal()
    try:
        db.execute(text("SET app.bypass_rls = 'true'"))
        fda_user = db.query(User).filter(User.email == fda_email).first()
        if not fda_user:
            print(f"No user found with email: {fda_email}. Aborting.")
            return

        now = datetime.now(timezone.utc)

        rows = [
            AuditLog(
                user_id=fda_user.user_id,
                user_role=Role.FDA_PERSONNEL,
                region_code="NCR",
                action="CREATE_REGISTERED_PRODUCT",
                target_table="registered_products",
                target_id=uuid.uuid4(),
                target_reference="BioGlow Serum",
                old_value=None,
                new_value={"product_name": "BioGlow Serum", "registration_no": "FR-400000123", "status": "Active"},
                ip_address="192.168.1.105",
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                performed_at=now - timedelta(days=3, hours=2),
            ),
            AuditLog(
                user_id=fda_user.user_id,
                user_role=Role.FDA_PERSONNEL,
                region_code="NCR",
                action="UPDATE_REGISTERED_PRODUCT",
                target_table="registered_products",
                target_id=uuid.uuid4(),
                target_reference="BioGlow Serum",
                old_value={"status": "Under Review"},
                new_value={"status": "Registered"},
                ip_address="192.168.1.105",
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                performed_at=now - timedelta(days=2, hours=5),
            ),
            AuditLog(
                user_id=fda_user.user_id,
                user_role=Role.FDA_PERSONNEL,
                region_code="RO3",
                action="UPDATE_VERIFICATION_STATUS",
                target_table="verification_requests",
                target_id=uuid.uuid4(),
                target_reference="VR-2026-00045",
                old_value={"status": "Pending Verification"},
                new_value={"status": "Confirmed Registered", "cpr_number": "CPR-11223"},
                ip_address="192.168.4.12",
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
                performed_at=now - timedelta(days=1, hours=3),
            ),
            AuditLog(
                user_id=fda_user.user_id,
                user_role=Role.FDA_PERSONNEL,
                region_code="NCR",
                action="LOGIN",
                target_table="user_sessions",
                target_id=None,
                target_reference=None,
                old_value=None,
                new_value=None,
                ip_address="192.168.1.105",
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                performed_at=now - timedelta(hours=6),
            ),
            AuditLog(
                user_id=None,
                user_role="system",
                region_code=None,
                action="UPDATE_VERIFICATION_STATUS",
                target_table="verification_requests",
                target_id=uuid.uuid4(),
                target_reference="VR-2026-00041",
                old_value={"status": "Pending Verification"},
                new_value={"status": "Auto-Dismissed"},
                ip_address="127.0.0.1",
                user_agent=None,
                performed_at=now - timedelta(hours=10),
            ),
        ]

        db.add_all(rows)
        db.commit()

        print(f"Seeded {len(rows)} FDA audit log rows.")

    finally:
        db.close()


if __name__ == "__main__":
    main()