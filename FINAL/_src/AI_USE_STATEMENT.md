# STATEMENT ON THE USE OF ARTIFICIAL INTELLIGENCE

**[TO DO: ask the adviser where this goes (a front-matter page after the Abstract, the end of
Section 3.2, or an appendix) and whether a prompt log must be attached. CHED Memorandum Order No.
21, s. 2026 requires the disclosure and leaves its form to each school.]**

The researchers used generative AI coding assistants throughout the development of Hivelet,
principally Claude Code (Anthropic), running the Claude Opus 5, Claude Sonnet 5 and Claude Opus 5.5
models, from 13 September 2026 onward. **[TO DO: name the tool used in the first iteration, 24 July
to 28 August 2026, or delete this bracket if none was used.]** The assistant generated most of the
program code, the interface (which was prototyped directly in code, without a separate design tool),
the database migrations, the automated checks, the diagrams in Figures 4 to 9, and first drafts of
technical documents and of Chapters 4 and 5. Of the project's 1,631 recorded changes, 1,474 are
marked in the version history as made with the assistant.

The researchers directed the work and remain responsible for it. They gathered the requirements from
the landlady, decided what the system should do, gave the assistant standing written instructions
(including that the live database may never be reset and that every change to it is a reviewed,
numbered migration taken after a backup), reviewed its output, approved every change to the live
database, and carried out the testing with the landlady, the tenants and the technical evaluators.
The assistant's output was verified, not assumed: the automated check suites described in Section
4.3.1 run against the code and the live database, each new check was tested by deliberately breaking
what it guards, and the second iteration was given over to checking the system and its documents
against each other, which found and corrected 22 recorded errors, most of them claims written during
the AI-assisted first iteration without being checked against the system. All survey responses, test
results and client decisions reported in this study come from people, and none was produced by the
assistant.
