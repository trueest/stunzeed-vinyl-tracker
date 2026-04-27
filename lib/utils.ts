export function inchesToFeet(inches: number): number {
  return inches / 12;
}

export const ROLL_STATUS = {
  OPEN: 'open',
  CONSUMED: 'consumed',
} as const;

export type RollStatus = typeof ROLL_STATUS[keyof typeof ROLL_STATUS];
