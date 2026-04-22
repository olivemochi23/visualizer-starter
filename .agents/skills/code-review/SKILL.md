---
name: code-review
description: Code review a pull request. Use when the user wants to review a PR, check code quality, or audit changes for bugs and guideline compliance. Requires `gh` CLI for GitHub interaction.
---

# Code Review

Provide a thorough, multi-pass code review for the given pull request.

## Prerequisites

- `gh` CLI authenticated and available
- Access to the repository being reviewed

## Process

Follow these steps precisely:

### 1. Eligibility Check

Use a lightweight agent to check if the pull request (a) is closed, (b) is a draft, (c) does not need a code review (e.g., automated PR or trivially simple), or (d) already has a code review from you. If so, do not proceed.

### 2. Gather Project Guidelines

Use an agent to list file paths of any relevant AGENTS.md or project guideline files from the codebase: the root file (if one exists), and any guideline files in directories whose files the PR modified.

### 3. Summarize the Change

Use an agent to view the pull request and return a summary of the change.

### 4. Multi-Pass Review

Launch 5 parallel agents to independently code review the change. Each agent should return a list of issues and the reason each issue was flagged (e.g., guideline adherence, bug, historical git context, etc.):

a. **Agent #1**: Audit the changes against project guidelines (AGENTS.md or equivalent). Not all instructions will be applicable during code review.
b. **Agent #2**: Read the file changes in the PR, then do a shallow scan for obvious bugs. Focus on the changes themselves, targeting large bugs. Avoid small issues and nitpicks. Ignore likely false positives.
c. **Agent #3**: Read the git blame and history of the code modified, to identify bugs in light of that historical context.
d. **Agent #4**: Read previous pull requests that touched these files, and check for any comments that may also apply to the current PR.
e. **Agent #5**: Read code comments in the modified files, and make sure the changes comply with any guidance in the comments.

### 5. Confidence Scoring

For each issue found in #4, launch a parallel agent that takes the PR, issue description, and list of guideline files (from step 2), and returns a confidence score (0-100):

- **0**: Not confident at all. False positive that doesn't stand up to light scrutiny, or a pre-existing issue.
- **25**: Somewhat confident. Might be real, but may also be a false positive. If stylistic, not explicitly called out in guidelines.
- **50**: Moderately confident. Verified as real, but might be a nitpick or rare in practice. Not very important relative to the rest of the PR.
- **75**: Highly confident. Double-checked and verified as very likely real and impactful. The existing approach is insufficient. Directly impacts functionality, or is directly mentioned in guidelines.
- **100**: Absolutely certain. Confirmed as definitely real and frequent in practice. Evidence directly confirms this.

For issues flagged due to guideline instructions, the agent should double check that the guidelines actually call out that issue specifically.

### 6. Filter

Filter out any issues with a score less than 80. If no issues meet this criteria, do not proceed to commenting.

### 7. Re-check Eligibility

Use an agent to repeat the eligibility check from #1, to make sure the PR is still eligible for review.

### 8. Comment on PR

Use `gh pr comment` to comment back on the pull request with the result.

**Comment format (example with 3 issues):**

```
### Code review

Found 3 issues:

1. <brief description> (AGENTS.md says "<...>")

<link to file and line with full sha1 + line range>

2. <brief description> (some/other/AGENTS.md says "<...>")

<link to file and line with full sha1 + line range>

3. <brief description> (bug due to <file and code snippet>)

<link to file and line with full sha1 + line range>
```

**If no issues found:**

```
### Code review

No issues found. Checked for bugs and project guideline compliance.
```

## Guidelines for avoiding false positives

- Pre-existing issues
- Something that looks like a bug but is not actually a bug
- Pedantic nitpicks that a senior engineer wouldn't call out
- Issues that a linter, typechecker, or compiler would catch (missing imports, type errors, formatting). Assume these run separately in CI.
- General code quality issues (lack of test coverage, general security issues, poor documentation), unless explicitly required in guidelines
- Issues called out in guidelines but explicitly silenced in code (e.g., lint ignore comment)
- Changes in functionality that are likely intentional or directly related to the broader change
- Real issues on lines the user did not modify in their PR

## Notes

- Do not check build signal or attempt to build the app. These run separately.
- Use `gh` to interact with GitHub (fetching PRs, creating comments), not web fetch.
- Create a todo list first to track progress.
- Always cite and link each bug with full SHA file links.
- Keep output brief, avoid emojis.
- Link format: `https://github.com/owner/repo/blob/<full-sha>/path/to/file#L<start>-L<end>`
  - Requires full git SHA (no shell commands in the link)
  - Provide at least 1 line of context before and after
