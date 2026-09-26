import io

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle
from reportlab.lib.units import inch

from app.desktop.schemas.verification.verification import (
    FdaVerificationCompletedDetailResponse,
    FdaVerificationRejectedDetailResponse,
)


def _base_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="EVerifyTitle", fontSize=16, leading=20, spaceAfter=4,
        textColor=colors.HexColor("#14532d"),
    ))
    styles.add(ParagraphStyle(
        name="EVerifySubtitle", fontSize=10, textColor=colors.HexColor("#666666"), spaceAfter=14,
    ))
    styles.add(ParagraphStyle(
        name="EVerifySectionHeader", fontSize=12, textColor=colors.HexColor("#14532d"),
        spaceBefore=16, spaceAfter=6,
    ))
    return styles


def _info_table(rows):
    table = Table(rows, colWidths=[1.9 * inch, 3.9 * inch])
    table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#666666")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e5e5")),
    ]))
    return table


def _fmt_dt(dt):
    return dt.strftime("%m/%d/%Y, %I:%M %p") if dt else "N/A"


def build_completed_pdf(data: FdaVerificationCompletedDetailResponse) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter, topMargin=0.6 * inch, bottomMargin=0.6 * inch,
        title=f"Verification Record - {data.case_reference}",
        author="Everify",
        subject="FDA Verification Record",
        creator="Everify",
    )
    styles = _base_styles()
    story = [
        Paragraph("Everify &mdash; Verification Record", styles["EVerifyTitle"]),
        Paragraph(
            f"{data.case_reference} &bull; Completed on {_fmt_dt(data.responded_at)}",
            styles["EVerifySubtitle"],
        ),
        _info_table([
            ["Case ID", data.case_reference],
            ["Product Name", data.product_name],
            ["Manufacturer", data.manufacturer or "N/A"],
            ["Product Category", data.product_category or "N/A"],
            ["Date Received", _fmt_dt(data.requested_at)],
            ["Requesting LEA Officer", data.requested_by_name or "N/A"],
        ]),
        Paragraph("Official FDA Verification Result", styles["EVerifySectionHeader"]),
    ]

    result_label = "Registered" if data.verification_result == "registered" else "Unregistered"
    rows = [["Verification Determination", result_label]]
    if data.verification_result == "registered":
        rows += [
            ["FDA CPR Number", data.cpr_number or "N/A"],
            ["CPR Expiry Date", data.cpr_expiry.strftime("%Y-%m-%d") if data.cpr_expiry else "N/A"],
        ]
    else:
        rows += [["Unregistered Reason", data.unregistered_reason or "N/A"]]
    rows += [
        ["Verified By", data.verified_by_name or "N/A"],
        ["Official FDA Remarks", data.response_notes or "\u2014"],
    ]
    story.append(_info_table(rows))

    doc.build(story)
    return buffer.getvalue()


def build_rejected_pdf(data: FdaVerificationRejectedDetailResponse) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter, topMargin=0.6 * inch, bottomMargin=0.6 * inch,
        title=f"Rejected Record - {data.case_reference}",
        author="Everify",
        subject="FDA Rejected Verification Request",
        creator="Everify",
    )
    styles = _base_styles()
    story = [
        Paragraph("Everify &mdash; Rejected Request Record", styles["EVerifyTitle"]),
        Paragraph(
            f"{data.case_reference} &bull; Rejected on {_fmt_dt(data.responded_at)}",
            styles["EVerifySubtitle"],
        ),
        _info_table([
            ["Case ID", data.case_reference],
            ["Product Name", data.product_name],
            ["Manufacturer", data.manufacturer or "N/A"],
            ["Product Category", data.product_category or "N/A"],
            ["Date Received", _fmt_dt(data.requested_at)],
            ["Requesting LEA Officer", data.requested_by_name or "N/A"],
        ]),
        Paragraph("Rejection Details", styles["EVerifySectionHeader"]),
        _info_table([
            ["Rejected By", data.rejected_by_name or "N/A"],
            ["Date Rejected", _fmt_dt(data.responded_at)],
            ["Rejection Rationale (Sent to LEA)", data.rejection_reason],
        ]),
    ]

    doc.build(story)
    return buffer.getvalue()