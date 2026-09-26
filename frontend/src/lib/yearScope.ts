import { ref, watch } from 'vue';

const KEY = 'hivelet.pickedYear';

function stored(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

// null until the owner picks a year; 'All' or 'YYYY' after, shared by the Overview and both ledgers.
export const pickedYear = ref<string | null>(stored());

watch(pickedYear, (year) => {
  try {
    if (year === null) sessionStorage.removeItem(KEY);
    else sessionStorage.setItem(KEY, year);
  } catch {}
});
