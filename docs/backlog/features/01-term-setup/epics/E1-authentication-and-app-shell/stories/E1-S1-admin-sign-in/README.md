# E1-S1 · Admin sign-in

[E1 · Authentication and app shell](../../README.md) · [PRD epic](../../../../../../../PRD.md#e1--authentication-and-app-shell-5-sp)

As the admin, I log in so only I can see applicant data.

**Story points** 3 · **UAT** —

## Acceptance criteria

- Valid credentials open the dashboard.
- Invalid credentials show a generic error.
- Session is an httpOnly cookie.
- 5 failed attempts in 15 min are rate-limited.

## Tasks

- [E1-S1-T1 · Set up the admin account](tasks/E1-S1-T1-set-up-the-admin-account.md)
- [E1-S1-T2 · Establish the admin session](tasks/E1-S1-T2-establish-the-admin-session.md)
- [E1-S1-T3 · Connect the login page](tasks/E1-S1-T3-connect-the-login-page.md)
