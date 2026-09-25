export interface Segment {
  label: string;
  value: number;
  tone: 'brand' | 'bright' | 'night' | 'hatch' | 'soft' | 'faint';
}

/**
 * The four things a month can be. They are drawn differently because they mean
 * different things, and a chart that draws them alike tells the reader a gap is
 * a zero:
 *   recorded   - entries exist; the value is their sum
 *   unentered  - the month has passed and nothing is entered yet
 *   expected   - a future month with a basis for an estimate
 *   future     - a future month with nothing to estimate from
 */
export type MonthKind = 'recorded' | 'unentered' | 'expected' | 'future';

export interface CapsuleMonth {
  short: string;
  long: string;
  value: number | null;
  kind: MonthKind;
}

export interface ArcUnit {
  code: string;
  cluster: string;
  occupied: boolean;
}
