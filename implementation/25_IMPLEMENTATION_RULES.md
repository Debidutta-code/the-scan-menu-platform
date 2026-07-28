# Implementation Rules

This document outlines the strict development workflow and rules for all human contributors and AI assistants working on TheScanMenu. Adherence is mandatory to maintain the architectural integrity of the Restaurant OS.

## Core Rules

1.  **One feature per Pull Request**: Keep PRs atomic. Do not bundle multiple un-related features.
2.  **Never mix refactoring with feature implementation**: If you find tech debt while building a feature, complete the feature first, then open a separate PR for the refactor.
3.  **Never break multi-tenancy**: Every operational database query MUST include the `restaurantId`. Data leakage between tenants is a critical failure.
4.  **Never bypass feature flags**: All new UI components or business logic flows must be gated behind a `FeatureFlag` check.
5.  **Keep controllers thin**: Controllers exist solely to parse HTTP requests, validate input via Zod, call a service, and return the standard JSON envelope.
6.  **Business logic belongs in services**: All database mutations, external API orchestration, and complex calculations must reside in `src/services/`.
7.  **Reuse existing UI components**: Always check `client/src/components` and the Tailwind configuration before creating new UI elements.
8.  **Never duplicate code**: Abstract reusable logic into utility functions, React hooks, or shared components.
9.  **Database changes require migration planning**: If you alter a schema, consider how existing production data will be affected. Write a migration script (`utils/migrate*.ts`) if necessary.
10. **APIs must remain backward compatible whenever possible**: Mobile clients or external integrations may rely on older payload structures.
11. **Every new feature must update documentation if architecture changes**: If you add a new module, update the `MODULE_MATRIX.md` and `PRODUCT_SPEC.md` first.
12. **Run tests before committing**: `npm test` must pass. A failing test suite means the feature is incomplete.
13. **Maintain production-ready code**: Do not push "TODO" comments for critical paths or bypass authorization checks "just for testing".
14. **Follow repository naming conventions**: React components (`PascalCase.tsx`), hooks (`useCamelCase.ts`), backend models (`PascalCase.ts`), controllers/services (`camelCase.controller.ts`).
15. **Never hardcode tenant-specific behavior**: Do not write `if (restaurantId === '123')`. Use configuration fields or Feature Flags.
16. **Every module should be independently toggleable**: Ensure that turning off a feature flag does not crash the rest of the application.
17. **Preserve backward compatibility**: When adding fields to models, ensure existing code doesn't crash if that field is missing on older documents.
18. **Avoid premature optimization**: Do not introduce Redis caching or complex microservice splitting until the core business feature is functional and actually experiencing load issues.
19. **Keep commits focused and atomic**: Commit messages should describe exactly what changed and why.
20. **Follow the implementation phases in 15_IMPLEMENTATION_PLAN.md**: Do not jump to Phase 16 if Phase 2 is not complete.

---

## Development Checklist

Before pushing any commit or opening a Pull Request, the developer (or AI) must verify the following:

- [ ] Does this PR contain only one feature or fix?
- [ ] Are all new features gated by a Feature Flag?
- [ ] Does every database query properly enforce `restaurantId`?
- [ ] Is the Express Controller completely free of business logic?
- [ ] Were existing UI components used instead of creating duplicates?
- [ ] Did `npm test` run and pass locally?
- [ ] Did `npm run lint` pass without errors?
- [ ] Are there any hardcoded tenant IDs or API keys? (If yes, remove them).
- [ ] If this changes the architecture, are the Markdown documents in `/implementation` updated?
- [ ] Does the codebase remain fully production-ready?
