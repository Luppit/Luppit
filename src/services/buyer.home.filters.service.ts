export type BuyerHomeFilters = {
  searchValue: string;
  startDate: string;
  endDate: string;
  selectedChipIds: string[];
};

export const EMPTY_BUYER_HOME_FILTERS: BuyerHomeFilters = {
  searchValue: "",
  startDate: "",
  endDate: "",
  selectedChipIds: [],
};

type BuyerHomeFiltersListener = (filters: BuyerHomeFilters) => void;

const listeners = new Set<BuyerHomeFiltersListener>();
let currentFilters: BuyerHomeFilters = EMPTY_BUYER_HOME_FILTERS;

function normalizeFilters(filters: BuyerHomeFilters): BuyerHomeFilters {
  return {
    searchValue: filters.searchValue.trim(),
    startDate: filters.startDate.trim(),
    endDate: filters.endDate.trim(),
    selectedChipIds: Array.from(
      new Set(
        filters.selectedChipIds
          .map((value) => value.trim())
          .filter((value) => value.length > 0)
      )
    ),
  };
}

function emit() {
  listeners.forEach((listener) => listener(currentFilters));
}

export function getBuyerHomeFilters() {
  return currentFilters;
}

export function setBuyerHomeFilters(filters: BuyerHomeFilters) {
  currentFilters = normalizeFilters(filters);
  emit();
}

export function clearBuyerHomeFilters() {
  currentFilters = EMPTY_BUYER_HOME_FILTERS;
  emit();
}

export function subscribeBuyerHomeFilters(listener: BuyerHomeFiltersListener) {
  listeners.add(listener);
  listener(currentFilters);
  return () => {
    listeners.delete(listener);
  };
}

export function hasBuyerHomeFilters(filters: BuyerHomeFilters) {
  return Boolean(
    filters.searchValue ||
      filters.startDate ||
      filters.endDate ||
      filters.selectedChipIds.length > 0
  );
}
