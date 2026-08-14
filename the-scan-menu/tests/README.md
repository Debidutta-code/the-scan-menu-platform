# Test Suite Directory & Navigation Guide

This directory documents the structure and organization of all test suites across the Pixora QR platform workspace.

---

## 📁 Test Organization

```
the-scan-menu/
├── server/tests/               # Backend Test Suites (Vitest)
│   ├── unit/                  # Unit tests (Adapters, Encryption, Services)
│   ├── integration/           # API Integration tests (Orders, Webhooks, Auth)
│   └── acceptance/            # Architectural Acceptance & Governance tests
│
├── client/src/                # Frontend Test Suites (Vitest + React Testing Library)
│   ├── store/__tests__/       # State & Store unit tests (Cart, Menu, User)
│   └── hooks/**/__tests__/    # Hook unit & UI tests (Feature Flags, Socket, Auth)
│
└── e2e/                       # End-to-End Test Suites (Playwright)
    ├── auth.setup.ts          # Auth state setup & session persistence
    ├── managerMenu.spec.ts    # Manager dashboard E2E tests
    ├── dineIn.spec.ts         # Customer Dine-in flow E2E tests
    ├── takeaway.spec.ts       # Customer Takeaway flow E2E tests
    └── health.spec.ts         # System health probe E2E tests
```

---

## 🚀 Running Tests

### 1. Run All Workspace Unit & Integration Tests
```bash
npm test
```

### 2. Run Server Tests Only
```bash
npm test --workspace=server
```

### 3. Run Client Tests Only
```bash
npm test --workspace=client
```

### 4. Run Playwright End-to-End (E2E) Tests
```bash
npm run e2e
```

### 5. Open Playwright UI Mode
```bash
npm run e2e:ui
```
