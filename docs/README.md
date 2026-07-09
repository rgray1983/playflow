# PlayFlow

PlayFlow is a configurable SaaS platform for family entertainment
centers and similar venues. The project is developed using a
sprint-based workflow with GitHub as the source of truth and Codex
implementing approved sprint specifications.

## Development Workflow

1.  Discuss and design the feature.
2.  Write a Sprint Specification in `docs/sprints`.
3.  Implement only that sprint.
4.  Verify build, database sync, and functionality.
5.  Push to `master`.
6.  Review and refine.

## Project Documentation

``` text
docs/
├── architecture/
├── decisions/
├── specifications/
├── sprints/
│   ├── Sprint-001-Commerce-Settings-V1.md
│   ├── Sprint-002-Party-Manager-POS-V1.md
│   └── ...
├── NEXT.md
└── SETUP.md
```

### Key Documents

-   **SETUP.md** --- Local development and environment setup.
-   **NEXT.md** --- Living product backlog.
-   **sprints/** --- Sprint specifications and implementation history.
-   **architecture/** --- Core architecture documentation.
-   **decisions/** --- Architectural decision records.
-   **specifications/** --- Long-form feature and system specifications.

## Development Rules

-   GitHub `master` is the source of truth.
-   Do not redesign unrelated UI during a sprint.
-   Build the **brain** before the UI.
-   Prefer configurable systems over hard-coded behavior.
-   Never commit `.env`.
-   If the Prisma schema changes:
    -   Run `npx prisma generate`
    -   Run `npx prisma db push` or `npx prisma migrate dev`
    -   Never run `prisma migrate reset`
-   A successful build alone is not enough. Database synchronization and
    click-testing are required before a sprint is complete.
