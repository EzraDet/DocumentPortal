# Security Specification: ShoppyVault Firebase Firestore Rules

## 1. Data Invariants
- A user document under `/users/{userId}` can only be read or written by the authenticated user whose `request.auth.uid == userId`.
- A user cannot alter their user profile ID or email to impersonate another user.
- A vault file record under `/users/{userId}/files/{fileId}` must strictly belong to `userId`, with `incoming().userId == request.auth.uid`.
- Non-owners cannot read, query, create, update, or delete any file record under another user's path.
- In updates, immutable fields (`id`, `userId`, `uploadedAt`, `storedName`, `size`, `mimeType`) cannot be tampered with.
- File names, notes, and tags must not exceed bounded string and array sizes.

## 2. The Dirty Dozen Payloads (Targeting Vulnerabilities)
1. **Unauthenticated Read User**: Attempt to read `/users/{otherId}` without auth token. Expected: DENIED.
2. **Cross-User Profile Read**: User A tries to read `/users/{userB}`. Expected: DENIED.
3. **Cross-User File Read**: User A tries to read `/users/{userB}/files/{file1}`. Expected: DENIED.
4. **Cross-User File List Query**: User A tries to list documents in `/users/{userB}/files`. Expected: DENIED.
5. **Orphan File Injection**: User A tries to create a file record under `/users/{userB}/files/{file1}` with `userId: userB`. Expected: DENIED.
6. **Spoofed User UID Payload**: User A authenticated as `uid_A` tries to write a file record under `/users/{uid_A}/files/{file1}` with `userId: uid_B`. Expected: DENIED.
7. **Tampered File Size on Update**: User A attempts to alter the `size` property of an existing file document. Expected: DENIED.
8. **Tampered Stored Path on Update**: User A attempts to alter `storedName` or path. Expected: DENIED.
9. **Massive Payload Injection**: User A attempts to save `notes` exceeding 2,000 characters or malicious payload. Expected: DENIED.
10. **Ghost Field / Shadow Field Injection**: User A tries to update file with unlisted field `isAdmin: true` or `isSuperUser: true`. Expected: DENIED.
11. **Foreign Account Deletion**: User A tries to delete `/users/{userB}/files/{file1}`. Expected: DENIED.
12. **Catch-All Collection Scan**: User attempts to query any undocumented root collection `/{document=**}`. Expected: DENIED.
