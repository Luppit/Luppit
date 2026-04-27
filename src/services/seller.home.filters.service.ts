export type SellerHomeInteractionState = "new" | "opened" | "discarded";

export type SellerHomeFilters = {
  searchValue: string;
  startDate: string;
  endDate: string;
  selectedCategoryIds: string[];
  selectedInteractionStates: SellerHomeInteractionState[];
};

export const EMPTY_SELLER_HOME_FILTERS: SellerHomeFilters = {
  searchValue: "",
  startDate: "",
  endDate: "",
  selectedCategoryIds: [],
  selectedInteractionStates: [],
};

type SellerHomeFiltersListener = (filters: SellerHomeFilters) => void;

const listeners = new Set<SellerHomeFiltersListener>();
let currentFilters: SellerHomeFilters = EMPTY_SELLER_HOME_FILTERS;

const SELLER_INTERACTION_STATES = new Set<SellerHomeInteractionState>([
  "new",
  "opened",
  "discarded",
]);

function normalizeStringList(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))
  );
}

function normalizeInteractionStates(values: SellerHomeInteractionState[]) {
  return normalizeStringList(values).filter((value): value is SellerHomeInteractionState =>
    SELLER_INTERACTION_STATES.has(value as SellerHomeInteractionState)
  );
}

function normalizeFilters(filters: SellerHomeFilters): SellerHomeFilters {
  return {
    searchValue: filters.searchValue.trim(),
    startDate: filters.startDate.trim(),
    endDate: filters.endDate.trim(),
    selectedCategoryIds: normalizeStringList(filters.selectedCategoryIds),
    selectedInteractionStates: normalizeInteractionStates(filters.selectedInteractionStates),
  };
}

function emit() {
  listeners.forEach((listener) => listener(currentFilters));
}

export function getSellerHomeFilters() {
  return currentFilters;
}

export function setSellerHomeFilters(filters: SellerHomeFilters) {
  currentFilters = normalizeFilters(filters);
  emit();
}

export function clearSellerHomeFilters() {
  currentFilters = EMPTY_SELLER_HOME_FILTERS;
  emit();
}

export function subscribeSellerHomeFilters(listener: SellerHomeFiltersListener) {
  listeners.add(listener);
  listener(currentFilters);
  return () => {
    listeners.delete(listener);
  };
}

export function hasSellerHomeFilters(filters: SellerHomeFilters) {
  return Boolean(
    filters.searchValue ||
      filters.startDate ||
      filters.endDate ||
      filters.selectedCategoryIds.length > 0 ||
      filters.selectedInteractionStates.length > 0
  );
}
