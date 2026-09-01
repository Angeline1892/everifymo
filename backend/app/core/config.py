#from pydantic_settings import BaseSettings


#class Settings(BaseSettings):
#    DATABASE_URL: str
#    MIGRATIONS_DATABASE_URL: str
#    SECRET_KEY: str = ""

#    class Config:
#        env_file = ".env"


#settings = Settings()

#contents before i replaced it with the following code
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    MIGRATIONS_DATABASE_URL: str
    SECRET_KEY: str = "temporary_secret_key_for_local_dev"
    ALGORITHM: str = "HS256"

    # desktop otp
    MAIL_HOST: str = "smtp.gmail.com"
    MAIL_PORT: int = 587
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = "noreply@icmda.gov.ph"
    MAIL_FROM_NAME: str = "ICMDA"

    # add these fields to your existing Settings class
    OTP_LENGTH: int = 6
    OTP_EXPIRE_MINUTES: int = 5
    OTP_MAX_ATTEMPTS: int = 3
    RESET_TOKEN_EXPIRE_MINUTES: int = 15

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 180
    
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7  # add to settings if you want this configurable

    DEFAULT_EXTENSION_REGION_ID: str = "some-region-id"

    # extension otp
    MAIL_EXTENSION_USERNAME: str = ""
    MAIL_EXTENSION_PASSWORD: str = ""
    MAIL_EXTENSION_FROM_NAME: str = "ICMDA"
    OTP_EXTENSION_MIN_EXPIRE: int = 5
    MAIL_EXTENSION_FROM: str = "noreply@icmda.gov.ph"

    # uploaded screenshot for extension
    UPLOAD_DIR: str = "uploaded_complaints"
    
    class Config:
        env_file = ".env"

settings = Settings()