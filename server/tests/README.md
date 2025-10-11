# Simple Test Setup

## Quick Start

Just run the test for the feature you want:

```bash
# Test register route
npm run test:register

# Test login route (when created)
npm run test:login

# Run all tests
npm test
```

That's it! The tests use your existing `.env` and database.

## What the Tests Do

- Create test users
- Test API endpoints
- Clean up after themselves (deletes test data)
- Use your existing database (no separate test DB needed)

## Files

- `tests/auth/register.spec.js` - 23 tests for registration
- `tests/utils/testHelpers.js` - Helper functions
- `tests/utils/appFactory.js` - App setup
- `tests/setup.js` - Auto cleanup

**Note:** Tests automatically clean up all users from the database after each test, so your database stays clean.

