# scripts/seed_regions.py

# The database session to actually talk to Postgres from sessions.py
from app.database.sessions import SessionLocal

# Import the model we are inserting rows into
from app.models.regions import Region


def seed_regions():
    db = SessionLocal() 

    regions = [
        Region(region_name="National Capital Region", region_code="NCR"),
        Region(region_name="Region 3 — Central Luzon", region_code="RO3"),
     
    ]

    db.add_all(regions)   
    db.commit()           
    db.close()           


if __name__ == "__main__":
    seed_regions()