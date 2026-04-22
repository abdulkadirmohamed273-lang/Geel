# Database scope: expected system vs current Supabase projects

**Audience:** Client / third-party who manages Supabase or deployment  
**Purpose:** Document what the **Beergeel clinic application codebase** was designed to use, what we can **prove** from independent checks, and what **cannot** be assumed or rolled back without explicit backups and agreement.

---

## 1. What the application is built to use (canonical)

The React app talks to **one** Supabase project, configured only through environment variables:

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

See `src/config/supabase.js`. All high-level access goes through `src/utils/supabaseDB.js`, which calls PostgREST `supabase.from('<table>')` for the table names below.

### 1.1 Tables the running code reads/writes (core)

These table names appear in `src/` as live `getAll(...)`, `add`/`update`/`delete`, or `.from(...)` usage:

| Table | Role (summary) |
|--------|----------------|
| `users` | Staff login and roles |
| `patients` | Patient records |
| `visits` | Visit records |
| `consultations` | Doctor consultation records |
| `lab_requests` | Lab orders linked to visits |
| `prescriptions` | Prescriptions |
| `payments` | Income / payment rows |
| `expenses` | Expense rows |
| `queue` | Reception/doctor/pharmacy queue |
| `notices` | Notice board content |
| `patient_tickets` | Ticketing |
| `clinic_settings` | Clinic limits/settings (e.g. ticket limits) |
| `pharmacy_stock` | Pharmacy inventory |

### 1.2 Storage (not a SQL table)

- **Bucket:** `pharmacy-images` (used from `src/components/PharmacyStock.js` for image upload/public URL).

### 1.3 Tables referenced for security / RLS hardening

`FIX_RLS_SECURITY_ERRORS.sql` enables RLS on the core set above and additionally names:

- `appointments`
- `messages`

Those two are **not** wired through `getAll(...)` in the current `src/` tree in the same way as the core list; they may exist for future features or an older design. The **minimum** set required for day-to-day features matches section 1.1.

---

## 2. What we could verify independently (facts, not opinions)

### 2.1 Different Supabase project IDs appeared in the same overall effort

- **Browser / API errors** (reported during development) referenced the host  
  `https://wbcnyzzvynqgoaexehor.supabase.co` and returned **HTTP 402** with a message that the **project service was restricted** (billing/account status on Supabase’s side). When that happens, **no** reliable application-level read of `users`, `notices`, etc. is possible until Supabase restores access to that project.

- **Cursor MCP “beergeel” integration** (used for investigation) resolved the API URL to  
  `https://xwuirwgldlzrimebrgxv.supabase.co` — a **different** project reference (`project_ref` differs from `wbcnyzzvynqgoaexehor`).

So: **at least two distinct Supabase projects** were in play in the same timeframe. That alone does **not** prove malicious intent; it **does** prove that **environment and dashboard configuration must be aligned** or the app will talk to the wrong database or none at all.

### 2.2 Schema visible on the MCP-linked project (`xwuirwgldlzrimebrgxv`)

On the date of investigation, the `public` schema on that project contained **only** these tables:

- `audit_log`
- `clinic_periods`
- `expense_records`
- `income_records`
- `recurrent_templates`
- `settings`

**None** of the core clinic tables in section 1.1 (`users`, `patients`, `visits`, etc.) were present there.

**Implication:** The application **as written** cannot run against that database without **creating** the missing tables (and policies) or **pointing** `REACT_APP_SUPABASE_URL` to a project that already contains that schema and data.

**Naming mismatch:** The live project used `income_records` / `expense_records` / `settings`, while the app expects `payments` / `expenses` / `clinic_settings` (and other names). Those are **different contracts**; renaming or views must be deliberate, not accidental.

---

## 3. What likely “changed” from a product perspective

This is the **logical** conclusion from sections 1–2, not a forensic legal finding:

1. **Either** the deployment still targets the **original** clinic project (`wbcnyzzvynqgoaexehor`) but that project was **restricted** (402), **or** someone created/switched to **another** Supabase project without migrating schema and data.

2. **Either** the **MCP** connection was pointed at a **secondary** project (e.g. finance-only or experimental), **or** a new empty/minimal project was created alongside the original.

3. **If** the live `.env` / Netlify variables were updated to a **new** project that does not contain the full schema and a full **data migration** from the old project, then **staff logins, patients, visits, financial history, etc. will not match** what users expect — not because the React code “deleted” data, but because **the app reads whatever project the URL points to**.

---

## 4. What we cannot prove from the repository alone

- We **cannot** prove who clicked what in the Supabase dashboard (only account holders and Supabase audit/logs can establish that).

- We **cannot** prove that rows were **deleted** vs **never migrated** vs **never written** to the new project without comparing **backups**, **Point-in-Time Recovery**, or **exports** from the correct historical project.

- We **cannot** guarantee recovery of historical data if no backup or export exists.

---

## 5. What cannot be “fixed” in code alone after a bad switch

| Situation | What code cannot do |
|-----------|----------------------|
| Wrong `REACT_APP_SUPABASE_URL` | Cannot magically read data from another project; you must change env to the correct project or migrate data. |
| New empty project | Cannot recreate years of records without a **restore or import**. |
| 402 / restricted old project | Must be resolved in **Supabase billing/account** for that project; frontend changes do not remove 402. |
| Renamed tables only on DB (`income_records` vs `payments`) | Requires **DB views**, **renames**, or **code changes** — must be agreed and tested. |

---

## 6. Recommended agreement with the client (going forward)

1. **Single source of truth:** One Supabase **project_ref** for production; document it in writing (not only in one developer’s machine).

2. **Access:** Owner billing in good standing; no duplicate “trial” project for production without migration plan.

3. **Change control:** Any new Supabase project or URL change requires **schema parity + data migration + verification checklist** (login, patients, reports, finance).

4. **Backups:** Enable and test Supabase backups / exports on the **canonical** project.

5. **If dispute:** Compare **(a)** repository table list in section 1, **(b)** SQL in `FIX_RLS_SECURITY_ERRORS.sql`, and **(c)** live `public` tables in the Supabase SQL editor for the **URL actually used in production**.

---

## 7. Document history

- **Expected model:** Derived from `src/` and `FIX_RLS_SECURITY_ERRORS.sql` in this repository.
- **Observed MCP project:** `xwuirwgldlzrimebrgxv` — table list as of investigation date.
- **Observed browser errors:** `wbcnyzzvynqgoaexehor` — HTTP 402 restriction message.

This note is intended for **communication and scope clarity**. For legal or contractual disputes, preserve Supabase dashboard screenshots, invoices, and project access logs in addition to this document.
