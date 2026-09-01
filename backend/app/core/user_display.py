def format_officer_display_name(user) -> str | None:
    """
    Builds "Position FirstName LastName" (e.g. "PO3 R. Dela Cruz") from
    a User row. Any of the three parts can be null — officers can be
    invited but not fully set up yet — so only present parts are
    joined. Falls back to user.email if position/first_name/last_name
    are all missing, so the UI never shows a bare "N/A" when there's
    at least an email on file. Returns None only if there's no user
    row at all.
    """
    if not user:
        return None
    name_parts = [user.position, user.first_name, user.last_name]
    assembled = " ".join(part for part in name_parts if part is not None)
    if assembled.strip():
        return assembled
    return user.email