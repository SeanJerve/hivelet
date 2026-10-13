# APPENDIX Q: SOURCE CODE

The source code is kept in a Git repository, with its full history of changes, and is shown
at the defense on request. Its layout is as follows.

| Folder | What it holds |
| :--- | :--- |
| `frontend/src/` | The Progressive Web Application in Vue 3 and TypeScript: 63 components, of which 19 are screens |
| `backend/src/` | The application programming interface in Express and TypeScript: 49 files, with the routes for the public site, tenants, the owner and sign-in |
| `database/migrations/` | Every change made to the database, as 81 numbered migrations applied in order |
| `scripts/`, `backend/scripts/`, `frontend/scripts/` | The automated check suites of Section 4.3.1 and the tools that build the diagrams and reports |
| `docs/` | The requirements, business rules, design guideline and testing records |

Each change is recorded with its author, date and reason, which is the history Appendix C and
Appendix M, Table M-19 summarize.
