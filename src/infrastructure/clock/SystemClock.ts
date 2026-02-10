import type {Clock} from '@/application/ports/Clock';

export class SystemClock implements Clock {
  nowISO(): string {
    return new Date().toISOString();
  }
}