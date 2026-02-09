# Contributing to VOXNTRY

Thank you for your interest in contributing to VOXNTRY! We welcome contributions from the community.

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, please include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (screenshots, code snippets, etc.)
- **Describe the behavior you observed and what you expected**
- **Include your environment details** (OS, Node.js version, browser, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **List any examples of other projects where this feature exists**

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Follow the coding style** of the project
3. **Write clear commit messages** following [Conventional Commits](https://www.conventionalcommits.org/)
4. **Add tests** for any new functionality
5. **Update documentation** as needed
6. **Ensure all tests pass** before submitting

## Development Setup

### Prerequisites

- Node.js 20.x or higher
- npm or yarn
- Google Cloud account (for Google Sheets API)

### Setup Steps

1. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/voxntry.git
   cd voxntry
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Configure your `.env.local` with required values

5. Set up Google Cloud credentials (see README.md)

6. Start the development server:
   ```bash
   npm run dev
   ```

## Coding Guidelines

### TypeScript

- Use TypeScript for all new code
- Define proper types (avoid `any` when possible)
- Use interfaces for object shapes
- Export types from `src/types/index.ts`

### Code Style

- Follow the existing code style
- Run `npm run lint` before committing
- Use meaningful variable and function names
- Add comments for complex logic

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(dashboard): add search filter for attendees
fix(auth): resolve login cookie expiration issue
docs(readme): update installation instructions
```

## Branch Naming

Use descriptive branch names:
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

Example: `feature/add-csv-export`

## Testing

- Write unit tests for utility functions
- Write integration tests for API routes
- Ensure all tests pass: `npm test`
- Maintain or improve code coverage

## Documentation

- Update README.md if you change functionality
- Add JSDoc comments for public APIs
- Update type definitions in `src/types/index.ts`
- Include examples for new features

## Security

If you discover a security vulnerability, please follow our [Security Policy](SECURITY.md). **Do not** open a public issue.

## Questions?

Feel free to open an issue with the `question` label, or reach out to the maintainers.

## License

By contributing to VOXNTRY, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🎉
