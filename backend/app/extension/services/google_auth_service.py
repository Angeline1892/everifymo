import requests
from fastapi import HTTPException

GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
GOOGLE_TOKENINFO_URL = "https://www.googleapis.com/oauth2/v3/tokeninfo"
OAUTH_CLIENT_ID = "1094392645082-414ug60ltdckhnnvdbkovnauo3f3srnf.apps.googleusercontent.com"

def verify_google_token(access_token: str) -> dict:
    tokeninfo_resp = requests.get(
        GOOGLE_TOKENINFO_URL,
        params={"access_token": access_token}
    )

    if tokeninfo_resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    tokeninfo = tokeninfo_resp.json()
    if tokeninfo.get("aud") != OAUTH_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Token not issued for this application")


    response = requests.get(
        GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"}
    )

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    userinfo = response.json()
    if not userinfo.get("email_verified"):
        raise HTTPException(status_code=401, detail="Google email not verified")

    return userinfo