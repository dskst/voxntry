# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, please send an email with details to the maintainers. You can find contact information in the repository.

Please include the following information:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

We prefer all communications to be in English or Japanese.

## Response Timeline

- We will acknowledge your email within 48 hours
- We will provide a more detailed response within 7 days
- We will work on fixing the vulnerability and release a patch as soon as possible
- We will publicly disclose the vulnerability after a patch is available

## Security Best Practices for Users

When deploying VOXNTRY:

1. **Environment Variables**: Never commit `.env.local` or service account keys to version control
2. **Passwords**: Use strong, unique passwords (minimum 12 characters)
3. **HTTPS**: Always use HTTPS in production environments
4. **Updates**: Keep dependencies up to date using `npm audit` and Dependabot
5. **Access Control**: Limit Google Sheets access to only necessary accounts
6. **Secret Management**: Use GCP Secret Manager for production secrets
7. **Monitoring**: Enable logging and monitor for suspicious activities

## Known Security Considerations

- This application handles personal information (names, affiliations). Ensure compliance with local data protection regulations (GDPR, APPI, etc.)
- Google Sheets data is not encrypted at rest by the application layer (relies on Google's encryption)
- Cookie-based authentication requires secure configuration (httpOnly, secure, sameSite)

## Security Updates

Security updates will be released as patch versions and announced via GitHub releases.

## Attribution

This security policy is based on security best practices and recommendations from the open source community.
