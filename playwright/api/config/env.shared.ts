// playwright/api/config/env.shared.ts
// Environment values read by more than one service.
//
// A variable belongs here ONLY once a second service actually reads it. Until
// then it belongs to the single service that reads it. Never promote a variable
// here in anticipation — moving it when the second reader arrives is a two-file
// edit, while guessing wrong splits ownership for a reader that never comes.
//
// Empty is the correct state when no variable has two readers yet. The module
// exists from the start so the barrel is wired once and a future shared variable
// costs a one-file edit rather than a restructure.

import { required } from './required';

export const sharedEnv = {
  // get EXAMPLE_SHARED_VALUE() { return required('EXAMPLE_SHARED_VALUE'); },
};
