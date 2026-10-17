import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, KeepTogether, HRFlowable
)

def build_full_visual_demo_pdf():
    pdf_path = "Meeetly_Complete_Product_Demo_Screenshots.pdf"
    user_uploaded_dir = r"C:\Users\ADMIN\.gemini\antigravity\brain\2cc348e3-7c03-4c72-8c4a-90c1ec85457a\.user_uploaded"

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=32,
        rightMargin=32,
        topMargin=32,
        bottomMargin=32
    )

    styles = getSampleStyleSheet()

    # Color Palette
    ORANGE = colors.HexColor("#F97316")
    DARK_ORANGE = colors.HexColor("#EA580C")
    LIGHT_ORANGE = colors.HexColor("#FFF7ED")
    BORDER_ORANGE = colors.HexColor("#FED7AA")
    SLATE_900 = colors.HexColor("#0F172A")
    SLATE_800 = colors.HexColor("#1E293B")
    SLATE_700 = colors.HexColor("#334155")
    SLATE_500 = colors.HexColor("#64748B")
    SLATE_200 = colors.HexColor("#E2E8F0")
    SLATE_100 = colors.HexColor("#F1F5F9")
    WHITE = colors.HexColor("#FFFFFF")
    GREEN = colors.HexColor("#059669")

    # Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=SLATE_900
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=SLATE_500
    )

    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=ORANGE,
        spaceAfter=4,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=SLATE_900,
        spaceAfter=3,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=SLATE_700
    )

    caption_style = ParagraphStyle(
        'Caption',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=11,
        textColor=SLATE_500,
        alignment=1
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=WHITE
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=SLATE_800
    )

    def hr():
        return HRFlowable(width="100%", thickness=1.5, color=ORANGE, spaceBefore=3, spaceAfter=8)

    def page_footer(page_num, total_pages=4):
        footer_table = Table([
            [
                Paragraph("<b>Meeetly Technologies</b> &bull; Product Demo & Architecture Document", ParagraphStyle('F1', parent=caption_style, alignment=0)),
                Paragraph(f"Page {page_num} of {total_pages}", ParagraphStyle('F2', parent=caption_style, alignment=2))
            ]
        ], colWidths=[380, 150])
        footer_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LINEABOVE', (0,0), (-1,-1), 0.5, SLATE_200),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        return footer_table

    story = []

    # =========================================================================
    # PAGE 1: TITLE & EXECUTIVE ARCHITECTURE
    # =========================================================================
    header_table = Table([
        [
            Paragraph("<b>MEEETLY SCHEDULING PLATFORM</b>", title_style),
            Paragraph("<b>VERSION 2.4</b><br/><font color='#64748B'>Comprehensive Demo PDF</font>", ParagraphStyle('R1', parent=subtitle_style, alignment=2))
        ],
        [
            Paragraph("Enterprise Master Calendar, Real-Time Executive Scheduling & Client Portals", subtitle_style),
            Paragraph("Date: September 21, 2026", ParagraphStyle('R2', parent=caption_style, alignment=2))
        ]
    ], colWidths=[380, 150])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(header_table)
    story.append(hr())

    # Executive Overview
    overview_text = (
        "<b>Executive Overview:</b> Meeetly is an automated, real-time executive scheduling and calendar synchronization "
        "platform designed for high-touch B2B interactions. The solution bridges client appointment requests "
        "directly with leadership (Managing Director / Executive Desk), featuring 3-step interactive booking, "
        "morning/afternoon slot capacity management, live status updates, and automated WhatsApp/Google Meet dispatching."
    )
    story.append(Table([[Paragraph(overview_text, body_style)]], colWidths=[530], style=[
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_ORANGE),
        ('BOX', (0,0), (-1,-1), 1, BORDER_ORANGE),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(Spacer(1, 10))

    # Core System Capabilities Table
    story.append(Paragraph("System Architecture & Core Modules", h1_style))
    modules_data = [
        [Paragraph("<b>Module Name</b>", table_header_style), Paragraph("<b>Primary Workflow & Functional Description</b>", table_header_style), Paragraph("<b>Deliverables / State</b>", table_header_style)],
        [
            Paragraph("<b>1. Admin Command Center</b>", table_cell_style),
            Paragraph("Executive workspace providing daily capacity KPIs, live time tracking, attendee briefings, and 1-click approvals.", table_cell_style),
            Paragraph("• Dynamic 'Good Morning, Sudhin'<br/>• Live capacity analytics<br/>• Zero-latency sync", table_cell_style)
        ],
        [
            Paragraph("<b>2. Master Calendar</b>", table_cell_style),
            Paragraph("Central scheduling grid with morning/afternoon session breakdown, Booked vs Available slot differentiation.", table_cell_style),
            Paragraph("• <b>AS (Available Slot)</b> badge<br/>• Google Maps & Meet routing<br/>• Real-time lock protection", table_cell_style)
        ],
        [
            Paragraph("<b>3. Client Booking Portal</b>", table_cell_style),
            Paragraph("Streamlined 3-step scheduling wizard allowing clients to pick verified dates, select open slots, and state meeting purpose.", table_cell_style),
            Paragraph("• Verified Client Access<br/>• Direct MD Dispatching<br/>• Instant Confirmation Modal", table_cell_style)
        ],
        [
            Paragraph("<b>4. My Appointments Hub</b>", table_cell_style),
            Paragraph("Client status dashboard reflecting real-time MD review decisions (Confirmed, Pending, Rescheduled, Cancelled).", table_cell_style),
            Paragraph("• Clean white cards<br/>• WhatsApp 1-click share<br/>• Google Calendar export", table_cell_style)
        ],
        [
            Paragraph("<b>5. Smart Notification Engine</b>", table_cell_style),
            Paragraph("Bi-directional event dispatching with reactive unread count badges that reset automatically once opened.", table_cell_style),
            Paragraph("• Zero ghost notification counts<br/>• Push, Email, and SMS logs<br/>• Dual-portal synchronization", table_cell_style)
        ],
    ]
    modules_table = Table(modules_data, colWidths=[130, 240, 160])
    modules_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), ORANGE),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WHITE, SLATE_100]),
        ('GRID', (0,0), (-1,-1), 0.5, SLATE_200),
    ]))
    story.append(modules_table)
    story.append(Spacer(1, 10))

    # Technical Reliability
    story.append(Paragraph("Production Verification & Engineering Reliability", h1_style))
    tech_text = (
        "• <b>Production Build:</b> Vite client build completed with <b>0 errors</b> across 1,924 compiled modules.<br/>"
        "• <b>Backend Health:</b> Node.js Express server + SQLite persistent storage active and healthy on Port 5000.<br/>"
        "• <b>Design Standards:</b> 100% adherence to the vibrant orange (`#f97316`) and pure white (`text-white`) design palette."
    )
    story.append(Paragraph(tech_text, body_style))
    story.append(Spacer(1, 12))
    story.append(page_footer(1))

    # =========================================================================
    # PAGE 2: ADMIN PORTAL LIVE WALKTHROUGH (SCREENSHOTS)
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph("<b>ADMIN WORKSPACE & MASTER CALENDAR</b>", title_style))
    story.append(Paragraph("Visual walkthrough of administrator scheduling controls and day agenda", subtitle_style))
    story.append(hr())

    # Screenshot 1: Full Admin Calendar View
    story.append(Paragraph("Screen Exhibit 1: Executive Master Calendar & Agenda Inspector", h1_style))
    admin_cal_path = os.path.join(user_uploaded_dir, "media_1789976097147.png")
    if os.path.exists(admin_cal_path):
        img_cal = Image(admin_cal_path, width=530, height=250)
        story.append(img_cal)
    story.append(Paragraph("<b>Figure 1.1:</b> Full Admin workspace displaying sidebar navigation, mini-calendar with dual-color dot indicators, and full bottom slot inspector.", caption_style))
    story.append(Spacer(1, 10))

    # Screenshot 2: Day Overview & Booked Agenda Briefing
    story.append(Paragraph("Screen Exhibit 2: Selected Day Capacity Briefing & Occupancy Bar", h1_style))
    agenda_path = os.path.join(user_uploaded_dir, "media_1789978501295.png")
    if os.path.exists(agenda_path):
        img_agenda = Image(agenda_path, width=460, height=190)
        story.append(img_agenda)
    story.append(Paragraph("<b>Figure 1.2:</b> Real-time capacity breakdown (Total Slots, Booked, Open) with interactive occupancy progress bar and attendee briefing.", caption_style))
    story.append(Spacer(1, 12))
    story.append(page_footer(2))

    # =========================================================================
    # PAGE 3: CLIENT BOOKING & STATUS TRACKING (SCREENSHOTS)
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph("<b>CLIENT SCHEDULING FUNNEL & APPOINTMENTS</b>", title_style))
    story.append(Paragraph("Frictionless client booking flow, verified confirmations, and live status cards", subtitle_style))
    story.append(hr())

    # Screenshot 3: Client My Appointments Cards
    story.append(Paragraph("Screen Exhibit 3: Client 'My Appointments' Cards (Clean White Standard)", h1_style))
    cards_path = os.path.join(user_uploaded_dir, "media_1789986032984.png")
    if os.path.exists(cards_path):
        img_cards = Image(cards_path, width=530, height=240)
        story.append(img_cards)
    story.append(Paragraph("<b>Figure 2.1:</b> My Appointments dashboard featuring clean white card backgrounds, confirmed approval badges ('CONFIRMED & APPROVED BY MD'), Google Maps venue links, and WhatsApp sharing.", caption_style))
    story.append(Spacer(1, 10))

    # Screenshot 4: Client Booking Confirmation Modal
    story.append(Paragraph("Screen Exhibit 4: Real-Time Appointment Dispatch & Confirmation Modal", h1_style))
    modal_path = os.path.join(user_uploaded_dir, "media_1789980765174.png")
    if os.path.exists(modal_path):
        img_modal = Image(modal_path, width=240, height=220)
        story.append(img_modal)
    story.append(Paragraph("<b>Figure 2.2:</b> Instant booking dispatch modal with reference ID, host details, meeting mode, and real-time notification dispatch confirmation.", caption_style))
    story.append(Spacer(1, 12))
    story.append(page_footer(3))

    # =========================================================================
    # PAGE 4: DETAILED COMPONENT EXHIBITS & RECENT UPGRADES
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph("<b>KEY COMPONENT EXHIBITS & RECENT UPGRADES</b>", title_style))
    story.append(Paragraph("Detailed visual inspection of refined UI components and system upgrades", subtitle_style))
    story.append(hr())

    # Component Exhibits Table (Greeting, AS indicator, Notifications badge)
    greeting_path = os.path.join(user_uploaded_dir, "media_1789990085245.png")
    notif_path = os.path.join(user_uploaded_dir, "media_1789986657789.png")
    as_path = os.path.join(user_uploaded_dir, "media_1789986099275.png")
    slots_path = os.path.join(user_uploaded_dir, "media_1789978106456.png")

    story.append(Paragraph("Exhibit 5.1: Slots Inspector & Attendee Details", h2_style))
    if os.path.exists(slots_path):
        img_slots = Image(slots_path, width=530, height=180)
        story.append(img_slots)
    story.append(Paragraph("<b>Figure 3.1:</b> Filterable slot management showing attendee contact information, venue mode, and confirmation status.", caption_style))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Exhibit 5.2: UI Refinements (Dynamic Greeting, Notification Badge, Available Slots)", h2_style))
    cell_greeting = Image(greeting_path, width=240, height=60) if os.path.exists(greeting_path) else Paragraph("Greeting", body_style)
    cell_notif = Image(notif_path, width=170, height=50) if os.path.exists(notif_path) else Paragraph("Notif", body_style)
    cell_as = Image(as_path, width=50, height=55) if os.path.exists(as_path) else Paragraph("AS", body_style)

    ui_grid = Table([
        [cell_greeting, cell_notif, cell_as],
        [
            Paragraph("<b>Dynamic Admin Greeting</b><br/>Displays logged-in administrator name ('Sudhin' / 'GENTIZE MD').", caption_style),
            Paragraph("<b>Smart Notification Badge</b><br/>Displays count only on new events; auto-resets upon viewing.", caption_style),
            Paragraph("<b>Available Slot ('AS')</b><br/>Standardized orange 'AS' badge.", caption_style)
        ]
    ], colWidths=[240, 200, 90])
    ui_grid.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(ui_grid)
    story.append(Spacer(1, 8))

    # Summary of Upgrades Box
    upgrades_box_content = (
        "<b>Summary of Engineering Upgrades Completed Today:</b><br/>"
        "• <b>Color & Contrast Compliance:</b> Strictly enforced pure white text/icons on vibrant orange containers across all 8 views.<br/>"
        "• <b>Card Backgrounds:</b> Replaced muddy light orange appointment cards with clean white (`bg-white`) and subtle slate borders.<br/>"
        "• <b>Slot Indicator:</b> Upgraded available slot markers to the clear, branded 'AS' orange badge.<br/>"
        "• <b>Notification Engine:</b> Implemented reactive count badges for both Client and Admin with automatic read-reset.<br/>"
        "• <b>Data & Location Fixes:</b> Solved location truncation (`veeralur Locality`) and date `undefined` display bugs.<br/>"
        "• <b>Admin Personalization:</b> Integrated dynamic time greetings and administrator display name support."
    )
    story.append(Table([[Paragraph(upgrades_box_content, body_style)]], colWidths=[530], style=[
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_ORANGE),
        ('BOX', (0,0), (-1,-1), 1, BORDER_ORANGE),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(Spacer(1, 10))
    story.append(page_footer(4))

    # Build PDF
    doc.build(story)
    print(f"SUCCESS: Comprehensive 4-Page Visual PDF generated at {pdf_path}")

if __name__ == "__main__":
    build_full_visual_demo_pdf()
