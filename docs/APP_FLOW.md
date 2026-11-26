# ParkPermit — App Flow

## 1. Main flow
```mermaid
flowchart TD
  L[Login] -->|valid| D[Dashboard<br/>term list + current term status]
  L -->|invalid| L
  D -->|new term / replace data| U[CSV upload<br/>applications.csv + lots.csv]
  U --> V{Validation report}
  V -->|blocking errors| U
  V -->|ok, warnings listed| R[Run allocation]
  R --> P[Proposed allocation per lot<br/>peak occupancy per shift · accessibility ✓ · KPIs]
  P --> F[Review flags / decision list]
  P --> LD[Lot detail<br/>per-shift bars · applicants · reasons]
  F --> M[Move applicant]
  LD --> M
  M --> PV[Preview: before/after occupancy<br/>source + target lots, live]
  PV -->|blocked rule| M
  PV -->|> 100%: override reason| C[Commit move]
  PV -->|ok| C
  C -->|audit event, lot approvals reset| P
  F -->|resolve: accept suggestion / waitlist / confirm exclusion / reinstate| P
  P --> A{Approve lot}
  A -->|open decisions or over capacity| F
  A -->|approved| AL{All 5 lots approved?}
  AL -->|no| P
  AL -->|yes| FT[Finalize term]
  FT --> X[Export allocation CSV<br/>term read-only]
```

## 2. Screens
| Screen | Purpose | Key elements | Actions |
|---|---|---|---|
| **Login** | Authenticate admin | Email, password, generic error | Log in |
| **Dashboard** | Term overview | Term status chip; 5 lot cards (permits car/bike, peak %, accessibility ✓/!, approved); KPIs: % in choice 1/2/3, unplaced, open decisions | Upload, Run allocation, open lot, open decisions, Finalize |
| **Upload** | Load the term's data | Two drop zones; schema hint; validation report (errors and warnings per row); data-issue counts (varies, same-lot, inactive, past occupancy note) | Upload, Re-upload, Run allocation |
| **Lot detail** | Inspect one lot | Per-vehicle pool: three shift bars (early/afternoon/night) vs general capacity; accessible bays used/total; `past_peak_count` with "includes visitors & contractors" label; applicant table (id, type, shift, choice rank, status, flags, reason) | Move, Copy reason, Approve / Unapprove |
| **Decision list** | Short list to act on | Sorted: accessibility unmet → inactive → unplaced → suggested → over-capacity; flag filters | Accept suggestion, Move, Waitlist, Confirm exclusion, Reinstate (note required) |
| **Move dialog** | Change a placement safely | Target lot picker (choices first, with distance); live before/after bars for source and target; blocking messages; override reason field when > 100% | Confirm move, Cancel |
| **Audit** | Trace changes | Event table with filters | Export |

## 3. Move: live check sequence
```mermaid
sequenceDiagram
  actor Admin
  participant UI as MoveDialog
  participant API as Express
  participant Eng as engine/checks
  participant DB as MongoDB
  Admin->>UI: choose target lot
  UI->>API: POST /moves/preview {appId, targetLotId}
  API->>DB: load allocation (cached per request)
  API->>Eng: previewMove(allocation, appId, target)
  Eng-->>API: {allowed, blocking, warnings, before, after}
  API-->>UI: checks
  UI-->>Admin: bars update, warnings shown
  Admin->>UI: confirm (+ note, override reason if needed)
  UI->>API: POST /moves {expectedVersion, ...}
  API->>Eng: previewMove + assertInvariants
  alt rule blocked or version conflict
    API-->>UI: 409 RULE_BLOCKED / CONFLICT_VERSION
  else ok
    API->>DB: update placement, version++, reset lot approvals, audit event
    API-->>UI: updated allocation
  end
```

## 4. Term states
```mermaid
stateDiagram-v2
  [*] --> draft
  draft --> uploaded: valid CSVs
  uploaded --> uploaded: re-upload
  uploaded --> allocated: run allocation
  allocated --> allocated: move / resolve / approve
  allocated --> uploaded: re-upload (confirm, discards proposal)
  allocated --> finalized: all lots approved
  finalized --> [*]
```
