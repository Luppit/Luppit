import { Icon } from "@/src/components/Icon";
import OtpValidator from "@/src/components/otpValidator/OtpValidator";
import { Text } from "@/src/components/Text";
import {
  closePopup,
  PopupOption,
  PopupSummaryAction,
  PopupSummaryConfig,
  subscribePopup,
} from "@/src/services/popup.service";
import { useTheme } from "@/src/themes";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createGlobalPopupStyles } from "./styles";

const ANIMATION_DURATION = 220;

export default function GlobalPopupHost() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => createGlobalPopupStyles(t), [t]);
  const [options, setOptions] = useState<PopupOption[]>([]);
  const [summaryConfig, setSummaryConfig] = useState<PopupSummaryConfig | null>(null);
  const [dismissOnBackdropPress, setDismissOnBackdropPress] = useState(true);
  const [isMounted, setMounted] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const translateY = useRef(new Animated.Value(28)).current;
  const opacity = useRef(new Animated.Value(0)).current;

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
            toValue: 28,
            duration: ANIMATION_DURATION,
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (finished) {
            setMounted(false);
            setOptions([]);
            setSummaryConfig(null);
          }
        });
        return;
      }

      if (config.type === "summary") {
        setSummaryConfig(config);
        setOptions([]);
      } else {
        setSummaryConfig(null);
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
  }, [opacity, translateY]);

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

  const handleSummaryActionPress = (action: PopupSummaryAction) => {
    closePopup();
    action.onPress?.();
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
              >
              <View style={s.indicator} />
              {summaryConfig ? (
                <>
                  <View style={s.section}>
                    <View style={s.summaryHeaderBlock}>
                      <View style={s.summaryHeader}>
                        <Text variant="label" style={s.summaryTitle}>
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
                          if (input.kind !== "otp") return null;
                          return (
                            <OtpValidator
                              key={input.id}
                              label={input.label}
                              helperText={input.helper_text}
                              otpLength={input.otp_length ?? 4}
                              onChange={(value) => input.onValueChange?.(value)}
                            />
                          );
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
