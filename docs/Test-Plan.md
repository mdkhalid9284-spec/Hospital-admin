# HospitalCare — Master Test Plan (IHPM-TP-01)
## Patient Admission Management & Core Healthcare Operations

## 1. Test Plan Identifier: IHPM-TP-01

## 2. Business Rules Covered
1. Patient must exist and be registered in the system.
2. Mandatory admission fields (reason, ward, date) must be valid.
3. Target bed must be in `Available` state.
4. Target bed cannot already be `Occupied` or `Reserved`.
5. Assigned doctor must exist and have available capacity.
6. Admission atomically binds Patient, Bed, Doctor, Timestamp, and Status.
7. Discharging the patient automatically returns the Bed to `Available` state.

---

## 3. Detailed Test Cases Matrix

| Test ID | Type | Feature / Target | Precondition | Input Data | Expected Output | Severity |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-EP-01** | EP | Valid Patient Admission | Patient P1 exists, Bed B1 Available, Doctor D1 Available | Valid admission payload with P1, B1, D1 | Admission created (201), Bed status Occupied | Critical |
| **TC-EP-02** | EP | Admission with Unregistered Patient | Database has no patient P999 | Admission payload with P999 | 404/400 Error: Patient not found | High |
| **TC-EP-03** | EP | Admission with Missing Mandatory Field | Patient P1 exists | Payload missing `reason` and `ward` | 400 Validation Error: Missing fields | High |
| **TC-EP-04** | EP | Admission with Occupied Bed | Bed B1 already Occupied | Admission payload targeting Bed B1 | 409 Conflict: Bed not available | Critical |
| **TC-EP-05** | EP | Admission with Unavailable Doctor | Doctor D1 is inactive / full | Admission payload targeting D1 | 409 Conflict: Doctor unavailable | Medium |
| **TC-BVA-01**| BVA | Bed Allocation when Available = 0 | Ward has 0 available beds | Admission request to full ward | 409 Conflict: No available beds | Critical |
| **TC-BVA-02**| BVA | Bed Allocation when Available = 1 | Ward has exactly 1 available bed | Admission request | 201 Created; Ward available beds becomes 0 | High |
| **TC-BVA-03**| BVA | File Upload Size Limit Boundary | Auth patient user | 10MB + 1 byte PDF upload | 413 / 400 Payload Too Large | High |
| **TC-DT-01** | DT | Decision Table: All Conditions Valid | C1=Y, C2=Y, C3=Y, C4=Y | Valid Patient, Details, Bed, Doctor | Admission Approved | Critical |
| **TC-DT-02** | DT | Decision Table: Occupied Bed | C1=Y, C2=Y, C3=N, C4=Y | Valid Patient, Details, Doctor; Bed Occupied | Admission Rejected (Bed Error) | Critical |
| **TC-DT-03** | DT | Decision Table: Unavailable Doctor | C1=Y, C2=Y, C3=Y, C4=N | Valid Patient, Details, Bed; Doctor Inactive | Admission Rejected (Doctor Error) | High |
| **TC-DT-04** | DT | Decision Table: Missing Details | C1=Y, C2=N, C3=Y, C4=Y | Valid Patient, Bed, Doctor; Bad Details | Admission Rejected (Validation) | High |
| **TC-DT-05** | DT | Decision Table: Unregistered Patient| C1=N, C2=Y, C3=Y, C4=Y | Invalid Patient ID, Valid Bed/Doctor | Admission Rejected (Patient Error) | High |
| **IT-01**    | IT | Auth to Patient Flow | Valid admin login | Token passed in Authorization header | Patient record retrieved | Critical |
| **IT-02**    | IT | Patient to Admission Flow | Patient registered | Start admission | Admission record links to patient | Critical |
| **IT-03**    | IT | Admission to Bed Flow | Available bed | Admit patient | Bed state changes to Occupied | Critical |
| **IT-04**    | IT | Admission to Doctor Flow | Doctor active | Admit patient | Doctor assigned patients list updated | Critical |
| **IT-05**    | IT | Admission to Patient Record | Active admission | Query patient records | Current admission visible in history | High |
| **IT-06**    | IT | Doctor to Medical Record | Doctor assigned to patient | Doctor posts clinical note | Note saved with doctor attribution | Critical |
| **IT-07**    | IT | Patient to Documents Flow | Patient logged in | Upload external scan | Document stored, categorized, queryable | Critical |
| **IT-08**    | IT | Billing to Discharge Flow | Admitted patient | Generate bill -> Process discharge | Bed released to Available | Critical |
| **ST-01**    | ST | Admin Completes Admission | Admin logged in | Complete admission form | Bed occupied, patient admitted | Critical |
| **ST-02**    | ST | Admin Cannot Allocate Occupied Bed| Bed B1 occupied | Attempt allocate B1 | System blocks with warning modal | Critical |
| **ST-03**    | ST | Doctor Views Assigned Patient | Doctor D1 logged in | D1 dashboard query | Shows only D1's patients | Critical |
| **ST-04**    | ST | Doctor Creates Digital Prescription| Assigned patient | Medicines, doses, frequency | Prescription saved & visible to patient | Critical |
| **ST-05**    | ST | Patient Views Own Records | Patient P1 logged in | Patient records page | Shows only P1's notes & prescriptions | Critical |
| **ST-06**    | ST | Patient Uploads External Record | Patient P1 logged in | Upload previous hospital PDF | File stored securely & visible | High |
| **ST-07**    | ST | Unauthorized Record Access (IDOR)| Patient P1 logged in | Request GET /patients/P2/records | 403 Forbidden | Critical |
| **ST-08**    | ST | Billing / Invoice Calculation | Billing staff logged in | Add line items ($100, $50) | Server calculates correct total & taxes | Critical |
| **ST-09**    | ST | Discharge Releases Bed | Patient in Bed B1 | Admin clicks Discharge Patient | Bed B1 status reverts to Available | Critical |
| **ST-10**    | ST | Invalid Login Handling | Any user | Incorrect password 5 times | Throttled / progressive delay enforced | High |
