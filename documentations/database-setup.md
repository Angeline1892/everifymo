# Setup your PostgreSQL database (database/role setup)

STEPS
1. First go to this YT link and follow the video instructions on how to download and install PostgreSQL and pgAdmin 
link: https://youtu.be/rlnxQxJTFfM?si=1hxtO3hQNsEkKfJT

2. Once pgAdmin is installed: 
# Open pgAdmin → connect to your local Postgres server (probably localhost, port 5432)
# Click on Servers and type your password if needed
# Right-click Databases → Create → Database...
# Name it something like everify_db (or whatever you prefer — let me know if you want a different name)
# Leave Owner as default (postgres)
# Save

3. CREATE ROLE everify_app WITH LOGIN PASSWORD 'everi_app_fypw';
# Create the restricted app role
In pgAdmin's Query Tool, connected to your server (any database is fine for this part):
 # run: 
 CREATE ROLE everifymo_app WITH LOGIN PASSWORD 'PASSWORD'; ------ GUYS HINDI ITO ANG TOTOONG PASSWORD, BAWAL LANG ILAGAY DITO KAYA DIKO NILAGAY------

(Swap app_dev_pw for whatever password you want — just remember it for .env later.)

After running, message should be:
CREATE ROLE
Query returned successfully in 145 msec.

4. Grant that role access — run against everifymo_db
Switch the Query Tool's connection to everify_db specifically (not just the server), 
# then run: 
GRANT CONNECT ON DATABASE everify_db TO everify_app;
GRANT USAGE ON SCHEMA public TO everify_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO everify_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO everify_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES TO everify_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON SEQUENCES TO everify_app;

------------------
This means: even though postgres will own every table Alembic creates, everify_app automatically gets access to each new table going forward — no manual re-granting every migration.

After running, message should be: 
messages: 

ALTER DEFAULT PRIVILEGES
Query returned successfully in 188 msec.

✅ Database everify_db created
✅ Role everify_app created (non-superuser, login-only)
✅ everify_app granted CONNECT + USAGE + future-table access via default privileges
✅ postgres remains the owner/superuser for migrations