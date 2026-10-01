/**
 * The shapes `ListToolbar` and `FilterSheet` share.
 *
 * Every list screen narrowed itself with its own row of PillSelects - three on
 * Monthly Income, two on Rooms and rates, one on Repairs - each laid out its
 * own way, and the "By cluster / As a list" switch was full width on Tenants
 * and not on Monthly Income. Sean, 2026-10-01: one toolbar everywhere, the
 * switch on top, a search bar under it, and every filter behind one filter
 * button, even where there is only one filter, for consistency.
 *
 * A screen describes its filters with `ToolbarFilter` and keeps its own refs:
 * the toolbar never owns the filter state, so every computed, URL query and
 * Excel export that already reads those refs keeps reading them.
 */
import type { Component } from 'vue';

export type FilterValue = string | number;
export type FilterDraft = Record<string, FilterValue>;

/** Every option shape PillSelect accepts, so a screen's existing lists pass straight through. */
export type FilterOption =
  | string
  | number
  | { value: FilterValue; label: string; count?: number | string }
  | { key: FilterValue; label: string; count?: number | string }
  | { val: FilterValue; label: string; count?: number | string };

export interface ToolbarFilter {
  key: string;
  /** The visible label above the select in the filter dialog. */
  label: string;
  /** The value in force now - the screen's own ref, read. */
  value: FilterValue;
  /** What Reset goes back to, and what counts as "not filtered". */
  defaultValue: FilterValue;
  /**
   * The options, or a function of the dialog's draft when they depend on
   * another filter (a cluster count that answers to the year being picked).
   */
  options: readonly FilterOption[] | ((draft: FilterDraft) => readonly FilterOption[]);
  /** Shown only while this holds for the draft (Tenants: Month only once a year is picked). */
  when?: (draft: FilterDraft) => boolean;
}

export interface ToolbarView<V extends string = string> {
  value: V;
  label: string;
  icon?: Component;
}

export interface NormalOption {
  value: FilterValue;
  label: string;
  count?: number | string;
}

/** The same normalisation PillSelect does, so a label read here matches the one it shows. */
export function normalizeOptions(options: readonly FilterOption[]): NormalOption[] {
  return options.map((opt) => {
    if (typeof opt === 'string' || typeof opt === 'number') return { value: opt, label: String(opt) };
    const item = opt as Record<string, unknown>;
    const value = (item.value ?? item.key ?? item.val ?? item.label) as FilterValue;
    return { value, label: String(item.label ?? value), count: item.count as number | string | undefined };
  });
}

export function optionsFor(filter: ToolbarFilter, draft: FilterDraft): NormalOption[] {
  return normalizeOptions(typeof filter.options === 'function' ? filter.options(draft) : filter.options);
}

export function isShown(filter: ToolbarFilter, draft: FilterDraft): boolean {
  return filter.when ? filter.when(draft) : true;
}

export function same(a: FilterValue, b: FilterValue): boolean {
  return String(a) === String(b);
}
