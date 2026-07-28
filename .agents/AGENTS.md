# Capstone Alignment & Documentation First

You are assisting in the development of a capstone project for Hivelet (Fe Galang Da Silva Boarding House Management System). It is **CRITICAL** that you do not invent features or write code based on general software assumptions. Every piece of work must align with the academic paper and the defined documentation.

## Mandatory Development Workflow

1. **Always Read the Documentation First:** Before generating any implementation plan or writing code, you MUST review the relevant markdown files in the `docs/` directory, especially `docs/01_SYSTEM_BIBLE.md`, `docs/03_REQUIREMENTS.md`, `docs/UI_DESIGN_SPECIFICATION.md`, and the root `CAPSTONE_ALIGNMENT_PROTOCOL.md`.
2. **Justify with the Capstone Paper:** Every new feature, change, or decision must be traceable back to the Capstone project's goals, objectives, and scope. If a user asks for something outside the scope, you must warn them and confirm they want to proceed with a scope extension.
3. **No "Out of the Box" Assumptions:** Do not add standard features (like multi-property support, subscription billing, or generic social features) unless explicitly defined in the project's documentation. We are building a precise, academic project, not a commercial SaaS template.
4. **Be Careful and Precise:** When asked to implement a feature, explicitly state in your plan which documentation files and rules you reviewed to guide your implementation.

---

## Technical & Design Guidelines

### 1. Minimalist Corporate Aesthetic (Jira Inspired)
- **Design Language:** Corporate office management theme inspired by Atlassian/Jira design systems (`#f4f5f7` canvas, `#ffffff` card/sidebar surfaces, `#172b4d` slate text, `#0c66e4` primary blue accents, `#dfe1e6` subtle borders).
- **Strictly No Emojis / No Flashy Elements:** Use clean, professional icons (Lucide-Vue) or SVG status indicators. Never use emojis, floating tickers, or distracting welcome gates.
- **Visual Hierarchy:** Subtle hover transitions, crisp status badges (`To Do`, `In Progress`, `Done`, `Resolved`), clean tables with explicit column headers.

### 2. Mobile-First & Responsive Architecture
- **Responsive Layout:** All interfaces MUST be built mobile-first using Tailwind responsive breakpoints (`sm`, `md`, `lg`, `xl`).
- **Mobile Navigation:** On smaller screens, sidebars convert into slide-over drawers or bottom navigation bars, data tables feature horizontal overflow scrolling, and card grids stack fluidly.

### 3. Academic AI Code Documentation & Innovation Logging
- **Academic Transparency:** Because institutional academic policy strictly evaluates AI-assisted software development, every created or modified component/file MUST contain structured header comments documenting:
  - **Component Purpose & System Bible Section Reference**
  - **Architectural Rationale**
  - **Key Innovations & Adaptations** (explaining how standard open-source web patterns were tailored specifically for Hivelet's operational rules).
- **In-Code Comments:** Every non-trivial data structure, calculation (e.g., 50% revenue share, ₱200/head water billing rule, 2% annual price increase history), and authorization rule must have explicit code comments for capstone auditability.

### 4. Automatic Git Version Control & Conflict Handling
- **Proactive Git Sync:** When performing Git operations (`git pull`, `git push`, `git commit`), AI agents must execute and manage the version control workflow safely and automatically.
- **Automatic Merge Conflict Resolution:** If merge conflicts arise due to teammates simultaneously pushing changes, the AI must automatically inspect the conflicting files, intelligently preserve all teammates' valid work in accordance with the System Bible, resolve conflict markers cleanly, verify that the project builds without errors (`npm run build`), and complete the commit/push process automatically without interrupting the user.

Always prioritize these rules above speed. Precision, academic alignment, code transparency, and corporate UI excellence are the highest priorities for this repository.
