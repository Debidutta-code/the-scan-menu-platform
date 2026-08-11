# Table Session & QR Resolution Flow (V2.1)

## 1. QR Code Semantics
- The physical QR code contains a permanent token representing the **Physical Table**, not a transient dining session.
- Scanning the QR resolves the table and inspects active sessions in MongoDB.

## 2. Decision Tree on QR Scan

```mermaid
flowchart TD
    Scan[Diner Scans Physical Table QR] --> CheckSession{Is there an active DiningSession in DB?}
    
    CheckSession -- "None / Closed / Settled" --> CreateClean[Clean Menu Loaded\nSession created on first order / check-in]
    
    CheckSession -- "Active Session Exists" --> CheckToken{Device holds valid GuestToken for this Session?}
    
    CheckToken -- "Yes" --> ResumeParty[Participant Resumed\nShows 'My Orders' & 'Table Total']
    
    CheckToken -- "No (Unknown Device)" --> CheckMode{Payment Mode & Balance}
    
    CheckMode -- "Prepaid & Balance = 0 & All Orders Served" --> AutoArchive[Auto-Archive Old Session\nClean Session Created for New Diner]
    
    CheckMode -- "Postpaid Unpaid OR Orders In-Kitchen" --> TokenFence[Safety Barrier Screen\n'Table has an ongoing meal'\n[Join with PIN] or [Alert Staff]]
```
