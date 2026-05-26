# Security Specification for-IdeaConnect NG

## Data Invariants
1. An idea must have a valid creatorId which corresponds to the authenticated user.
2. A user can only edit their own profile.
3. Bank details are private and only accessible by the account owner.
4. An interest record must link a valid idea and two distinct users (or at least provide correctly signed owner/interested IDs).

## The Dirty Dozen Payloads (Rejection Targets)
1. **The Identity Thief**: Updating `ideas/{id}` where `creatorId` doesn't match `auth.uid`.
2. **The Bank Hijacker**: Reading `/users/{otherId}` to see `accountNumber`.
3. **The Shadow Field**: Creating an idea with a hidden `verified: true` field.
4. **The Ghost Interest**: Creating an interest record for someone else (`interestedUserId != auth.uid`).
5. **The Junk Poison**: Sending a 1MB string as a `title`.
6. **The Status Jump**: Directly setting `status` to 'verified' on an idea if such a system existed (we'll guard status).
7. **The Orphaned Idea**: Creating an idea with a `creatorId` that doesn't exist (relational check).
8. **The PII Leak**: Listing all users and getting their `address`.
9. **The Time Traveler**: Setting `createdAt` to a date in 2020.
10. **The ID Spoofer**: Using a 5KB string as a document ID.
11. **The Price Manipulator**: Updating `price` on someone else's idea.
12. **The Interest Spammer**: Creating 1000 interest records in one second (limited by throughput but rules can check consistency).

## Test Runner (Logic Check)
The tests will verify:
- `users`: `get` works for self. `get` for others only returns non-sensitive fields (if we split, or we just block). Actually, I'll block full user reads for others.
- `ideas`: `list` and `get` allowed for all signed-in users. `create` and `update` only for owner.
- `interests`: `create` allowed for signed-in users (self). `read` allowed for idea owner or interested user.
