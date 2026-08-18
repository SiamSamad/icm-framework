// playwright/api/config/env.ts
// Barrel. Composes the shared module and every service module into the single
// `env` object that test files import. Adding a service adds one import, one
// descriptor spread, and one type to the cast — nothing else here ever changes.
//
// Never spread or Object.assign the modules themselves: both invoke every getter
// at import time, which throws on the first missing variable and breaks
// `playwright test --list`. Copying property descriptors keeps every getter lazy,
// so listing and filtering tests works with no .env present at all.

import { sharedEnv } from './env.shared';
import { orderServiceEnv } from './env.order-service';

export const env = Object.defineProperties({}, {
  ...Object.getOwnPropertyDescriptors(sharedEnv),
  ...Object.getOwnPropertyDescriptors(orderServiceEnv),
}) as typeof sharedEnv & typeof orderServiceEnv;
