import {describe, it, expect} from 'vitest';
import {GreetingPolicy} from './GreetingPolicy';

describe('GreetingPolicy', () => {
  it('fallbacks to default when empty', () => {
    expect(GreetingPolicy.normalizeName('   ')).toBe('Restaurateur');
  });

  it('trims and caps length', () => {
    const long = 'a'.repeat(100);
    expect(GreetingPolicy.normalizeName(long)).toHaveLength(50);
  });
});