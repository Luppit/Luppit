import { Icon } from "@/src/components/Icon";
import GlassSurface from "@/src/components/glass/GlassSurface";
import { TextField } from "@/src/components/inputField/InputField";
import OtpValidator from "@/src/components/otpValidator/OtpValidator";
import RatingInput from "@/src/components/popup/RatingInput";
import StatusChip from "@/src/components/statusChip/StatusChip";
import { Text } from "@/src/components/Text";
import {
  closePopup,
  PopupFilterConfig,
  PopupHelperConfig,
  PopupOption,
  PopupProfileSwitcherConfig,
  PopupSortConfig,
  PopupSummaryAction,
  PopupSummaryConfig,
  PopupSummaryInput,
  subscribePopup,
} from "@/src/services/popup.service";
import { useTheme } from "@/src/themes";
import React, { useEffect, useMemo, useRef, useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Animated,
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createGlobalPopupStyles } from "./styles";

const ANIMATION_DURATION = 220;

function parseDateValue(rawValue: string): Date | null {
  if (!rawValue) return null;
  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  return initials || "?";
}

function formatUnreadNotificationCount(count?: number) {
  const safeCount = typeof count === "number" && count > 0 ? count : 0;
  if (safeCount === 0) return "Sin notificaciones pendientes";
  if (safeCount === 1) return "Tienes 1 notificación";
  return `Tienes ${safeCount} notificaciones`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toOptionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getOtpHelperConfig(input: PopupSummaryInput): PopupHelperConfig | null {
  if (!isRecord(input.component_config)) return null;

  const rawHelper =
    input.component_config.helper_popup ?? input.component_config.helper;
  if (!isRecord(rawHelper)) return null;

  const rawSections = Array.isArray(rawHelper.sections) ? rawHelper.sections : [];
  const sections = rawSections
    .map((section, index) => {
      if (!isRecord(section)) return null;

      const title = toOptionalText(section.title);
      const subtitle = toOptionalText(section.subtitle);
      const body =
        toOptionalText(section.body) ??
        toOptionalText(section.text) ??
        toOptionalText(section.description);

      if (!title && !subtitle && !body) return null;

      return {
        id: toOptionalText(section.id) ?? `${input.id}-helper-${index}`,
        title,
        subtitle,
        body,
      };
    })
    .filter(
      (section): section is NonNullable<typeof section> => Boolean(section)
    );

  const body =
    toOptionalText(rawHelper.body) ??
    toOptionalText(rawHelper.text) ??
    toOptionalText(rawHelper.description);
  const normalizedSections =
    sections.length > 0 || !body ? sections : [{ id: `${input.id}-helper-body`, body }];

  if (normalizedSections.length === 0) return null;

  return {
    type: "helper",
    title:
      toOptionalText(rawHelper.title) ??
      toOptionalText(input.helper_text) ??
      input.label,
    subtitle: toOptionalText(rawHelper.subtitle),
    sections: normalizedSections,
    closeLabel: toOptionalText(rawHelper.close_label),
    dismissOnBackdropPress:
      typeof rawHelper.dismiss_on_backdrop_press === "boolean"
        ? rawHelper.dismiss_on_backdrop_press
        : undefined,
  };
}

export default function GlobalPopupHost() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const s = useMemo(() => createGlobalPopupStyles(t), [t]);
  const [options, setOptions] = useState<PopupOption[]>([]);
  const [filterConfig, setFilterConfig] = useState<PopupFilterConfig | null>(null);
  const [sortConfig, setSortConfig] = useState<PopupSortConfig | null>(null);
  const [summaryConfig, setSummaryConfig] = useState<PopupSummaryConfig | null>(null);
  const [helperConfig, setHelperConfig] = useState<PopupHelperConfig | null>(null);
  const [inlineHelperConfig, setInlineHelperConfig] =
    useState<PopupHelperConfig | null>(null);
  const [expandedHelperSectionIds, setExpandedHelperSectionIds] = useState<string[]>([]);
  const [profileSwitcherConfig, setProfileSwitcherConfig] =
    useState<PopupProfileSwitcherConfig | null>(null);
  const [dismissOnBackdropPress, setDismissOnBackdropPress] = useState(true);
  const [isMounted, setMounted] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [filterSearchValue, setFilterSearchValue] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [selectedFilterChipIds, setSelectedFilterChipIds] = useState<string[]>([]);
  const [selectedFilterChipGroupIds, setSelectedFilterChipGroupIds] = useState<
    Record<string, string[]>
  >({});
  const [selectedSortOptionId, setSelectedSortOptionId] = useState("");
  const [activeDateField, setActiveDateField] = useState<"start" | "end" | null>(null);
  const [pendingSummaryActionId, setPendingSummaryActionId] = useState<string | null>(
    null
  );
  const [pickerValue, setPickerValue] = useState<Date>(new Date());
  const sheetHeightRef = useRef(320);
  const translateY = useRef(new Animated.Value(28)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const canDismissPopup = dismissOnBackdropPress && pendingSummaryActionId == null;
  const summaryDescriptionMaxHeight = Math.round(windowHeight * 0.45);
  const helperContentMaxHeight = Math.round(windowHeight * 0.62);

  const resetSheetPosition = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const indicatorPanResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => canDismissPopup,
    onMoveShouldSetPanResponder: (_event, gestureState) =>
      canDismissPopup && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
    onPanResponderGrant: () => {
      translateY.stopAnimation();
      opacity.stopAnimation();
    },
    onPanResponderMove: (_event, gestureState) => {
      const nextTranslate = Math.max(gestureState.dy, 0);
      const closeTarget = Math.max(sheetHeightRef.current + insets.bottom, 320);
      translateY.setValue(nextTranslate);
      opacity.setValue(Math.max(0, 1 - nextTranslate / closeTarget));
    },
    onPanResponderRelease: (_event, gestureState) => {
      const dismissThreshold = Math.min(Math.max(sheetHeightRef.current * 0.2, 72), 140);
      if (
        canDismissPopup &&
        (gestureState.dy >= dismissThreshold || gestureState.vy >= 1.2)
      ) {
        closePopup();
        return;
      }
      resetSheetPosition();
    },
    onPanResponderTerminate: () => {
      resetSheetPosition();
    },
  });

  useEffect(() => {
    return subscribePopup(({ config }) => {
      if (!config) {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: ANIMATION_DURATION,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: Math.max(sheetHeightRef.current + insets.bottom, 320),
            duration: ANIMATION_DURATION,
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished) {
            setMounted(false);
            setOptions([]);
            setFilterConfig(null);
            setSortConfig(null);
            setSummaryConfig(null);
            setHelperConfig(null);
            setInlineHelperConfig(null);
            setExpandedHelperSectionIds([]);
            setProfileSwitcherConfig(null);
            setPendingSummaryActionId(null);
          }
        });
        return;
      }

      setInlineHelperConfig(null);
      setExpandedHelperSectionIds([]);
      if (config.type === "summary") {
        setSummaryConfig(config);
        setHelperConfig(null);
        setProfileSwitcherConfig(null);
        setFilterConfig(null);
        setSortConfig(null);
        setOptions([]);
      } else if (config.type === "helper") {
        setSummaryConfig(null);
        setHelperConfig(config);
        setProfileSwitcherConfig(null);
        setFilterConfig(null);
        setSortConfig(null);
        setOptions([]);
      } else if (config.type === "filters") {
        setSummaryConfig(null);
        setHelperConfig(null);
        setProfileSwitcherConfig(null);
        setFilterConfig(config);
        setSortConfig(null);
        setOptions([]);
        setFilterSearchValue(config.searchField?.initialValue ?? "");
        setFilterStartDate(config.dateRangeField?.initialStartValue ?? "");
        setFilterEndDate(config.dateRangeField?.initialEndValue ?? "");
        setSelectedFilterChipIds(config.chipGroup?.initialSelectedIds ?? []);
        setSelectedFilterChipGroupIds(
          (config.chipGroups ?? []).reduce<Record<string, string[]>>((acc, group) => {
            const groupId = group.id?.trim();
            if (!groupId) return acc;
            acc[groupId] = group.initialSelectedIds ?? [];
            return acc;
          }, {})
        );
        setActiveDateField(null);
      } else if (config.type === "sort") {
        setSummaryConfig(null);
        setHelperConfig(null);
        setProfileSwitcherConfig(null);
        setFilterConfig(null);
        setSortConfig(config);
        setOptions([]);
        setSelectedSortOptionId(config.initialSelectedId ?? config.options[0]?.id ?? "");
      } else if (config.type === "profileSwitcher") {
        setSummaryConfig(null);
        setHelperConfig(null);
        setProfileSwitcherConfig(config);
        setFilterConfig(null);
        setSortConfig(null);
        setOptions([]);
      } else {
        setSummaryConfig(null);
        setHelperConfig(null);
        setProfileSwitcherConfig(null);
        setFilterConfig(null);
        setSortConfig(null);
        setOptions(config.options);
      }
      setDismissOnBackdropPress(config.dismissOnBackdropPress ?? true);
      setPendingSummaryActionId(null);
      setMounted(true);
      opacity.setValue(0);
      translateY.setValue(28);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [insets.bottom, opacity, translateY]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleOptionPress = (option: PopupOption) => {
    closePopup();
    option.onPress?.();
  };

  const handleSortOptionPress = (optionId: string) => {
    setSelectedSortOptionId(optionId);
    sortConfig?.onSelect?.(optionId);
    closePopup();
  };

  const handleProfileSwitcherPress = (profileIndex: number) => {
    const profile = profileSwitcherConfig?.profiles[profileIndex];
    if (!profile || profile.isActive) return;

    closePopup();
    void profile.onPress?.();
  };

  const handleSummaryActionPress = async (action: PopupSummaryAction) => {
    if (pendingSummaryActionId) return;

    setPendingSummaryActionId(action.id);
    try {
      const result = action.onPress?.();
      let shouldClose = result !== false;
      if (result && typeof (result as Promise<void | boolean>).then === "function") {
        const resolvedResult = await result;
        shouldClose = resolvedResult !== false;
      }
      if (shouldClose) {
        closePopup();
      }
    } finally {
      setPendingSummaryActionId(null);
    }
  };

  const toggleHelperSection = (sectionId: string) => {
    setExpandedHelperSectionIds((current) =>
      current.includes(sectionId)
        ? current.filter((value) => value !== sectionId)
        : [...current, sectionId]
    );
  };

  const renderSummaryDescription = () => {
    if (!summaryConfig?.description) return null;

    const description = (
      <Text variant="body" style={s.summaryDescription}>
        {summaryConfig.description}
      </Text>
    );

    if (!summaryConfig.descriptionScroll) return description;

    return (
      <ScrollView
        style={[s.summaryDescriptionScroll, { maxHeight: summaryDescriptionMaxHeight }]}
        contentContainerStyle={s.summaryDescriptionScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {description}
      </ScrollView>
    );
  };

  const renderHelperContent = (
    config: PopupHelperConfig,
    onClose: () => void,
    scrollMaxHeight = helperContentMaxHeight,
    actions?: PopupSummaryAction[]
  ) => (
    <>
      <View style={s.section}>
        <View style={s.summaryHeaderBlock}>
          <View style={s.summaryHeader}>
            <Text variant="subtitle" style={s.summaryTitle}>
              {config.title}
            </Text>
          </View>
          <View style={s.summaryHeaderSeparator} />
        </View>

        {config.subtitle ? (
          <Text variant="body" style={s.summaryDescription}>
            {config.subtitle}
          </Text>
        ) : null}

        <ScrollView
          style={[s.helperContentScroll, { maxHeight: scrollMaxHeight }]}
          contentContainerStyle={s.helperContentScrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          <View style={s.helperSectionsList}>
            {config.sections.map((section, index) => {
              const sectionId = section.id ?? `${config.title}-${index}`;
              const body = section.body ?? section.text;
              const title = section.title ?? section.subtitle ?? body ?? "";
              const answerSubtitle = section.title ? section.subtitle : undefined;
              const answerBody = section.title ? body : section.subtitle ? body : undefined;
              const hasAnswer = Boolean(answerSubtitle || answerBody);
              const isExpanded = expandedHelperSectionIds.includes(sectionId);

              return (
                <React.Fragment key={sectionId}>
                  {index > 0 ? <View style={s.helperRowSeparator} /> : null}
                  <View style={s.helperSectionBlock}>
                    <Pressable
                      disabled={!hasAnswer}
                      style={s.helperSectionHeader}
                      onPress={() => toggleHelperSection(sectionId)}
                      accessibilityRole={hasAnswer ? "button" : undefined}
                      accessibilityState={hasAnswer ? { expanded: isExpanded } : undefined}
                    >
                      <Text variant="subtitleRegular" style={s.helperSectionTitle}>
                        {title}
                      </Text>
                      {hasAnswer ? (
                        <Icon
                          name={isExpanded ? "chevron-down" : "chevron-right"}
                          size={20}
                          color={t.colors.stateAnulated}
                        />
                      ) : null}
                    </Pressable>

                    {isExpanded ? (
                      <View style={s.helperSectionAnswer}>
                        {answerSubtitle ? (
                          <Text variant="body" style={s.helperSectionSubtitle}>
                            {answerSubtitle}
                          </Text>
                        ) : null}
                        {answerBody ? (
                          <Text variant="body" style={s.helperBody}>
                            {answerBody}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                </React.Fragment>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View style={s.summaryActionsRow}>
        {actions && actions.length > 0
          ? actions.slice(0, 2).map((action, index) => {
              const textColor =
                action.textColorKey != null
                  ? t.colors[action.textColorKey]
                  : t.colors.textDark;
              const iconColor =
                action.iconColorKey != null
                  ? t.colors[action.iconColorKey]
                  : textColor;
              const backgroundColor =
                action.backgroundColorKey != null
                  ? t.colors[action.backgroundColorKey]
                  : t.colors.backgroudWhite;
              const isSingle = actions.length === 1;
              const isPending = pendingSummaryActionId === action.id;
              const isDisabled = pendingSummaryActionId != null;

              return (
                <Pressable
                  key={action.id}
                  disabled={isDisabled}
                  style={[
                    s.summaryActionButton,
                    isSingle ? s.summaryActionButtonSingle : null,
                    { backgroundColor },
                    isDisabled && !isPending ? { opacity: 0.55 } : null,
                  ]}
                  onPress={() => {
                    if (index === 0) {
                      onClose();
                      return;
                    }
                    onClose();
                    void handleSummaryActionPress(action);
                  }}
                >
                  {isPending ? (
                    <ActivityIndicator size="small" color={iconColor} />
                  ) : action.icon ? (
                    <Icon name={action.icon} size={20} color={iconColor} />
                  ) : null}
                  <Text
                    variant="body"
                    style={[s.summaryActionLabel, { color: textColor }]}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              );
            })
          : (
            <Pressable
              style={[
                s.summaryActionButton,
                s.summaryActionButtonSingle,
                { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
              ]}
              onPress={onClose}
            >
              <Text
                variant="body"
                style={[s.summaryActionLabel, { color: t.colors.backgroudWhite }]}
              >
                {config.closeLabel ?? "Entendido"}
              </Text>
            </Pressable>
          )}
      </View>
    </>
  );

  const handleFilterChipPress = (chipId: string) => {
    Keyboard.dismiss();
    setSelectedFilterChipIds((current) =>
      current.includes(chipId)
        ? current.filter((value) => value !== chipId)
        : [...current, chipId]
    );
  };

  const handleFilterChipGroupPress = (groupId: string, chipId: string) => {
    Keyboard.dismiss();
    setSelectedFilterChipGroupIds((current) => {
      const groupValues = current[groupId] ?? [];
      const nextGroupValues = groupValues.includes(chipId)
        ? groupValues.filter((value) => value !== chipId)
        : [...groupValues, chipId];

      return {
        ...current,
        [groupId]: nextGroupValues,
      };
    });
  };

  const handleFilterApplyPress = () => {
    Keyboard.dismiss();
    filterConfig?.onApply?.({
      searchValue: filterSearchValue.trim(),
      startDate: filterStartDate.trim(),
      endDate: filterEndDate.trim(),
      selectedChipIds: selectedFilterChipIds,
      selectedChipGroupIds: selectedFilterChipGroupIds,
    });
    closePopup();
  };

  const handleFilterClearPress = () => {
    Keyboard.dismiss();
    setFilterSearchValue("");
    setFilterStartDate("");
    setFilterEndDate("");
    setSelectedFilterChipIds([]);
    setSelectedFilterChipGroupIds({});
    filterConfig?.onClear?.();
  };

  const openDatePicker = (field: "start" | "end") => {
    Keyboard.dismiss();
    const currentValue = field === "start" ? filterStartDate : filterEndDate;
    setPickerValue(parseDateValue(currentValue) ?? new Date());
    setActiveDateField(field);
  };

  const applyDatePickerValue = () => {
    const formatted = formatDateValue(pickerValue);
    if (activeDateField === "start") {
      setFilterStartDate(formatted);
    }
    if (activeDateField === "end") {
      setFilterEndDate(formatted);
    }
    setActiveDateField(null);
  };

  if (!isMounted) return null;

  return (
    <Modal
      transparent
      statusBarTranslucent
      visible={isMounted}
      animationType="none"
      onRequestClose={canDismissPopup ? closePopup : undefined}
    >
      <View style={StyleSheet.absoluteFillObject}>
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity }]}>
          <Pressable
            style={[s.backdrop, { opacity: 0.34 }]}
            onPress={canDismissPopup ? closePopup : undefined}
          />
        </Animated.View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <Animated.View
              style={{
                transform: [{ translateY }],
              }}
            >
              <GlassSurface
                variant="sheet"
                blur="sheet"
                highlight
                highlightStyle={s.bottomSheetHighlight}
                clipStyle={s.bottomSheetClip}
                style={[
                  s.bottomSheet,
                  {
                    paddingBottom: isKeyboardVisible
                      ? t.spacing.sm
                      : Math.max(insets.bottom, t.spacing.sm),
                  },
                ]}
                onTouchStart={Keyboard.dismiss}
                onLayout={(event) => {
                  sheetHeightRef.current = event.nativeEvent.layout.height;
                }}
              >
                <View
                  style={s.indicatorTouchArea}
                  {...indicatorPanResponder.panHandlers}
                >
                  <View style={s.indicator} />
                </View>
                {filterConfig ? (
                  <>
                    <View style={s.section}>
                      <View style={s.summaryHeaderBlock}>
                        <View style={s.summaryHeader}>
                          <Text variant="subtitle" style={s.summaryTitle}>
                            {filterConfig.title}
                          </Text>
                        </View>
                        <View style={s.summaryHeaderSeparator} />
                      </View>

                      {filterConfig.searchField ? (
                        <View style={s.filterSection}>
                          <Text variant="subtitleRegular" style={s.filterLabel}>
                            {filterConfig.searchField.label}
                          </Text>
                          <TextField
                            value={filterSearchValue}
                            onChangeText={setFilterSearchValue}
                            placeholder={filterConfig.searchField.placeholder}
                            baseContainerStyle={{ marginBottom: 0 }}
                            inputContainerStyle={s.filterInputContainer}
                            inputStyle={s.filterInput}
                          />
                        </View>
                      ) : null}

                      {filterConfig.dateRangeField ? (
                        <View style={s.filterSection}>
                          <Text variant="subtitleRegular" style={s.filterLabel}>
                            {filterConfig.dateRangeField.label}
                          </Text>
                          <View style={s.filterDateRow}>
                            <Pressable
                              style={s.filterDateField}
                              onPress={() => openDatePicker("start")}
                            >
                              <Text
                                variant="body"
                                style={s.filterDateFieldInput}
                                color={filterStartDate ? "textDark" : "stateAnulated"}
                                maxLines={1}
                              >
                                {filterStartDate || filterConfig.dateRangeField.startPlaceholder || ""}
                              </Text>
                              <Icon name="chevron-down" size={18} color={t.colors.stateAnulated} />
                            </Pressable>

                            <Pressable
                              style={s.filterDateField}
                              onPress={() => openDatePicker("end")}
                            >
                              <Text
                                variant="body"
                                style={s.filterDateFieldInput}
                                color={filterEndDate ? "textDark" : "stateAnulated"}
                                maxLines={1}
                              >
                                {filterEndDate || filterConfig.dateRangeField.endPlaceholder || ""}
                              </Text>
                              <Icon name="chevron-down" size={18} color={t.colors.stateAnulated} />
                            </Pressable>
                          </View>
                        </View>
                      ) : null}

                      {filterConfig.chipGroup ? (
                        <View style={s.filterSection}>
                          <Text variant="subtitleRegular" style={s.filterLabel}>
                            {filterConfig.chipGroup.label}
                          </Text>
                          <View style={s.filterChipsRow}>
                            {filterConfig.chipGroup.options.map((option) => {
                              const isSelected = selectedFilterChipIds.includes(option.id);

                              return (
                                <Pressable
                                  key={option.id}
                                  onPress={() => handleFilterChipPress(option.id)}
                                  style={[
                                    s.filterChip,
                                    isSelected ? s.filterChipSelected : null,
                                  ]}
                                >
                                  <Text
                                    variant="body"
                                    style={[
                                      s.filterChipLabel,
                                      isSelected ? s.filterChipLabelSelected : null,
                                    ]}
                                  >
                                    {option.label}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      ) : null}

                      {filterConfig.chipGroups?.map((group) => {
                        const groupId = group.id?.trim();
                        if (!groupId) return null;

                        return (
                          <View key={groupId} style={s.filterSection}>
                            <Text variant="subtitleRegular" style={s.filterLabel}>
                              {group.label}
                            </Text>
                            <View style={s.filterChipsRow}>
                              {group.options.map((option) => {
                                const isSelected = (selectedFilterChipGroupIds[groupId] ?? []).includes(
                                  option.id
                                );

                                return (
                                  <Pressable
                                    key={option.id}
                                    onPress={() => handleFilterChipGroupPress(groupId, option.id)}
                                    style={[
                                      s.filterChip,
                                      isSelected ? s.filterChipSelected : null,
                                    ]}
                                  >
                                    <Text
                                      variant="body"
                                      style={[
                                        s.filterChipLabel,
                                        isSelected ? s.filterChipLabelSelected : null,
                                      ]}
                                    >
                                      {option.label}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                          </View>
                        );
                      })}
                    </View>

                    <View style={s.filterActionsRow}>
                      <Pressable
                        style={[s.filterActionButton, s.filterActionButtonSecondary]}
                        onPress={handleFilterClearPress}
                      >
                        <Icon name="eraser" size={18} color={t.colors.textDark} />
                        <Text
                          variant="body"
                          style={[s.filterActionLabel, s.filterActionLabelSecondary]}
                        >
                          {filterConfig.clearLabel ?? "Limpiar"}
                        </Text>
                      </Pressable>

                      <Pressable
                        style={[s.filterActionButton, s.filterActionButtonPrimary]}
                        onPress={handleFilterApplyPress}
                      >
                        <Icon name="check" size={18} color={t.colors.backgroudWhite} />
                        <Text
                          variant="body"
                          style={[s.filterActionLabel, s.filterActionLabelPrimary]}
                        >
                          {filterConfig.applyLabel ?? "Aplicar"}
                        </Text>
                      </Pressable>
                    </View>
                  </>
                ) : helperConfig ? (
                  renderHelperContent(helperConfig, closePopup)
                ) : sortConfig ? (
                  <View style={s.section}>
                    <View style={s.summaryHeaderBlock}>
                      <View style={s.summaryHeader}>
                        <Text variant="subtitle" style={s.summaryTitle}>
                          {sortConfig.title}
                        </Text>
                      </View>
                      <View style={s.summaryHeaderSeparator} />
                    </View>

                    <View style={s.sortOptionsList}>
                      {sortConfig.options.map((option, index) => {
                        const isSelected = selectedSortOptionId === option.id;

                        return (
                          <React.Fragment key={option.id}>
                            {index > 0 ? <View style={s.sortSeparator} /> : null}
                            <Pressable
                              style={s.sortOptionButton}
                              onPress={() => handleSortOptionPress(option.id)}
                              accessibilityRole="radio"
                              accessibilityState={{ checked: isSelected }}
                            >
                              <View
                                style={[
                                  s.sortRadioOuter,
                                  isSelected ? s.sortRadioOuterSelected : null,
                                ]}
                              >
                                {isSelected ? <View style={s.sortRadioInner} /> : null}
                              </View>
                              <Text variant="body" style={s.sortOptionLabel}>
                                {option.label}
                              </Text>
                            </Pressable>
                          </React.Fragment>
                        );
                      })}
                    </View>
                  </View>
                ) : profileSwitcherConfig ? (
                  <View style={s.profileSwitcherSection}>
                    {profileSwitcherConfig.profiles.map((profile, index) => {
                      const hasUnreadNotifications =
                        typeof profile.unreadNotificationCount === "number" &&
                        profile.unreadNotificationCount > 0;

                      return (
                        <React.Fragment key={profile.id}>
                          {index > 0 ? <View style={s.profileSwitcherSeparator} /> : null}
                          <Pressable
                            disabled={profile.isActive}
                            style={[
                              s.profileSwitcherRow,
                              profile.isActive ? s.profileSwitcherRowActive : null,
                            ]}
                            onPress={() => handleProfileSwitcherPress(index)}
                            accessibilityRole="button"
                          >
                            <View style={s.profileSwitcherAvatar}>
                              <Text variant="body" maxLines={1} style={s.profileSwitcherInitials}>
                                {getInitials(profile.title)}
                              </Text>
                            </View>

                            <View style={s.profileSwitcherContent}>
                              <View style={s.profileSwitcherTitleRow}>
                                <Text variant="subtitle" maxLines={1} style={s.profileSwitcherTitle}>
                                  {profile.title}
                                </Text>
                                {profile.isActive ? <StatusChip label="Activo" /> : null}
                              </View>
                              <View style={s.profileSwitcherMetaRow}>
                                {hasUnreadNotifications ? (
                                  <View style={s.profileSwitcherMetaDot} />
                                ) : null}
                                <Text
                                  variant="body"
                                  maxLines={1}
                                  style={s.profileSwitcherMetaText}
                                >
                                  {formatUnreadNotificationCount(profile.unreadNotificationCount)}
                                </Text>
                              </View>
                            </View>
                          </Pressable>
                        </React.Fragment>
                      );
                    })}
                  </View>
                ) : summaryConfig ? (
                <>
                  <View style={s.section}>
                    <View style={s.summaryHeaderBlock}>
                      <View style={s.summaryHeader}>
                        <Text variant="subtitle" style={s.summaryTitle}>
                          {summaryConfig.title}
                        </Text>
                        {summaryConfig.icon ? (
                          <Icon name={summaryConfig.icon} size={20} color={t.colors.textDark} />
                        ) : null}
                      </View>
                      <View style={s.summaryHeaderSeparator} />
                    </View>

                    {summaryConfig.descriptionPlacement === "afterRows"
                      ? null
                      : renderSummaryDescription()}

                    {summaryConfig.rows && summaryConfig.rows.length > 0 ? (
                      <View style={s.summaryRowsList}>
                        {summaryConfig.rows.map((row) => (
                          <View key={`${row.label}-${row.value}`} style={s.summaryRowBlock}>
                            <Text variant="body" style={s.summaryRowLabel}>
                              {row.label}
                            </Text>
                            <Text variant="body" style={s.summaryRowValue}>
                              {row.value}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    {summaryConfig.descriptionPlacement === "afterRows"
                      ? renderSummaryDescription()
                      : null}

                    {summaryConfig.inputs && summaryConfig.inputs.length > 0 ? (
                      <View style={s.summaryInputsList}>
                        {summaryConfig.inputs.map((input) => {
                          if (input.kind === "otp") {
                            const helper = getOtpHelperConfig(input);

                            return (
                              <OtpValidator
                                key={input.id}
                                label={input.label}
                                helperText={input.helper_text}
                                otpLength={input.otp_length ?? 4}
                                onHelperPress={
                                  helper
                                    ? () => {
                                        Keyboard.dismiss();
                                        setExpandedHelperSectionIds([]);
                                        setInlineHelperConfig(helper);
                                      }
                                    : undefined
                                }
                                onChange={(value) => input.onValueChange?.(value)}
                              />
                            );
                          }

                          if (input.kind === "rating") {
                            return (
                              <RatingInput
                                key={input.id}
                                label={input.label}
                                helperText={input.helper_text}
                                componentConfig={input.component_config}
                                onChange={(value) => input.onValueChange?.(value)}
                              />
                            );
                          }

                          return null;
                        })}
                      </View>
                    ) : null}

                    {summaryConfig.images && summaryConfig.images.length > 0 ? (
                      <View style={s.summaryImageBlock}>
                        <Text variant="body" style={s.summaryRowLabel}>
                          Imágenes
                        </Text>
                        <View style={s.summaryImageContainer}>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={s.summaryImageScrollContent}
                          >
                            {summaryConfig.images.map((image, index) => (
                              <Pressable
                                key={`${image.uri}-${index}`}
                                style={s.summaryImageItem}
                                onPress={() => setPreviewUri(image.uri)}
                              >
                                <Image source={{ uri: image.uri }} style={s.summaryImage} />
                              </Pressable>
                            ))}
                          </ScrollView>
                        </View>
                      </View>
                    ) : null}
                  </View>

                  {summaryConfig.actions && summaryConfig.actions.length > 0 ? (
                    <View style={s.summaryActionsRow}>
                      {summaryConfig.actions.slice(0, 2).map((action) => {
                        const textColor =
                          action.textColorKey != null
                            ? t.colors[action.textColorKey]
                            : t.colors.textDark;
                        const iconColor =
                          action.iconColorKey != null
                            ? t.colors[action.iconColorKey]
                            : textColor;
                        const backgroundColor =
                          action.backgroundColorKey != null
                            ? t.colors[action.backgroundColorKey]
                            : t.colors.backgroudWhite;
                        const isSingle = summaryConfig.actions?.length === 1;
                        const isPending = pendingSummaryActionId === action.id;
                        const isDisabled = pendingSummaryActionId != null;

                        return (
                          <Pressable
                            key={action.id}
                            disabled={isDisabled}
                            style={[
                              s.summaryActionButton,
                              isSingle ? s.summaryActionButtonSingle : null,
                              { backgroundColor },
                              isDisabled && !isPending ? { opacity: 0.55 } : null,
                            ]}
                            onPress={() => handleSummaryActionPress(action)}
                          >
                            {isPending ? (
                              <ActivityIndicator size="small" color={iconColor} />
                            ) : action.icon ? (
                              <Icon name={action.icon} size={20} color={iconColor} />
                            ) : null}
                            <Text variant="body" style={[s.summaryActionLabel, { color: textColor }]}>
                              {action.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                </>
              ) : (
                options.map((option, index) => {
                  const textColor =
                    option.textColorKey != null
                      ? t.colors[option.textColorKey]
                      : t.colors.textDark;
                  const iconColor =
                    option.iconColorKey != null
                      ? t.colors[option.iconColorKey]
                      : textColor;

                  return (
                    <React.Fragment key={option.id}>
                      {index > 0 ? <View style={s.separator} /> : null}
                      <Pressable
                        onPress={() => handleOptionPress(option)}
                        style={[
                          s.optionButton,
                          option.backgroundColorKey != null
                            ? { backgroundColor: t.colors[option.backgroundColorKey] }
                            : null,
                        ]}
                      >
                        {option.icon ? (
                          <Icon name={option.icon} size={22} color={iconColor} />
                        ) : null}
                        <Text variant="body" style={[s.optionLabel, { color: textColor }]}>
                          {option.label}
                        </Text>
                      </Pressable>
                    </React.Fragment>
                  );
                })
                )}
              </GlassSurface>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </View>

      <Modal
        transparent
        visible={inlineHelperConfig != null}
        animationType="fade"
        onRequestClose={() => setInlineHelperConfig(null)}
      >
        <View style={s.helperOverlayBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => {
              if (inlineHelperConfig?.dismissOnBackdropPress ?? true) {
                setInlineHelperConfig(null);
              }
            }}
          />
          <GlassSurface
            variant="sheet"
            blur="sheet"
            highlight
            highlightStyle={s.bottomSheetHighlight}
            clipStyle={s.bottomSheetClip}
            style={[
              s.bottomSheet,
              s.helperOverlaySheet,
              { paddingBottom: Math.max(insets.bottom, t.spacing.sm) },
            ]}
          >
            <View style={s.indicatorTouchArea}>
              <View style={s.indicator} />
            </View>
            {inlineHelperConfig
              ? renderHelperContent(
                  inlineHelperConfig,
                  () => setInlineHelperConfig(null),
                  Math.round(windowHeight * 0.46),
                  summaryConfig?.actions
                )
              : null}
          </GlassSurface>
        </View>
      </Modal>

      <Modal
        transparent
        visible={activeDateField != null}
        animationType="fade"
        onRequestClose={() => setActiveDateField(null)}
      >
        <Pressable style={s.datePickerBackdrop} onPress={() => setActiveDateField(null)}>
          <Pressable onPress={(event) => event.stopPropagation()}>
            <GlassSurface
              variant="sheet"
              blur="sheet"
              highlight
              contentStyle={s.datePickerCard}
            >
              <View style={s.datePickerHeader}>
                <Text variant="subtitle">
                  {activeDateField === "start" ? "Selecciona la fecha inicial" : "Selecciona la fecha final"}
                </Text>
                <Text variant="body" color="stateAnulated">
                  {formatDateValue(pickerValue)}
                </Text>
              </View>

              <DateTimePicker
                value={pickerValue}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "calendar"}
                style={s.datePicker}
                themeVariant="light"
                textColor={t.colors.textDark}
                onChange={(_event, selectedDate) => {
                  if (selectedDate) {
                    setPickerValue(selectedDate);
                  }
                }}
              />

              <View style={s.datePickerActionsRow}>
                <Pressable
                  style={[s.filterActionButton, s.filterActionButtonSecondary]}
                  onPress={() => setActiveDateField(null)}
                >
                  <Text
                    variant="body"
                    style={[s.filterActionLabel, s.filterActionLabelSecondary]}
                  >
                    Cancelar
                  </Text>
                </Pressable>

                <Pressable
                  style={[s.filterActionButton, s.filterActionButtonPrimary]}
                  onPress={applyDatePickerValue}
                >
                  <Text
                    variant="body"
                    style={[s.filterActionLabel, s.filterActionLabelPrimary]}
                  >
                    Confirmar
                  </Text>
                </Pressable>
              </View>
            </GlassSurface>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        visible={previewUri != null}
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}
      >
        <Pressable style={s.summaryImagePreviewBackdrop} onPress={() => setPreviewUri(null)}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={s.summaryImagePreviewImage} />
          ) : null}
          <View style={s.summaryImagePreviewClose}>
            <Icon name="x" size={20} color={t.colors.backgroudWhite} />
          </View>
        </Pressable>
      </Modal>
    </Modal>
  );
}
