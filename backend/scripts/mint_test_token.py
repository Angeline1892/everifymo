# backend/scripts/mint_test_token.py
"""Generate a valid, real JWT for an already-seeded test account,
WITHOUT going through the actual login/OTP endpoints (which don't
exist yet for FDA/LEA accounts).

This uses the exact same create_access_token() function your
teammate's real login endpoint will eventually call — so the token
this prints is indistinguishable from one issued by a genuine login.
It'll pass get_current_user()'s decode_access_token() check exactly
the same way.
"""
from sqlalchemy import text  # add this import at the top

from app.database.sessions import SessionLocal
from app.core.security import create_desktop_access_token
from app.models.users import User


def main():
    db = SessionLocal()
    try:
        # Same reasoning as the seed script — this script has no
        # logged-in session, so RLS would normally hide every row
        # from this query. Bypass it just for this connection.
        db.execute(text("SET app.bypass_rls = 'true'"))
        
        email = input("Email of the account to mint a token for: ")

        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"No user found with email: {email}")
            return

        # get_current_user() reads payload.get("sub") and looks up
        # User.user_id with it — so "sub" (JWT's standard field name
        # for "subject," i.e. who this token is about) MUST be set
        # to this user's ID, or the real dependency won't recognize
        # it as valid. Cast to str() since UUID objects aren't
        # directly JSON-serializable, which jwt.encode requires.
        token = create_desktop_access_token({"sub": str(user.user_id)})

        print(f"\nUser: {user.email} ({user.role})")
        print(f"\nBearer token:\n{token}")
        print("\nPaste this into Swagger's Authorize button as:")
        print(f"Bearer {token}")

    finally:
        db.close()


if __name__ == "__main__":
    main()