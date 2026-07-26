# Project: Personal Bookmark Manager (BBL Candidate Test)

## 1. Project Context & Core Invariant

- **CRITICAL SECURITY RULE:** This application is strictly private-by-default. User A MUST NOT be able to view, edit, or even acknowledge the existence of User B's data under any circumstances.
- Every API endpoint must enforce strict ownership validation.
- The API design, database schemas, and relations must structurally guarantee and support this privacy invariant.

## 2. Technology Stack

**Frontend (Strictly follow these):**

- React with Vite, TypeScript (DO NOT use Next.js).
- React Router >= v8.
- MUI >= v9 for all UI components. (DO NOT use Ant Design or other UI libraries; you must comply with strict project specs).
- **State Management:** Avoid complex local state variables (e.g., managing `localOptions`). Instead, fire direct API actions from within components or modals immediately upon submission and trigger data refetches to reduce frontend complexity.
- **Styling:** Implement global CSS overrides via MUI's ThemeProvider. Ensure consistent typography (such as applying the 'PSU STiDti' font) across the entire application, particularly for global or static elements like confirmation modals.

**Backend (Strictly follow these):**

- Node.js, TypeScript, NestJS.
- Database: SQL via Prisma ORM.
- Authentication: Auth0 (OIDC, Authorization Code flow with PKCE S256 ONLY. Absolutely no implicit flow).

## 3. Coding Guidelines & AI Instructions

- **No Assumptions:** If a requirement is under-specified or ambiguous (e.g., the collection sharing feature), STOP and ask the user to clarify or confirm the decision before writing any code.
- **Security First:** Whenever creating or modifying an API, explicitly check token validation and the data-access layer to ensure the core privacy invariant holds.
- **Custom Agent Tools:** Whenever you need to run tests, verify code, or check security rules, always utilize the custom commands/scripts provided in the `/.agent/` directory.

## 4. Verification & Testing Guardrails

- Any newly generated or modified code MUST be accompanied by automated tests.
- Do not write tests solely for the "Happy Path". You MUST include adversarial tests (e.g., explicitly simulating User A attempting to fetch or delete User B's data) to prove the security invariants.
- Do not assert or claim that the code is secure unless there is a passing runnable test to prove it.
