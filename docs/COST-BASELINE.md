# Cost baseline

The marketplace site is designed to run at zero additional service cost:

- GitHub repository and GitHub Pages: within the applicable GitHub plan limits.
- GitHub Actions: one validation job and one Pages deployment per push or pull request.
- Search: static client-side index; no runtime API or hosted database.
- Analytics: none by default, to avoid third-party tracking and operational cost.

If semantic search or analytics is added later, document provider, expected monthly usage, data retention, and budget before enabling it.
