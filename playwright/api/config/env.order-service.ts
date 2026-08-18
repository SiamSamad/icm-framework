// playwright/api/config/env.order-service.ts
// Environment values owned by @order-service.
// Only this service's variables belong here — never add another service's.
//
// Append-only: add new variables at the end, never reorder, never delete. A
// variable no test reads is annotated, not removed — see the UNREAD note below.

import { required } from './required';

// Getters validate on access, not at import time.
// This keeps `playwright test --list` working even when no .env is present.
export const orderServiceEnv = {
  get ORDER_SERVICE_BASE_URL() { return required('ORDER_SERVICE_BASE_URL'); },
  get ORDER_SERVICE_API_KEY()  { return required('ORDER_SERVICE_API_KEY'); },

  // Data dependency: an order that already exists in the target environment, used
  // by read and update scenarios that must not create their own.
  get ORDER_SERVICE_TEST_ORDER_ID() { return required('ORDER_SERVICE_TEST_ORDER_ID'); },

  // UNREAD — declared by the Stage 01 environment_config for the catalog scenarios,
  // which are currently held (no assertable API behaviour). Kept rather than deleted:
  // deleting it is silent coverage loss, and whether it is stale is not this file's
  // call to make.
  get ORDER_SERVICE_CATALOG_ID() { return required('ORDER_SERVICE_CATALOG_ID'); },
};
