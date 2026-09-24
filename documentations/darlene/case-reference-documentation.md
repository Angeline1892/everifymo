# Case Reference Generation — Documentation

**Covers:** the `case_reference_counters` table and the `generate_case_reference()` helper function.
**Purpose:** automatically produces the officer-facing case number (e.g. `ICM-NCR-2026-00001`) every time a new complaint is created — without ever letting two complaints accidentally get the same number.

---

## 1. What Problem This Solves (Plain Explanation)

Every real complaint needs a unique, human-readable ID — the `case_reference` column on `complaints`. This isn't just any random string; it follows a specific pattern:

```
ICM-{region_code}-{year}-{5-digit number}
```

Example: `ICM-NCR-2026-00001`

The tricky part isn't building that string — it's making sure the **number part never repeats**, even if:
- Two different officers submit a complaint at the exact same moment.
- The year changes (the count should reset back to `00001` for the new year).
- The region changes (each region counts independently — Region NCR and Region RO3 both have their own `00001, 00002, 00003...`, completely separate from each other).

This required both a small new database table (to remember "how far did we get") and a small Python function (to safely read and update that number).

---

## 2. The `case_reference_counters` Table

**Not backed by a SQLAlchemy model file** — this table was created directly through a hand-written Alembic migration (`op.execute("CREATE TABLE ...")`), not through the usual model → migration flow. It's queried using plain SQL (`db.execute(text("..."))`) rather than SQLAlchemy's `db.query(SomeModel)` pattern, so a model class was never actually needed. This was a deliberate choice — not every table in the system needs a full ORM model, only the ones you plan to query using SQLAlchemy's Python-object style.

### Structure

```sql
CREATE TABLE case_reference_counters (
    region_id UUID NOT NULL REFERENCES regions(region_id),
    year INTEGER NOT NULL,
    last_number INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (region_id, year)
);
```

- **`region_id`** — which region this row's counter belongs to.
- **`year`** — which calendar year this row's counter is for.
- **`last_number`** — the most recent number given out so far, for this specific region + year combination.
- **`PRIMARY KEY (region_id, year)`** — this is what actually makes region-independence work. A "composite primary key" means the *combination* of both columns together must be unique, not each column separately. So there can be one row for `(NCR, 2026)` and a completely separate row for `(RO3, 2026)` — they don't conflict, because together they're different combinations.

### How Rows Get Created

There's no seeding step needed — rows are created **automatically, the first time they're needed**. If Region NCR has never logged a case in 2026 before, the very first attempt creates a fresh row starting at `1`. This is handled inside the helper function below, not manually by anyone.

---

## 3. The Helper Function: `generate_case_reference()`

**Location:** `app/core/case_reference.py`

### What It Does, In Plain Terms

Give it a database session and a region's ID, and it hands back a single, ready-to-use string like `"ICM-NCR-2026-00001"` — while safely making sure nobody else could have received that exact same number at the same time.

### The Code, Explained Piece by Piece

```python
def generate_case_reference(db: Session, region_id: UUID) -> str:
```
Takes two inputs: the active database session, and which region this case belongs to. Returns a plain string.

```python
    current_year = datetime.now(timezone.utc).year
```
Figures out the current year, right now, in real time. This is what makes the counter automatically "roll over" — nobody has to manually tell it "it's 2027 now," it just checks the real clock every time it runs.

```python
    region_row = db.execute(
        text("SELECT region_code FROM regions WHERE region_id = :region_id"),
        {"region_id": region_id},
    ).first()
```
Looks up the region's short code (like `"NCR"`) — needed because `region_id` by itself is just a UUID, not something readable a human would ever want printed on an official case number.

`:region_id` inside the SQL string is a **placeholder** — instead of directly gluing the actual UUID into the SQL text (which would be a security risk, called SQL injection), we hand the real value separately, in the second argument (`{"region_id": region_id}`), and let the database driver safely substitute it in. This is the standard, safe way to include variable values in raw SQL.

```python
    if region_row is None:
        raise ValueError(f"No region found for region_id: {region_id}")
```
A safety check — if somehow an invalid `region_id` got passed in (which shouldn't normally happen, since it always comes from a real logged-in officer's own region), this stops immediately with a clear error message, rather than silently producing a broken case number.

```python
    row = db.execute(
        text(
            "SELECT last_number FROM case_reference_counters "
            "WHERE region_id = :region_id AND year = :year FOR UPDATE"
        ),
        {"region_id": region_id, "year": current_year},
    ).first()
```

This is the most important line in the whole function. `FOR UPDATE` is a Postgres instruction meaning: **"lock this specific row so nobody else can read or change it until my current transaction finishes."**

**Why this matters, with a concrete example:** imagine two officers, in the same region, both click submit at the exact same split second. Without `FOR UPDATE`, both could read `last_number = 5` at the same instant, both calculate "the next number is 6," and both save `6` — resulting in two different complaints with the exact same case number, which should be impossible (`case_reference` has a `UNIQUE` constraint, so one of them would actually crash with an error).

With `FOR UPDATE`, whichever officer's request reaches this line *first* locks the row. The second officer's request has to *wait* — just a tiny fraction of a second — until the first one finishes and releases the lock. Only then does the second one get to read the row, and by then it correctly sees the updated `last_number = 6`, so it correctly calculates `7`. No collision, ever.

```python
    if row is None:
        db.execute(
            text(
                "INSERT INTO case_reference_counters (region_id, year, last_number) "
                "VALUES (:region_id, :year, 1)"
            ),
            {"region_id": region_id, "year": current_year},
        )
        next_number = 1
```
If no row exists yet for this region+year combination (meaning this is the very first case for this region this year), create a fresh row starting at `1`.

```python
    else:
        next_number = row.last_number + 1
        db.execute(
            text(
                "UPDATE case_reference_counters SET last_number = :next "
                "WHERE region_id = :region_id AND year = :year"
            ),
            {"next": next_number, "region_id": region_id, "year": current_year},
        )
```
Otherwise, take whatever number was last used, add 1, and save that new number back.

```python
    return f"ICM-{region_code}-{current_year}-{str(next_number).zfill(5)}"
```
Builds the final string. `.zfill(5)` pads the number with leading zeros until it's 5 digits long — so `7` becomes `"00007"`, but `12345` stays exactly as-is (never truncated, just padded when it's shorter than 5 digits).

### Important: This Function Does NOT Commit

Notice there's no `db.commit()` anywhere inside this function. That's deliberate — this function is always meant to be called from *inside* a larger operation (like the draft submit service), which controls its own commit timing. If `generate_case_reference()` committed on its own, it would break the "all-or-nothing" guarantee of the bigger operation it's part of — e.g., if the case number got permanently saved, but the complaint itself then failed to insert for some unrelated reason, you'd be left with a "wasted" case number that was never actually used by any real complaint. Letting the *caller* control the commit keeps everything — the counter update AND the complaint insert — succeeding or failing together, as one unit.

---

## 4. Testing Notes

Tested directly via a throwaway script (`tests/test_case_reference.py`, later deleted once confirmed working) that called the function repeatedly against two different real regions. Confirmed:
- Each region produces its own independent sequence, starting from `00001`.
- Region codes and the current year both appear correctly in the generated string.
- Numbers persist across separate script runs (the counter is stored permanently in the database, not reset each time the app restarts) — meaning the *next* real case created will continue from wherever testing left off, not restart from `00001`.

---

## 5. Why No Model File Exists For This Table

This was a deliberate, discussed decision — not an oversight. A SQLAlchemy model is only useful when you want to interact with a table using Python objects and `db.query(...)`. Since `generate_case_reference()` only ever uses raw `text()` SQL statements, it never needed a model class to function. If a model were ever added later purely for consistency with the rest of the codebase, it would **not** require a new migration — the table already exists; the model would just be a Python-side convenience layer on top of it.
