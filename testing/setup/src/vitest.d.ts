import type { CustomMatchers as JestExtendedMatchers } from 'jest-extended';
import type {
  CustomAsymmetricPathMatchers,
  CustomPathMatchers,
} from './lib/extend/path.matcher.js';

declare module 'vitest' {
  interface Assertion extends CustomPathMatchers, JestExtendedMatchers {}

  interface AsymmetricMatchersContaining
    extends CustomAsymmetricPathMatchers,
      JestExtendedMatchers {}
  interface ExpectStatic extends JestExtendedMatchers {}
}
