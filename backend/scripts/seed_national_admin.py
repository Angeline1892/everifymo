"""Seed script: create a national admin account for login testing or deployment.

Run this once to create a national admin you can log in with via
POST /auth/national-admin/login. You'll be prompted for the name, email, and
password at runtime — nothing is hardcoded, so nothing sensitive
ends up committed to Git.
"""
from getpass import getpass

from app.database.sessions import SessionLocal
from app.core.security import hash_password
from app.core.constants import Role, UserStatus
from app.models.users import User


def main():
    first_name = input("National admin first name: ").strip()
    last_name = input("National admin last name: ").strip()
    email = input("National admin email: ").strip()
    password = getpass("National admin password (hidden): ")
    password_confirm = getpass("Confirm password (hidden): ")

    if not first_name or not last_name:
        print("First and last name are required. Aborting.")
        return

    if password != password_confirm:
        print("Passwords do not match. Aborting.")
        return

    if len(password) < 8:
        print("Password must be at least 8 characters. Aborting.")
        return

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"National admin already exists: {existing.email}")
            return

        user = User(
            first_name=first_name,
            last_name=last_name,
            email=email,
            password_hash=hash_password(password),
            role=Role.NATIONAL_ADMIN,
            status=UserStatus.ACTIVE,
            is_active=True,
            is_locked=False,
            force_password_change=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        print(f"Created national admin: {user.first_name} {user.last_name} ({user.email})")
        print("You can now log in with these credentials.")

    finally:
        db.close()


if __name__ == "__main__":
    main()