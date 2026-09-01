def format_file_size(size_bytes: int) -> str:
    """
    Converts a raw byte count into a human-readable string, using the
    largest unit that keeps the number reasonably sized — matches the
    style already used in the UI ("2.4 MB", "1.2 MB", "480 KB").
    """
    size = float(size_bytes)
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024:
            if unit == "B":
                return f"{int(size)} {unit}"
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} TB"