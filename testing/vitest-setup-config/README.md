## Vitest Config Factory

Standardized Vitest configuration for the Code PushUp monorepo.

### Usage

#### Unit tests:

```typescript
import { createUnitTestConfig } from '@push-based/test-setup-config';

export default createUnitTestConfig('my-package');
```

#### Integration tests:

```typescript
import { createIntTestConfig } from '@push-based/test-setup-config';

export default createIntTestConfig('my-package');
```

#### E2E tests:

```typescript
import { createE2ETestConfig } from '@push-based/test-setup-config';

export default createE2ETestConfig('my-e2e');

// With options:
export default createE2ETestConfig('my-e2e', {
  testTimeout: 60_000,
});
```
