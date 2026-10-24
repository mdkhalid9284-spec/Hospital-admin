# HospitalCare — UI / UX Design System & Style Guide

## 1. Design Philosophy
HospitalCare uses a clean, accessible, modern SaaS healthcare design language. The design avoids playful or distracting ornamentation in favor of crisp typography, calm medical blues, clean cards, and strong visual hierarchy.

## 2. Color Palette
- **Primary Brand Blue:** `#0284c7` (Sky-600) / `#0369a1` (Sky-700)
- **Primary Dark Blue:** `#0f172a` (Slate-900)
- **Clinical Cyan Accent:** `#06b6d4` (Cyan-500)
- **Background Light:** `#f8fafc` (Slate-50)
- **Surface Cards:** `#ffffff` (White) with subtle border `#e2e8f0` (Slate-200)
- **Status Success (Available / Confirmed / Paid):** `#10b981` (Emerald-500)
- **Status Warning (Pending / Reserved / Partial):** `#f59e0b` (Amber-500)
- **Status Danger (Occupied / Cancelled / Rejected):** `#ef4444` (Red-500)
- **Text Primary:** `#0f172a` (Slate-900)
- **Text Secondary:** `#64748b` (Slate-500)

## 3. Typography Hierarchy
- **Font Family:** Inter, system-ui, -apple-system, sans-serif.
- **H1 (Page Titles):** 28px / Semi-bold (700)
- **H2 (Section Headers):** 20px / Semi-bold (600)
- **H3 (Card Titles):** 16px / Medium (600)
- **Body Text:** 14px / Regular (400) / Line height 1.5
- **Small Text / Badges / Captions:** 12px / Medium (500)

## 4. Component Layout Standards
- **Split Screen Login:**
  - Left panel: HospitalCare logo, platform summary, trust metrics, medical hero banner.
  - Right panel: Role selector tabs (Admin, Doctor, Patient, Billing), credential input form, quick demo-fill triggers for rapid evaluator testing.
- **Top Navigation & Sidebar:**
  - Collapsible responsive sidebar with clear role-filtered navigation items.
  - Top bar featuring user badge, active role indicator, notifications drawer, and secure logout.
- **Bed Board Matrix:**
  - Interactive grid displaying wards and rooms with real-time color-coded bed chips (`Available`, `Occupied`, `Reserved`).
- **Clinical Prescriptions & Notes:**
  - Clean structured tables with dynamic item rows, dosage calculator hints, and PDF preview/download actions.
