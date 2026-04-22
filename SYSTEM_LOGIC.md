# Beergeel Clinic System - System Logic Documentation

## System Overview

**Beergeel Obstetrics and Gynecology Clinic** is a comprehensive clinic management system built with React and Supabase. It manages patient visits, consultations, prescriptions, lab tests, payments, and staff workflows through a role-based access control system.

---

## Architecture

### Technology Stack
- **Frontend**: React.js
- **Backend/Database**: Supabase (PostgreSQL)
- **Authentication**: Role-based login system

### Database Structure

The system uses 12 main tables:

1. **users** - Staff members (reception, doctor, pharmacy, lab)
2. **patients** - Patient records
3. **visits** - Patient visit records with vital signs
4. **consultations** - Doctor consultations linked to visits
5. **lab_requests** - Laboratory test requests
6. **prescriptions** - Medication prescriptions
7. **payments** - Payment transactions
8. **expenses** - Clinic expenses
9. **notices** - Clinic notices/announcements
10. **appointments** - Patient appointments
11. **messages** - Internal messaging system
12. **queue** - Department queues (doctor, pharmacy, lab)

---

## User Roles & Permissions

### 1. **Reception Staff** (`reception`)
- Register new patients
- Create patient visits
- Record vital signs (BP, pulse, temperature, weight)
- Add patients to doctor queue
- Record payments
- View patient list
- Manage accounts
- View financial reports
- Edit clinic notices

### 2. **Doctor** (`doctor`)
- View patient queue
- Conduct consultations
- Add diagnosis and notes
- Request lab tests
- Create prescriptions
- View patient history
- View financial information

### 3. **Pharmacy Staff** (`pharmacy`)
- View pharmacy queue
- Dispense medications
- Update prescription status

### 4. **Lab Technician** (`lab`)
- View lab queue
- Process lab requests
- Enter lab test results

### 5. **Patient** (`patient`)
- Login with mobile number and password
- View personal visit history
- View prescriptions
- View lab test results
- Download medical reports

---

## Core Workflow Logic

### 1. **Patient Registration Flow**

```
Reception Staff → Register Patient
├── Enter: Name, Age, Sex, Mobile, Password
├── System creates patient record
└── Patient can now login with mobile number
```

**Database Action**: `INSERT INTO patients`

---

### 2. **Visit Creation Flow**

```
Reception Staff → Create Visit
├── Search/Select Patient
├── Enter Vital Signs:
│   ├── Blood Pressure (BP)
│   ├── Pulse Rate (PR)
│   ├── Temperature
│   └── Weight (auto-calculates BMI)
├── Option: Add to Doctor Queue
└── Save Visit
```

**Database Actions**:
- `INSERT INTO visits` (with patient_id, vitals)
- `INSERT INTO queue` (if "Add to Doctor Queue" is checked)

**Key Logic**:
- Visit is created with vital signs
- If "Add to Doctor Queue" is checked, patient automatically enters doctor queue
- Visit can be linked to payment immediately

---

### 3. **Doctor Consultation Flow**

```
Doctor → View Queue → Select Patient
├── View Patient Info & Vitals
├── Conduct Consultation:
│   ├── Enter Diagnosis
│   ├── Add Notes
│   ├── Request Lab Tests (optional)
│   └── Create Prescription (optional)
├── If Lab Requested:
│   ├── Patient added to Lab Queue
│   └── Consultation status: "pending" (waiting for results)
├── If Lab Results Available:
│   ├── Doctor can check results
│   └── Complete consultation
└── If Prescription Created:
    └── Patient added to Pharmacy Queue
```

**Database Actions**:
- `INSERT INTO consultations` (diagnosis, notes, doctor_id)
- `INSERT INTO lab_requests` (if lab needed)
- `INSERT INTO queue` (department: 'lab', status: 'pending')
- `INSERT INTO prescriptions` (if medication needed)
- `INSERT INTO queue` (department: 'pharmacy', status: 'pending')

**Queue Status Logic**:
- **New**: No consultation exists yet
- **In Progress**: Consultation exists, queue status is not 'pending'
- **Awaiting Results**: Consultation exists, queue status is 'pending' (waiting for lab)

---

### 4. **Lab Test Flow**

```
Lab Technician → View Lab Queue
├── Select Patient/Visit
├── View Test Request Details
├── Enter Test Results
└── Mark as Completed
```

**Database Actions**:
- `UPDATE lab_requests` (set results, status: 'completed')
- `UPDATE queue` (set status: 'completed' for lab department)

**Impact**:
- Doctor can now see lab results
- Doctor can complete consultation

---

### 5. **Pharmacy Flow**

```
Pharmacy Staff → View Pharmacy Queue
├── Select Patient/Visit
├── View Prescription Details
├── Dispense Medication
└── Mark as Dispensed
```

**Database Actions**:
- `UPDATE prescriptions` (set status: 'dispensed', dispensed_by, dispensed_date)
- `UPDATE queue` (set status: 'completed' for pharmacy department)

---

### 6. **Payment Flow**

```
Reception Staff → Financial → Record Payment
├── Select Patient
├── Enter Amount
├── Select Currency (USD/Shilling)
├── Select Payment Type (Zaad, Edahab, Cash)
├── Add Notes (optional)
└── Save Payment
```

**Database Action**: `INSERT INTO payments`

**Features**:
- Payments can be linked to specific visits
- Multiple payment types supported
- Daily income tracking

---

## Queue System Logic

The queue system is central to the clinic workflow:

### Queue Table Structure
- `visit_id`: Links to the visit
- `department`: 'doctor', 'pharmacy', or 'lab'
- `status`: 'pending' or 'completed'
- `created_date`: When added to queue
- `updated_date`: Last update time

### Queue Lifecycle

1. **Entry**: Patient added to queue when:
   - Visit created with "Add to Doctor Queue" checked → Doctor Queue
   - Doctor requests lab test → Lab Queue
   - Doctor creates prescription → Pharmacy Queue

2. **Processing**: Staff member views queue and processes item

3. **Completion**: Queue item marked as 'completed' when:
   - Lab results entered
   - Prescription dispensed
   - Consultation completed (for doctor queue)

### Queue Status Logic

**Doctor Queue**:
- Shows patients waiting for consultation
- Status indicators:
  - **New**: No consultation exists
  - **In Progress**: Consultation started
  - **Awaiting Results**: Waiting for lab results

**Pharmacy Queue**:
- Shows pending prescriptions
- Status: 'pending' until dispensed

**Lab Queue**:
- Shows pending lab tests
- Status: 'pending' until results entered

---

## Data Relationships

```
patients (1) ──→ (many) visits
visits (1) ──→ (1) consultations
visits (1) ──→ (many) lab_requests
visits (1) ──→ (many) prescriptions
visits (1) ──→ (many) queue
patients (1) ──→ (many) payments
users (1) ──→ (many) consultations (doctor_id)
users (1) ──→ (many) prescriptions (dispensed_by)
```

---

## Key Features Logic

### 1. **Patient Search**
- Search by name or mobile number
- Fuzzy matching for mobile numbers
- Used in: Create Visit, Patient List, Financial

### 2. **Visit History**
- Shows all visits for a patient
- Includes: Date, Vitals, Consultation, Lab Results, Prescriptions
- Accessible by: Patients (own history), Doctors, Reception

### 3. **Medical Reports**
- Generated for patients
- Includes: Patient info, Vitals, Consultation, Lab Results, Prescriptions
- Printable format
- Generated on-demand

### 4. **Dashboard Statistics**
- **Reception**: Today's visits, Total patients, Today's income, Queue counts
- **Doctor**: Queue count, Quick actions
- **Pharmacy**: Pending prescriptions count
- **Lab**: Pending lab tests count
- **Patient**: Total visits, Prescriptions count, Lab tests count

### 5. **Financial Management**
- Record payments (linked to patients/visits)
- Record expenses
- View financial reports
- Track daily income
- Multiple currency support

### 6. **Account Management**
- Manage staff accounts (users table)
- Add/edit/delete staff members
- Role assignment

### 7. **Notice Board**
- Single notice displayed on homepage
- Editable by reception staff
- Shows clinic information and announcements

---

## Authentication Logic

### Login Process

1. User enters:
   - Login ID (phone number for patients, username for staff)
   - Password
   - Role selection

2. System checks:
   - **For Patients**: Searches `patients` table by mobile number
   - **For Staff**: Searches `users` table by username and role

3. Validation:
   - Password match
   - Role match (for staff)
   - User exists

4. On Success:
   - Set current user and role
   - Redirect to MainApp with role-specific dashboard

### Default Credentials
- Reception: `4026635` / `1234`
- Doctor: `4696972` / `1234`
- Pharmacy: `4730530` / `1234`
- Lab: `8144099` / `1234`

---

## State Management

The system uses React state management:

- **App.js**: Manages login state, current user, current role
- **MainApp.js**: Manages active view (which component to display)
- **Individual Components**: Manage their own local state
- **Database**: SupabaseDB class handles all database operations

---

## Error Handling

- Database errors are caught and logged
- User-friendly error messages displayed
- Graceful fallbacks for missing data
- Table existence checks before operations

---

## Data Flow Summary

```
1. Patient Registration
   Reception → patients table

2. Visit Creation
   Reception → visits table → queue table (if queued)

3. Consultation
   Doctor → consultations table → lab_requests/prescriptions → queue table

4. Lab Processing
   Lab → lab_requests table (update results) → queue table (complete)

5. Pharmacy Processing
   Pharmacy → prescriptions table (update status) → queue table (complete)

6. Payment Recording
   Reception → payments table

7. Patient Access
   Patient → views own visits, prescriptions, lab results
```

---

## Key Business Rules

1. **Visit Required**: All consultations, lab requests, and prescriptions must be linked to a visit
2. **Queue Dependency**: Lab/pharmacy queues are created only when doctor requests them
3. **Status Tracking**: Queue status tracks workflow progress
4. **Patient Privacy**: Patients can only view their own data
5. **Role-Based Access**: Each role has specific permissions and views
6. **Visit History**: All visits are preserved for historical reference
7. **Financial Tracking**: Payments can be linked to visits or standalone

---

## System Integration Points

- **Supabase**: All data persistence
- **React Router**: Navigation (implicit through view switching)
- **Local Storage**: Session management (selectedPatientId, selectedVisitId)
- **Browser Print API**: Medical report generation

---

This system provides a complete clinic management solution with proper workflow management, role-based access, and comprehensive patient care tracking.

