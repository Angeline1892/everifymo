# scripts/seed_test_officer.py
"""Seed script: create a test FDA or LEA officer account for endpoint
testing, bypassing the invite/registration flow entirely (that flow
is for real production accounts — this is just for local dev testing
until the real login backend exists).

Run this once per test account you want. Nothing is hardcoded — you
type the values in when you run it, so no real credentials ever end
up committed to Git.
"""
from getpass import getpass
from sqlalchemy import text

from app.database.sessions import SessionLocal
from app.core.security import hash_password
from app.core.constants import Role, UserStatus
from app.models.users import User
from app.models.regions import Region


def main():
    db = SessionLocal()
    try:
        # Same as your registration endpoints — this script isn't
        # running as any logged-in user, so RLS would normally block
        # it. This tells Postgres to allow the insert anyway, just
        # for this one script's connection.
        db.execute(text("SET app.bypass_rls = 'true'"))
    
        # --- Basic account info, typed in at runtime ---
        email = input("Officer email: ")
        password = getpass("Officer password (hidden): ")

        # Ask which role this test account should have. We only
        # accept "fda" or "lea" here (not superadmin — that already
        # has its own seed script) to keep this script's purpose
        # narrow and obvious.
        role_input = input("Role (fda/lea): ").strip().lower()
        if role_input == "fda":
            role = Role.FDA_PERSONNEL
        elif role_input == "lea":
            role = Role.LEA_PERSONNEL
        else:
            print("Invalid role — must be 'fda' or 'lea'.")
            return

        # Bail out early if this email is already taken, same
        # existence-check pattern as the superadmin seed script.
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"A user with this email already exists: {existing.email}")
            return

        # region_id is technically nullable on the model, but an
        # FDA/LEA account with no region breaks your RLS policy
        # (which scopes by region_id match) — so we require one here
        # even though the database itself wouldn't stop you.
        region_code = input("Region code (e.g. NCR): ").strip()
        region = db.query(Region).filter(Region.region_code == region_code).first()
        if not region:
            print(f"No region found with code '{region_code}'. "
                  f"Check your regions table for valid codes.")
            return

        user = User(
            email=email,
            password_hash=hash_password(password),
            role=role,
            region_id=region.region_id,

            # Skip the invited -> pending_approval pipeline entirely —
            # this account is ready to use immediately for testing.
            status=UserStatus.ACTIVE,
            is_active=True,
            is_locked=False,

            # False here means "don't force a password reset on first
            # login" — real invited accounts would have this True, but
            # we want to log in immediately without extra steps.
            force_password_change=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        print(f"Created {role} account: {user.email}")
        print(f"user_id: {user.user_id}")
        print(f"region: {region.region_name} ({region.region_code})")

    finally:
        db.close()


if __name__ == "__main__":
    main()