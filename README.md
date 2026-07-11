# Northstar HR — Workforce Console

A small, self-contained HRMS demo: dashboard, employee roster, daily attendance, and leave requests. No build step, no server, no external dependencies beyond Google Fonts.

## Run it

1. Copy this whole `project-demo` folder to `D:\Agent_labs\project-demo` on your machine.
2. Open `index.html` in any browser (double-click it, or right-click → Open with → your browser).

That's it — it runs entirely client-side.

## What's inside

```
project-demo/
├── index.html      # page structure (sidebar nav + 4 views)
├── css/style.css   # design system (colors, type, layout)
├── js/app.js        # state, rendering, and all interactions
└── README.md
```

## Features

- **Dashboard** — headcount, today's attendance ring, pending leave count, department pulse, and a recent-activity feed.
- **Employees** — search, filter by department, add or remove employees.
- **Attendance** — change today's status per employee (present / late / absent / leave); dashboard updates instantly.
- **Leave** — submit new requests and approve/reject pending ones.

## Data

Everything is stored in the browser's `localStorage` (key `northstar_hrms_v1`), seeded with 10 sample employees on first load. Clearing your browser storage for the page resets it back to the sample data.

## Extending it

This is intentionally framework-free so it's easy to read end-to-end. Natural next steps if you want to grow it:
- Swap `localStorage` for a real backend/API.
- Add authentication and role-based views (HR admin vs. employee self-service).
- Add payroll, onboarding checklists, or performance review modules as new views in the sidebar.
