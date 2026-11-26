# E1-S2 · Session protection and logout

[E1 · Authentication and app shell](../../README.md) · [PRD epic](../../../../../../../PRD.md#e1--authentication-and-app-shell-5-sp)

As the admin, protected pages and APIs reject me after logout or expiry.

**Story points** 2 · **UAT** —

## Acceptance criteria

- Every `/api` route except login returns 401 without a valid session.
- The UI redirects to login.

## Tasks

- [E1-S2-T1 · Guard protected API routes](tasks/E1-S2-T1-guard-protected-api-routes.md)
- [E1-S2-T2 · End the admin session](tasks/E1-S2-T2-end-the-admin-session.md)
- [E1-S2-T3 · Guard protected screens](tasks/E1-S2-T3-guard-protected-screens.md)
