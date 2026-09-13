# Smart Andon Security Hardening

This patch keeps the existing menu-based UX/RBAC, while moving trust to Firebase Auth + Firestore Rules.

## Important production rule
- Demo mode may use preset PIN users for evaluation only.
- Production mode does NOT accept preset/local PIN accounts or client-side role switching.
- Production users authenticate with Firebase Auth email/password.
- Every production user must have an authorization profile at `master_operators/{FIREBASE_AUTH_UID}`.
- The `role` in that profile drives Firestore Security Rules. UI menu visibility is only a convenience layer.

## First administrator bootstrap
The first administrator must be provisioned through a trusted Firebase/admin environment (or a future privileged backend/Cloud Function). Do not implement first-admin elevation purely in browser JavaScript; that would recreate the privilege-escalation finding this patch removes.

## Changes in this patch
- Removed production local-PIN/Fallback-Admin authentication bypass.
- Disabled the quick/manual role-switch LoginModal outside demo mode.
- Production login loads role only from `master_operators/{auth.uid}` after Firebase authentication.
- Firestore reads/writes now require a valid mapped profile where applicable.
- Added explicit client-side role guards to destructive/master-data service operations as defense in depth.
- Firestore Rules remain the final authorization boundary.

## Deployment
Deploy `firestore.rules` together with the application. Existing operator documents that use Badge ID as the document ID must be migrated so the document ID equals the Firebase Auth UID.
