# Security Specification for MARQ W-1 Subscription Access Control

## 1. Data Invariants
1. A user profile document ID must strictly equal the user's authenticated `request.auth.uid` (Identity Integrity).
2. All writes to the `/users/{userId}` collection require verification of standard user authentication: `request.auth != null`.
3. Standard users (`clinicians`) are forbidden from altering their own `role` or `subscriptionStatus` fields (Privilege Escalation protection).
4. Standard users can read their own user profiles, but cannot list, read, or query profiles of other users.
5. Only verified system administrators (such as `waseemsaiyed@gmail.com`) can read, query, list, update, and approve any user's role or subscription status.
6. Timestamp fields like `requestedAt` are immutable after creation.

---

## 2. The "Dirty Dozen" Malicious Payloads

We design 12 specific malicious payloads attempting to break security rules:

1. **Self-Approval (Privilege Escalation):**
   * Target: `/users/attackerUID` (create)
   * Payload: `{"uid": "attackerUID", "name": "Attacker", "email": "attacker@gmail.com", "subscriptionStatus": "active", "role": "clinician", "requestedAt": "2026-09-24T20:55:00Z"}`
   * Attack vector: Self-approving subscription upon sign-up.
   
2. **Self-Promotion to Admin:**
   * Target: `/users/attackerUID` (create)
   * Payload: `{"uid": "attackerUID", "name": "Attacker", "email": "attacker@gmail.com", "subscriptionStatus": "pending", "role": "admin", "requestedAt": "2026-09-24T20:55:00Z"}`
   * Attack vector: Registering directly with `role: "admin"` to hijack full system permissions.

3. **Identity Spoofing (Impersonating Owner):**
   * Target: `/users/waseemsaiyedUID` (create/update)
   * Payload: `{"uid": "waseemsaiyedUID", "name": "Fake Owner", "email": "waseemsaiyed@gmail.com", "subscriptionStatus": "active", "role": "admin"}`
   * Attack vector: Writing a user profile with the owner's UID to gain admin clearance.

4. **Shadow Field Injection:**
   * Target: `/users/attackerUID` (create)
   * Payload: `{"uid": "attackerUID", "name": "Attacker", "email": "attacker@gmail.com", "subscriptionStatus": "pending", "role": "clinician", "requestedAt": "2026-09-24T20:55:00Z", "bypassSubscription": true}`
   * Attack vector: Injecting custom fields to bypass subscription checks in sub-services.

5. **Cross-User Query Scraping (Blanket Reads):**
   * Action: `list` query on `/users` collection by an unauthenticated or non-admin user.
   * Attack vector: Scraping other clinicians' MRN details or clinical access details.

6. **State Hijacking (Modifying Approved Status):**
   * Target: `/users/attackerUID` (update)
   * Payload: `{"subscriptionStatus": "active"}`
   * Attack vector: Clinician updating their own `subscriptionStatus` from `pending` to `active` post-registration.

7. **Email Spoofing without verification:**
   * Target: `/users/attackerUID` (create)
   * Payload: `{"uid": "attackerUID", "name": "Attacker", "email": "waseemsaiyed@gmail.com", "role": "admin"}`
   * Attack vector: Setting display email to owner's email to fool text checks.

8. **Resource Poisoning (Junk character IDs):**
   * Target: `/users/verylongjunkcharacterstringthatiswayabove128charsandcontainsxmlentities...` (create)
   * Payload: `{}`
   * Attack vector: Flooding database with huge junk-string IDs.

9. **Array Size Flooding (Denial of Wallet):**
   * Target: `/users/attackerUID` (update)
   * Payload: `{"tags": ["tag1", "tag2", ..., "tag1000"]}`
   * Attack vector: Bloating documents to hit the 1MB limits and run up bandwidth bills.

10. **Mutating Immutable Timestamps:**
    * Target: `/users/attackerUID` (update)
    * Payload: `{"requestedAt": "2020-01-01T00:00:00Z"}`
    * Attack vector: Rewriting original registration timestamps to bypass subscription duration policies.

11. **Bypassing Verification State Gate:**
    * Action: `get` request for a private administrative document when authenticated but not verified.
    * Attack vector: Attempting to query master credentials before verifying email address.

12. **Foreign Administrative Manipulation:**
    * Target: `/users/victimUID` (update) by a clinician who is not admin.
    * Payload: `{"role": "clinician", "subscriptionStatus": "suspended"}`
    * Attack vector: One clinician locking out another clinician's bed controls out of malice.

---

## 3. Test Runner Specification
These invariants are tested programmatically in `firestore.rules.test.ts` ensuring all "Dirty Dozen" payloads return `PERMISSION_DENIED` under zero-trust authorization protocols.
