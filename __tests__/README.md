# Testing Guide for GCTS Handbook Frontend

## Overview

This directory contains unit and integration tests for the LangGraph RAG system. Tests are organized by functionality and use TypeScript with Jest/Vitest (to be configured).

## Test Structure

```
__tests__/
├── lib/
│   └── langgraph/
│       ├── nodes/
│       │   └── formatCitations.test.ts    # Node-specific tests
│       └── edges.test.ts                  # Routing logic tests
├── types/
│   └── validation.test.ts                 # Zod schema validation tests
└── README.md                              # This file
```

## Setting Up Testing

### Install Testing Dependencies

To run these tests, you'll need to install testing dependencies:

```bash
bun add -d vitest @vitest/ui @testing-library/react @testing-library/jest-dom
```

Or with npm:

```bash
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom
```

### Configure Vitest

Create a `vitest.config.ts` in the project root:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

### Add Test Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

## Running Tests

### Run All Tests

```bash
bun test
# or
npm test
```

### Run Tests in Watch Mode

```bash
bun test --watch
```

### Run Tests with UI

```bash
bun test:ui
```

### Run Specific Test File

```bash
bun test __tests__/lib/langgraph/edges.test.ts
```

## Test Categories

### 1. Unit Tests

Test individual functions and nodes in isolation with mocked dependencies.

**Examples:**
- `formatCitations.test.ts` - Tests citation formatting logic
- `validation.test.ts` - Tests Zod schema validation

**Best Practices:**
- Mock external dependencies (OpenAI, Pinecone, MongoDB)
- Test both success and error cases
- Test edge cases and boundary conditions
- Keep tests fast and independent

### 2. Integration Tests

Test the interaction between multiple components or the full graph flow.

**To Add:**
- Full graph execution tests
- API endpoint tests
- Database interaction tests

### 3. E2E Tests (Future)

Test complete user workflows from frontend to backend.

## Writing New Tests

### Test Template

```typescript
import { functionToTest } from '@/path/to/function';

describe('FunctionName', () => {
  it('should perform expected behavior', () => {
    // Arrange
    const input = 'test input';
    const expected = 'expected output';

    // Act
    const result = functionToTest(input);

    // Assert
    expect(result).toBe(expected);
  });

  it('should handle error cases', () => {
    // Test error handling
    expect(() => functionToTest(null)).toThrow();
  });
});
```

### Mocking External Services

For tests that need to mock OpenAI, Pinecone, or MongoDB:

```typescript
import { vi } from 'vitest';

// Mock OpenAI
vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue({ content: 'mocked response' }),
  })),
}));

// Mock Pinecone
vi.mock('@/lib/pinecone', () => ({
  getPineconeIndex: vi.fn().mockResolvedValue({
    query: vi.fn().mockResolvedValue({
      matches: [],
    }),
  }),
}));
```

## Test Coverage

### Current Coverage

- ✅ Zod schema validation
- ✅ Edge routing logic
- ✅ Citation formatting
- ⏳ Node functions (partial)
- ⏳ API endpoints
- ⏳ Database operations
- ⏳ Full graph integration

### Coverage Goals

- Unit tests: 80%+ coverage
- Integration tests: Key user flows
- Critical paths: 100% coverage (error handling, data validation)

### Generate Coverage Report

```bash
bun test:coverage
```

Coverage reports will be generated in the `coverage/` directory.

## Continuous Integration

### GitHub Actions (Example)

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun test
```

## Testing Best Practices

### DO:

- ✅ Test one thing per test
- ✅ Use descriptive test names
- ✅ Arrange-Act-Assert pattern
- ✅ Mock external dependencies
- ✅ Test error cases
- ✅ Keep tests fast and independent
- ✅ Use TypeScript for type safety

### DON'T:

- ❌ Test implementation details
- ❌ Share state between tests
- ❌ Make real API calls in unit tests
- ❌ Test third-party library code
- ❌ Ignore flaky tests

## Debugging Tests

### Run Single Test

```bash
bun test -t "should format citations from retrieved chunks"
```

### Debug with Verbose Output

```bash
bun test --reporter=verbose
```

### Use Console Logs

Tests can use `console.log()` for debugging:

```typescript
it('should work', () => {
  console.log('Debug info:', someVariable);
  expect(someVariable).toBe(expected);
});
```

## Future Testing Improvements

1. **Add Integration Tests**
   - Test full graph execution
   - Test API endpoints with test database
   - Test streaming responses

2. **Add E2E Tests**
   - Test frontend + backend integration
   - Test real user workflows
   - Use Playwright or Cypress

3. **Performance Tests**
   - Test graph execution time
   - Test database query performance
   - Test LLM call latency

4. **Contract Tests**
   - Verify API contracts
   - Test OpenAI/Pinecone/MongoDB integrations

5. **Visual Regression Tests**
   - Test UI components
   - Verify citation display
   - Test conversation interface

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Jest Matchers](https://jestjs.io/docs/expect)
- [LangChain Testing Guide](https://js.langchain.com/docs/how_to/testing)

## Getting Help

- Check existing tests for examples
- Review `.cursorrules` for testing guidelines
- Consult the team for integration test setup
- See LangChain docs for testing LLM applications

