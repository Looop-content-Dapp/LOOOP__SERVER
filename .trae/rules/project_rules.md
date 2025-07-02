# Project Rules for Node.js, TypeScript, and Prisma Stack

## Technology Stack
- Node.js (v18+) - [Official Documentation](https://nodejs.org/docs)
- TypeScript (v5+) - [Official Documentation](https://www.typescriptlang.org/docs)
- Prisma ORM - [Official Documentation](https://www.prisma.io/docs)

## Code Style Guidelines

### TypeScript
- Use strict TypeScript configuration (`strict: true`)
- Always define proper types/interfaces for data structures
- Avoid using `any` type unless absolutely necessary
- Use type inference when types are obvious
- Use enums for predefined sets of values
- Follow TypeScript naming conventions:
  - PascalCase for types, interfaces, classes, and enums
  - camelCase for variables, functions, and methods
  - UPPER_SNAKE_CASE for constants
- Maintain comprehensive type documentation
- Use TypeScript's utility types when applicable
- Implement proper error handling with custom error types

### Prisma
- Keep schema.prisma file well-documented
- Use meaningful model and field names following PascalCase for models
- Define appropriate relationships between models
- Always include proper indexes for performance optimization
- Use migrations for database changes
- Keep migrations versioned and documented
- Follow Prisma's best practices:
  - Use appropriate field types
  - Implement proper cascade deletes
  - Define meaningful constraints
  - Use composite indexes when necessary
  - Implement proper data validation

### Node.js
- Use async/await instead of callbacks
- Implement proper error handling with try/catch blocks
- Follow RESTful API conventions
- Use environment variables for configuration
- Implement logging for debugging and monitoring
- Follow security best practices:
  - Input validation
  - Rate limiting
  - Security headers
  - Authentication/Authorization
- Use proper HTTP status codes
- Implement request validation
- Handle process signals properly
