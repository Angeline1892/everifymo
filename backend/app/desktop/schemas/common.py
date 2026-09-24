from typing import Annotated

from pydantic import StringConstraints

# required + free-text + no other validator already doing the job = swap it to NonEmptyStr 
# Use NonEmptyStr when both are true:
# The field is a plain str (not str | None) — meaning it's unconditionally required, not optional.
# A blank or whitespace-only value would be meaningless garbage for that field — not a legitimate real-world input. 

# A drop-in replacement for `str` on any field that must actually
# contain something — not just be a non-null string. Blocks "" AND
# whitespace-only "   ", not just missing/None.
#
# strip_whitespace=True also means the CLEANED value (leading/
# trailing spaces removed) is what actually gets saved — so
# "  hello  " becomes "hello" automatically, not just validated.
NonEmptyStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
