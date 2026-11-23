# Security Policy

## Reporting a Vulnerability
Please **do not** report security vulnerabilities through public GitHub issues.

Instead, report security issues privately by contacting the maintainers directly via email or through the **Ship Together** community channels linked in the repository. Include:
- A description of the vulnerability and affected area
- Steps to reproduce or proof of concept
- Potential impact

We will review reports promptly and coordinate a fix before public disclosure.

## Security Practices for Contributors
- Never commit API keys, tokens, `.env` files with secrets, or private credentials to the repository.
- Keep environment configuration in local `.env` files and use `.env.example` only for non-secret variable names/placeholders.
- Validate user inputs and review database/storage access rules before deploying changes.
