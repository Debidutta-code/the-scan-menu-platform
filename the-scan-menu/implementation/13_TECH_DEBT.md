# Technical Debt & Observations

This document outlines areas of technical debt, missing implementations, and potential refactoring targets identified during the codebase audit. **These items should not be addressed immediately, but tracked for future sprints.**

## 1. Missing Features & Stubs
*   **POS Integrations**: The `server/src/integrations/adapters/` directory contains stubs (`FuturePetpoojaIntegration`, etc.) that throw `NotImplementedError`. Real API communication logic must be written.
*   **Payment Gateway**: The `Restaurant` model has fields for `paymentOptions` (Razorpay, Stripe), but the active payment flow relies solely on the manual "Settle Bill" action. A true digital checkout flow with webhook handlers is missing.
*   **Email Service**: The `EmailService` relies on a direct Axios call to Resend. While functional, abstracting this behind an interface (like POS integrations) would allow swapping providers (SendGrid, AWS SES) easily.

## 2. Potential Scalability Issues
*   **WebSocket Bottleneck**: Currently, `SocketService` is a singleton running in the Node.js memory space. If the backend is horizontally scaled across multiple instances, Socket.IO rooms will not span across instances.
    *   *Debt*: Needs a Redis Adapter (`@socket.io/redis-adapter`) configured to sync events across multiple Node.js processes.
*   **In-Memory Analytics**: While some analytics use aggregation pipelines, complex reports over large datasets might slow down the primary operational database.
    *   *Debt*: Future consideration for a read-replica database specifically for analytics queries.

## 3. Code & Testing Gaps
*   **Test Coverage**: While unit and integration tests exist (e.g., `orders.test.ts`, `menu.test.ts`), exhaustive coverage of edge cases (especially around race conditions in table sessions or concurrent order placement) might be lacking.
*   **E2E Testing**: The project relies on Vitest. True End-to-End browser tests (using Playwright or Cypress) covering the full customer QR -> Checkout -> Staff Dashboard flow are necessary.
*   **Error Typing**: While Zod is used for validation, error propagation from Services to Controllers sometimes relies on throwing generic `Error` instances rather than custom typed error classes (e.g., `NotFoundError`, `ConflictError`), making error handling in controllers slightly less robust.

## 4. Missing Infrastructure Components
*   **Message Queue**: Asynchronous tasks (like POS syncing or sending emails) are currently handled in-process. If the Node server restarts immediately after an order is placed, the async email/sync might be lost.
    *   *Debt*: Implementation of a persistent queue (e.g., BullMQ with Redis) for background jobs.
