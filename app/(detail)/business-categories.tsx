import Button from "@/src/components/button/Button";
import {
  GroupedListRow,
  GroupedListSection,
} from "@/src/components/groupedList/GroupedList";
import { Icon } from "@/src/components/Icon";
import { TextField } from "@/src/components/inputField/InputField";
import LoadingState from "@/src/components/loading/LoadingState";
import { Text } from "@/src/components/Text";
import {
  BusinessCategoryOption,
  SellerBusinessCategoryPreference,
  getCurrentBusinessCategoryOptions,
  getCurrentSellerProfileOverview,
  updateCurrentBusinessCategoryPreferences,
} from "@/src/services/profile.service";
import { Theme, useTheme } from "@/src/themes";
import { showError, showSuccess } from "@/src/utils/useToast";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DETAIL_TOP_BAR_VISIBLE_HEIGHT } from "./detail-top-bar";

type CategoryTree = {
  root: CategoryTreeNode;
  nodesByKey: Map<string, CategoryTreeNode>;
  optionsById: Map<string, BusinessCategoryOption>;
};

type CategoryTreeNode = {
  key: string;
  name: string;
  pathSegments: string[];
  category: BusinessCategoryOption | null;
  children: CategoryTreeNode[];
  descendantCategoryIds: string[];
};

type CategoryBrowserItem =
  | { type: "self"; category: BusinessCategoryOption; breadcrumb: string }
  | { type: "branch"; node: CategoryTreeNode; preview: string; selectedCount: number }
  | { type: "category"; category: BusinessCategoryOption; breadcrumb: string };

type SelectedCategoryItem = {
  id: string;
  name: string;
  breadcrumb: string;
};

export default function BusinessCategoriesScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const topContentInset = insets.top + DETAIL_TOP_BAR_VISIBLE_HEIGHT;
  const s = useMemo(
    () => createBusinessCategoriesStyles(t, insets.bottom, topContentInset),
    [insets.bottom, t, topContentInset]
  );
  const [categoryOptions, setCategoryOptions] = useState<BusinessCategoryOption[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<SellerBusinessCategoryPreference[]>([]);
  const [initialCategories, setInitialCategories] = useState<SellerBusinessCategoryPreference[]>([]);
  const [initialCategoryIds, setInitialCategoryIds] = useState<string[]>([]);
  const [categoryBrowserPath, setCategoryBrowserPath] = useState<string[]>([]);
  const [categorySearchValue, setCategorySearchValue] = useState("");
  const [didCategoryLoadFail, setDidCategoryLoadFail] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const listRef = useRef<FlatList<CategoryBrowserItem> | null>(null);
  const searchRowOffsetRef = useRef(0);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    const [profileResult, categoryResult] = await Promise.all([
      getCurrentSellerProfileOverview(),
      getCurrentBusinessCategoryOptions(),
    ]);

    if (!profileResult.ok) {
      setSelectedCategories([]);
      setInitialCategories([]);
      setInitialCategoryIds([]);
      setIsLoading(false);
      showError("No se pudo cargar el negocio", profileResult.error.message);
      return;
    }

    if (!categoryResult.ok) {
      setCategoryOptions([]);
      setDidCategoryLoadFail(true);
      showError("No se pudieron cargar las categorías", categoryResult.error.message);
    } else {
      setCategoryOptions(categoryResult.data);
      setDidCategoryLoadFail(false);
    }

    const nextSelectedCategories = profileResult.data.business?.categoryPreferences ?? [];
    setSelectedCategories(nextSelectedCategories);
    setInitialCategories(nextSelectedCategories);
    setInitialCategoryIds(nextSelectedCategories.map((preference) => preference.categoryId));
    setCategoryBrowserPath([]);
    setCategorySearchValue("");
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadCategories();
      return () => {};
    }, [loadCategories])
  );

  const categoryTree = useMemo(() => buildCategoryTree(categoryOptions), [categoryOptions]);
  const selectedCategoryIds = useMemo(
    () => new Set(selectedCategories.map((preference) => preference.categoryId)),
    [selectedCategories]
  );
  const selectedCategoryRows = useMemo(
    () => getSelectedCategoryRows(selectedCategories, categoryTree),
    [selectedCategories, categoryTree]
  );
  const categoryBrowserItems = useMemo(
    () => getCategoryBrowserItems(
      categoryTree,
      categoryBrowserPath,
      selectedCategoryIds,
      categorySearchValue
    ),
    [categoryBrowserPath, categorySearchValue, categoryTree, selectedCategoryIds]
  );
  const currentCategoryNode = getCategoryNode(categoryTree, categoryBrowserPath);
  const categoryBrowserTitle = getCategoryBrowserTitle(categoryTree, currentCategoryNode);
  const selectedSectionTitle = `Seleccionadas (${selectedCategoryRows.length})`;
  const categoryBrowserSectionTitle = categorySearchValue.trim().length > 0
    ? "Resultados"
    : categoryBrowserTitle;
  const hasCategoryChanges = haveCategoryIdsChanged(
    initialCategoryIds,
    selectedCategories.map((preference) => preference.categoryId)
  );

  const addCategory = useCallback((category: BusinessCategoryOption) => {
    setSelectedCategories((current) => {
      if (current.some((preference) => preference.categoryId === category.id)) {
        return current;
      }

      return [
        ...current,
        createCategoryPreference(category),
      ];
    });
  }, []);

  const removeCategory = useCallback((categoryId: string) => {
    setSelectedCategories((current) =>
      current.filter((preference) => preference.categoryId !== categoryId)
    );
  }, []);

  const toggleCategory = useCallback((category: BusinessCategoryOption) => {
    if (selectedCategoryIds.has(category.id)) {
      removeCategory(category.id);
      return;
    }

    addCategory(category);
  }, [addCategory, removeCategory, selectedCategoryIds]);

  const discardCategoryChanges = () => {
    setSelectedCategories(initialCategories);
  };

  const saveCategoryPreferences = async () => {
    if (!hasCategoryChanges || isSaving) return;

    const nextCategoryIds = selectedCategories.map((preference) => preference.categoryId);
    setIsSaving(true);
    try {
      const result = await updateCurrentBusinessCategoryPreferences(nextCategoryIds);

      if (!result.ok) {
        showError("No se pudieron actualizar las categorías", result.error.message);
        return;
      }

      const reconciledCategories = buildPreferencesFromCategoryIds(
        result.data.categoryIds,
        selectedCategories,
        categoryTree
      );
      setSelectedCategories(reconciledCategories);
      setInitialCategories(reconciledCategories);
      setInitialCategoryIds(result.data.categoryIds);
      showSuccess("Categorías actualizadas");
      router.back();
    } catch {
      showError("No se pudieron actualizar las categorías");
    } finally {
      setIsSaving(false);
    }
  };

  const getEmptyCategoryBrowserCopy = () => {
    if (didCategoryLoadFail) {
      return "No se pudieron cargar las categorías para agregar.";
    }

    if (categoryOptions.length === 0) {
      return "No hay categorías disponibles.";
    }

    if (categorySearchValue.trim().length > 0) {
      return "No hay categorías que coincidan con tu búsqueda.";
    }

    return "No hay categorías disponibles aquí.";
  };

  const scrollToCategorySearch = useCallback(() => {
    const scrollToSearch = () => {
      listRef.current?.scrollToOffset({
        offset: Math.max(searchRowOffsetRef.current - t.spacing.md, 0),
        animated: true,
      });
    };

    requestAnimationFrame(scrollToSearch);
    setTimeout(scrollToSearch, 250);
  }, [t.spacing.md]);

  const handleCategorySearchFocus = useCallback(() => {
    scrollToCategorySearch();
  }, [scrollToCategorySearch]);

  if (isLoading) {
    return <LoadingState label="Cargando categorías..." style={s.loadingBox} />;
  }

  return (
    <KeyboardAvoidingView
      style={s.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={s.screen}>
        <FlatList
          ref={listRef}
          data={[] as CategoryBrowserItem[]}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.content}
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          ListHeaderComponent={
            <View style={s.headerContent}>
              <GroupedListSection title={selectedSectionTitle}>
                {selectedCategoryRows.length === 0 ? (
                  <View style={s.emptyCategoryRow}>
                    <Text color="stateAnulated">Aún no has elegido categorías.</Text>
                    <Text variant="small" color="stateAnulated">
                      Selecciona las líneas de productos que vende tu negocio.
                    </Text>
                  </View>
                ) : (
                  selectedCategoryRows.map((category, index) => (
                    <SelectedCategoryRow
                      key={category.id}
                      category={category}
                      showSeparator={index < selectedCategoryRows.length - 1}
                      onRemove={() => removeCategory(category.id)}
                    />
                  ))
                )}
              </GroupedListSection>

              <View
                onLayout={(event) => {
                  searchRowOffsetRef.current = event.nativeEvent.layout.y;
                }}
              >
                <GroupedListSection title="Explorar categorías">
                  <View style={s.searchRow}>
                    <TextField
                      value={categorySearchValue}
                      onChangeText={setCategorySearchValue}
                      onFocus={handleCategorySearchFocus}
                      placeholder="Buscar categoría"
                      leftIcon="search"
                      baseContainerStyle={s.searchFieldBase}
                      inputContainerStyle={s.searchField}
                    />
                  </View>
                </GroupedListSection>
              </View>

              <GroupedListSection title={categoryBrowserSectionTitle}>
                {categorySearchValue.trim().length === 0 && categoryBrowserPath.length > 0 ? (
                  <CategoryBrowserBackRow
                    showSeparator={categoryBrowserItems.length > 0}
                    onBack={() => setCategoryBrowserPath((current) => current.slice(0, -1))}
                  />
                ) : null}

                {categoryBrowserItems.length === 0 ? (
                  <View style={s.emptyCategoryRow}>
                    <Text color="stateAnulated">
                      {getEmptyCategoryBrowserCopy()}
                    </Text>
                  </View>
                ) : (
                  categoryBrowserItems.map((item, index) => {
                    const showSeparator = index < categoryBrowserItems.length - 1;

                    if (item.type === "branch") {
                      return (
                        <CategoryBranchRow
                          key={`branch-${item.node.key}`}
                          item={item}
                          showSeparator={showSeparator}
                          onPress={() => setCategoryBrowserPath(item.node.pathSegments)}
                        />
                      );
                    }

                    return (
                      <CategoryToggleRow
                        key={`category-${item.category.id}`}
                        category={item.category}
                        breadcrumb={item.breadcrumb}
                        isSelected={selectedCategoryIds.has(item.category.id)}
                        showSeparator={showSeparator}
                        onPress={() => toggleCategory(item.category)}
                      />
                    );
                  })
                )}
              </GroupedListSection>
            </View>
          }
          renderItem={() => null}
        />

        <View style={s.footer}>
          <View style={s.footerActions}>
            {hasCategoryChanges ? (
              <View style={s.footerButton}>
                <Button
                  title="Descartar"
                  variant="white"
                  disabled={isSaving}
                  onPress={discardCategoryChanges}
                />
              </View>
            ) : null}
            <View style={s.footerButton}>
              <Button
                title={hasCategoryChanges ? "Guardar cambios" : "Sin cambios por guardar"}
                loading={isSaving}
                disabled={!hasCategoryChanges || isSaving}
                onPress={() => void saveCategoryPreferences()}
              />
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function SelectedCategoryRow({
  category,
  showSeparator,
  onRemove,
}: {
  category: SelectedCategoryItem;
  showSeparator: boolean;
  onRemove: () => void;
}) {
  const t = useTheme();
  const s = useMemo(() => createBusinessCategoriesStyles(t), [t]);

  return (
    <GroupedListRow
      icon="tag"
      label={category.name}
      description={category.breadcrumb || "Categoría completa"}
      descriptionMaxLines={2}
      showSeparator={showSeparator}
      rightAccessory={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Quitar ${category.name}`}
          hitSlop={10}
          onPress={onRemove}
          style={s.categoryActionButton}
        >
          <Icon name="trash-2" size={18} color={t.colors.stateAnulated} />
        </Pressable>
      }
    />
  );
}

function CategoryBrowserBackRow({
  showSeparator,
  onBack,
}: {
  showSeparator: boolean;
  onBack: () => void;
}) {
  return (
    <GroupedListRow
      icon="arrow-left"
      label="Volver"
      description="Nivel anterior"
      showChevron={false}
      showSeparator={showSeparator}
      accessibilityLabel="Volver al nivel anterior"
      onPress={onBack}
    />
  );
}

function CategoryBranchRow({
  item,
  showSeparator,
  onPress,
}: {
  item: Extract<CategoryBrowserItem, { type: "branch" }>;
  showSeparator: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const s = useMemo(() => createBusinessCategoriesStyles(t), [t]);
  const selectedCopy = item.selectedCount === 1
    ? "1 seleccionada"
    : `${item.selectedCount} seleccionadas`;

  return (
    <GroupedListRow
      icon="folder-closed"
      label={item.node.name}
      description={item.preview}
      descriptionMaxLines={2}
      showSeparator={showSeparator}
      showChevron
      accessibilityLabel={`${item.node.name}${item.selectedCount > 0 ? `, ${selectedCopy}` : ""}`}
      onPress={onPress}
      rightAccessory={item.selectedCount > 0 ? (
        <View style={s.countPill}>
          <Text variant="small" color="primary">
            {item.selectedCount}
          </Text>
        </View>
      ) : null}
    />
  );
}

function CategoryToggleRow({
  category,
  breadcrumb,
  isSelected,
  showSeparator,
  onPress,
}: {
  category: BusinessCategoryOption;
  breadcrumb: string;
  isSelected: boolean;
  showSeparator: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const s = useMemo(() => createBusinessCategoriesStyles(t), [t]);

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      accessibilityLabel={`${category.name}${breadcrumb ? `, ${breadcrumb}` : ""}`}
      onPress={onPress}
      style={[s.categoryRow, showSeparator ? s.categoryRowWithSeparator : null]}
    >
      <View style={s.categoryIcon}>
        <Icon name="tag" size={20} color={t.colors.stateAnulated} />
      </View>
      <View style={s.rowText}>
        <Text variant="body" style={s.categoryLabel} maxLines={2}>
          {category.name}
        </Text>
        <Text variant="small" color="stateAnulated" maxLines={2}>
          {breadcrumb || "Categoría completa"}
        </Text>
      </View>
      <View style={[s.toggleIndicator, isSelected && s.toggleIndicatorSelected]}>
        {isSelected ? <Icon name="check" size={16} color={t.colors.backgroudWhite} /> : null}
      </View>
    </Pressable>
  );
}

function buildCategoryTree(options: BusinessCategoryOption[]): CategoryTree {
  const nodesByKey = new Map<string, CategoryTreeNode>();
  const optionsById = new Map<string, BusinessCategoryOption>();
  const categoryNameByPathKey = new Map<string, string>();
  const root: CategoryTreeNode = {
    key: "",
    name: "Todas las categorías",
    pathSegments: [],
    category: null,
    children: [],
    descendantCategoryIds: [],
  };

  nodesByKey.set(root.key, root);

  for (const option of options) {
    optionsById.set(option.id, option);
    const pathSegments = getCategoryPathSegments(option);
    categoryNameByPathKey.set(getCategoryPathKey(pathSegments), option.name);
  }

  const sortedOptions = [...options].sort(compareCategoryOptions);
  for (const option of sortedOptions) {
    const pathSegments = getCategoryPathSegments(option);

    pathSegments.forEach((segment, index) => {
      const nodePath = pathSegments.slice(0, index + 1);
      const nodeKey = getCategoryPathKey(nodePath);
      const parentPath = pathSegments.slice(0, index);
      const parentKey = getCategoryPathKey(parentPath);
      const parent = nodesByKey.get(parentKey) ?? root;
      let node = nodesByKey.get(nodeKey);

      if (!node) {
        node = {
          key: nodeKey,
          name: categoryNameByPathKey.get(nodeKey) ?? humanizePathSegment(segment),
          pathSegments: nodePath,
          category: null,
          children: [],
          descendantCategoryIds: [],
        };
        nodesByKey.set(nodeKey, node);
        parent.children.push(node);
      }

      if (index === pathSegments.length - 1) {
        node.name = option.name;
        node.category = option;
      }
    });
  }

  sortCategoryTree(root);
  assignDescendantCategoryIds(root);

  return { root, nodesByKey, optionsById };
}

function getCategoryBrowserItems(
  tree: CategoryTree,
  path: string[],
  selectedCategoryIds: Set<string>,
  searchValue: string
): CategoryBrowserItem[] {
  const normalizedSearch = normalizeSearchText(searchValue);
  if (normalizedSearch) {
    return [...tree.optionsById.values()]
      .filter((category) => {
        const breadcrumb = getCategoryBreadcrumb(category, tree, true);
        const searchableText = normalizeSearchText(
          `${category.name} ${breadcrumb} ${category.path ?? ""}`
        );
        return searchableText.includes(normalizedSearch);
      })
      .sort(compareCategoryOptions)
      .map((category) => ({
        type: "category",
        category,
        breadcrumb: getCategoryBreadcrumb(category, tree, false),
      }));
  }

  const currentNode = getCategoryNode(tree, path);
  const items: CategoryBrowserItem[] = [];

  if (currentNode.category) {
    items.push({
      type: "self",
      category: currentNode.category,
      breadcrumb: currentNode.pathSegments.length > 1
        ? getCategoryBreadcrumb(currentNode.category, tree, false)
        : "Categoría completa",
    });
  }

  for (const child of currentNode.children) {
    if (child.children.length > 0) {
      items.push({
        type: "branch",
        node: child,
        preview: getBranchPreview(child),
        selectedCount: child.descendantCategoryIds.filter((id) => selectedCategoryIds.has(id)).length,
      });
      continue;
    }

    if (child.category) {
      items.push({
        type: "category",
        category: child.category,
        breadcrumb: getCategoryBreadcrumb(child.category, tree, false),
      });
    }
  }

  return items;
}

function getSelectedCategoryRows(
  preferences: SellerBusinessCategoryPreference[],
  tree: CategoryTree
): SelectedCategoryItem[] {
  return preferences
    .map((preference) => {
      const option = tree.optionsById.get(preference.categoryId);
      return {
        id: preference.categoryId,
        name: option?.name ?? preference.categoryName,
        breadcrumb: option
          ? getCategoryBreadcrumb(option, tree, false)
          : formatStoredCategoryBreadcrumb(preference.categoryPath, preference.categoryName),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function buildPreferencesFromCategoryIds(
  categoryIds: string[],
  currentPreferences: SellerBusinessCategoryPreference[],
  tree: CategoryTree
) {
  const preferencesById = new Map(
    currentPreferences.map((preference) => [preference.categoryId, preference])
  );

  return categoryIds
    .map((categoryId) => {
      const option = tree.optionsById.get(categoryId);
      if (option) return createCategoryPreference(option);

      return preferencesById.get(categoryId) ?? null;
    })
    .filter((preference): preference is SellerBusinessCategoryPreference => preference !== null);
}

function createCategoryPreference(
  category: BusinessCategoryOption
): SellerBusinessCategoryPreference {
  return {
    id: `local-${category.id}`,
    categoryId: category.id,
    categoryName: category.name,
    categoryPath: category.path,
  };
}

function getCategoryNode(tree: CategoryTree, path: string[]) {
  return tree.nodesByKey.get(getCategoryPathKey(path)) ?? tree.root;
}

function getCategoryBrowserTitle(tree: CategoryTree, node: CategoryTreeNode) {
  if (node.pathSegments.length === 0) return "Todas las categorías";
  return getNodeBreadcrumb(tree, node, true);
}

function getCategoryBreadcrumb(
  category: BusinessCategoryOption,
  tree: CategoryTree,
  includeSelf: boolean
) {
  const node = tree.nodesByKey.get(getCategoryPathKey(getCategoryPathSegments(category)));
  if (!node) return formatStoredCategoryBreadcrumb(category.path, includeSelf ? "" : category.name);

  return getNodeBreadcrumb(tree, node, includeSelf);
}

function getNodeBreadcrumb(tree: CategoryTree, node: CategoryTreeNode, includeSelf: boolean) {
  const pathSegments = includeSelf ? node.pathSegments : node.pathSegments.slice(0, -1);
  return pathSegments
    .map((_, index) => {
      const key = getCategoryPathKey(pathSegments.slice(0, index + 1));
      return tree.nodesByKey.get(key)?.name ?? humanizePathSegment(pathSegments[index]);
    })
    .filter(Boolean)
    .join(" > ");
}

function formatStoredCategoryBreadcrumb(path: string | null, categoryName: string) {
  if (!path) return "";

  const segments = splitCategoryPath(path);
  const displaySegments = segments
    .map(humanizePathSegment)
    .filter((segment) => segment !== categoryName);

  return displaySegments.join(" > ");
}

function getBranchPreview(node: CategoryTreeNode) {
  const childNames = node.children.slice(0, 3).map((child) => child.name);
  if (childNames.length === 0) return "Categoría completa";

  const suffix = node.children.length > childNames.length ? "..." : "";
  return `${childNames.join(", ")}${suffix}`;
}

function getCategoryPathSegments(category: BusinessCategoryOption) {
  const segments = splitCategoryPath(category.path);
  return segments.length > 0 ? segments : [category.id];
}

function splitCategoryPath(path: string | null) {
  const value = path?.trim();
  if (!value) return [];

  const separator = value.includes(".") ? "." : "/";
  return value
    .split(separator)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function getCategoryPathKey(pathSegments: string[]) {
  return pathSegments.join(".");
}

function sortCategoryTree(node: CategoryTreeNode) {
  node.children.sort((a, b) => a.name.localeCompare(b.name, "es"));
  node.children.forEach(sortCategoryTree);
}

function assignDescendantCategoryIds(node: CategoryTreeNode) {
  const categoryIds = node.category ? [node.category.id] : [];

  for (const child of node.children) {
    assignDescendantCategoryIds(child);
    categoryIds.push(...child.descendantCategoryIds);
  }

  node.descendantCategoryIds = categoryIds;
}

function compareCategoryOptions(a: BusinessCategoryOption, b: BusinessCategoryOption) {
  const aPath = getCategoryPathSegments(a).join(".");
  const bPath = getCategoryPathSegments(b).join(".");
  const pathComparison = aPath.localeCompare(bPath, "es");
  if (pathComparison !== 0) return pathComparison;

  return a.name.localeCompare(b.name, "es");
}

function humanizePathSegment(segment: string) {
  const clean = segment
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "";

  return clean.charAt(0).toLocaleUpperCase("es") + clean.slice(1);
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function haveCategoryIdsChanged(initialIds: string[], currentIds: string[]) {
  if (initialIds.length !== currentIds.length) return true;

  const currentSet = new Set(currentIds);
  return initialIds.some((id) => !currentSet.has(id));
}

function createBusinessCategoriesStyles(t: Theme, bottomInset = 0, topContentInset = 0) {
  return StyleSheet.create({
    screen: {
      flex: 1,
    },
    content: {
      gap: t.spacing.md,
      paddingTop: topContentInset + t.spacing.sm,
      paddingBottom: 120 + bottomInset,
    },
    headerContent: {
      gap: t.spacing.lg,
    },
    loadingBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: t.spacing.sm,
      paddingTop: topContentInset,
    },
    rowText: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    categoryRow: {
      minHeight: 74,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
    },
    categoryRowWithSeparator: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: "rgba(0,0,0,0.08)",
    },
    emptyCategoryRow: {
      minHeight: 64,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm,
      justifyContent: "center",
      gap: 2,
    },
    categoryIcon: {
      width: 32,
      minHeight: 54,
      alignItems: "center",
      justifyContent: "center",
    },
    categoryLabel: {
      flexShrink: 1,
    },
    categoryActionButton: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    searchRow: {
      minHeight: 64,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm,
      justifyContent: "center",
    },
    searchFieldBase: {
      marginBottom: 0,
    },
    searchField: {
      backgroundColor: t.colors.background,
    },
    countPill: {
      minWidth: 28,
      height: 28,
      borderRadius: 999,
      paddingHorizontal: t.spacing.xs,
      backgroundColor: t.colors.primaryLight,
      alignItems: "center",
      justifyContent: "center",
    },
    toggleIndicator: {
      width: 28,
      height: 28,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: t.colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    toggleIndicatorSelected: {
      borderColor: t.colors.primary,
      backgroundColor: t.colors.primary,
    },
    footer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingTop: t.spacing.sm,
      paddingHorizontal: t.spacing.md,
      paddingBottom: Math.max(bottomInset, t.spacing.md) + t.spacing.sm,
      backgroundColor: t.colors.background,
    },
    footerActions: {
      flexDirection: "row",
      gap: t.spacing.sm,
    },
    footerButton: {
      flex: 1,
    },
  });
}
