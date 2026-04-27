import { Icon } from "@/src/components/Icon";
import { TextField } from "@/src/components/inputField/InputField";
import OtpValidator from "@/src/components/otpValidator/OtpValidator";
import RatingInput from "@/src/components/popup/RatingInput";
import { Text } from "@/src/components/Text";
import {
  closePopup,
  PopupFilterConfig,
  PopupOption,
  PopupSortConfig,
  PopupSummaryAction,
  PopupSummaryConfig,
  subscribePopup,
} from "@/src/services/popup.service";
import { useTheme } from "@/src/themes";
import React, { useEffect, useMemo, useRef, useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Animated,
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

export default function GlobalPopupHost() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => createGlobalPopupStyles(t), [t]);
  const [options, setOptions] = useState<PopupOption[]>([]);
  const [filterConfig, setFilterConfig] = useState<PopupFilterConfig | null>(null);
  const [sortConfig, setSortConfig] = useState<PopupSortConfig | null>(null);
  const [summaryConfig, setSummaryConfig] = useState<PopupSummaryConfig | null>(null);
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
  const [pickerValue, setPickerValue] = useState<Date>(new Date());
  const sheetHeightRef = useRef(320);
  const translateY = useRef(new Animated.Value(28)).current;
  const opacity = useRef(new Animated.Value(0)).current;

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
    onStartShouldSetPanResponder: () => dismissOnBackdropPress,
    onMoveShouldSetPanResponder: (_event, gestureState) =>
      dismissOnBackdropPress && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
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
      if (gestureState.dy >= dismissThreshold || gestureState.vy >= 1.2) {
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
          }
        });
        return;
      }

      if (config.type === "summary") {
        setSummaryConfig(config);
        setFilterConfig(null);
        setSortConfig(null);
        setOptions([]);
      } else if (config.type === "filters") {
        setSummaryConfig(null);
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
        setFilterConfig(null);
        setSortConfig(config);
        setOptions([]);
        setSelectedSortOptionId(config.initialSelectedId ?? config.options[0]?.id ?? "");
      } else {
        setSummaryConfig(null);
        setFilterConfig(null);
        setSortConfig(null);
        setOptions(config.options);
      }
      setDismissOnBackdropPress(config.dismissOnBackdropPress ?? true);
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

  const handleSummaryActionPress = (action: PopupSummaryAction) => {
    closePopup();
    action.onPress?.();
  };

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
      onRequestClose={closePopup}
    >
      <View style={StyleSheet.absoluteFillObject}>
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity }]}>
          <Pressable
            style={[s.backdrop, { opacity: 0.34 }]}
            onPress={dismissOnBackdropPress ? closePopup : undefined}
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
              <View
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

                    {summaryConfig.description ? (
                      <Text variant="body" style={s.summaryDescription}>
                        {summaryConfig.description}
                      </Text>
                    ) : null}

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

                    {summaryConfig.inputs && summaryConfig.inputs.length > 0 ? (
                      <View style={s.summaryInputsList}>
                        {summaryConfig.inputs.map((input) => {
                          if (input.kind === "otp") {
                            return (
                              <OtpValidator
                                key={input.id}
                                label={input.label}
                                helperText={input.helper_text}
                                otpLength={input.otp_length ?? 4}
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

                        return (
                          <Pressable
                            key={action.id}
                            style={[
                              s.summaryActionButton,
                              isSingle ? s.summaryActionButtonSingle : null,
                              { backgroundColor },
                            ]}
                            onPress={() => handleSummaryActionPress(action)}
                          >
                            {action.icon ? (
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
                  const optionBackground =
                    option.backgroundColorKey != null
                      ? t.colors[option.backgroundColorKey]
                      : t.colors.backgroudWhite;

                  return (
                    <React.Fragment key={option.id}>
                      {index > 0 ? <View style={s.separator} /> : null}
                      <Pressable
                        onPress={() => handleOptionPress(option)}
                        style={[s.optionButton, { backgroundColor: optionBackground }]}
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
              </View>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </View>

      <Modal
        transparent
        visible={activeDateField != null}
        animationType="fade"
        onRequestClose={() => setActiveDateField(null)}
      >
        <Pressable style={s.datePickerBackdrop} onPress={() => setActiveDateField(null)}>
          <Pressable style={s.datePickerCard} onPress={(event) => event.stopPropagation()}>
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
