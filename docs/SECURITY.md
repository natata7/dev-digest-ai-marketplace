# Security policy

Do not commit secrets, tokens, credentials, private keys, or absolute local paths. Treat hooks, MCP/LSP servers, shell commands, executables, and network access as security-sensitive.

Before release, review the complete diff and run strict validation from a clean checkout. Document required environment variables and external services in the affected plugin README.

## Dangerous release response

If a release is found to contain a secret or unsafe behavior:

1. Stop distribution and disable the affected release channel.
2. Revoke or rotate exposed credentials immediately.
3. Open a private security report using the repository's configured security contact.
4. Remove or fix the unsafe content and publish a patched version.
5. Notify affected users with impact, remediation, and upgrade instructions.
6. Record the incident and add a regression check before restoring the channel.

Do not disclose secrets in public issues, logs, or changelogs.
