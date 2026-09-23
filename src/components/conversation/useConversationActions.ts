import type { ConversationActionButtonConfig } from "./ConversationActionButtons";
import { lucideIcons, LucideIconName } from "@/src/icons/lucide";
import {
  closePopup,
  openPopup,
  subscribePopup,
  type PopupSummaryConfig,
  PopupSummaryActionOutcome,
} from "@/src/services/popup.service";
import {
  ConversationView,
  ConversationViewAction,
  executeConversationActionByExecutor,
} from "@/src/services/conversation.service";
import {
  addCurrentBuyerPurchaseRequestFavorite,
  addCurrentSellerPurchaseRequestFavorite,
} from "@/src/services/purchase.request.service";
import {
  getActiveSellerOfferDraftMode,
  getOrCreateCurrentSellerOfferSeedConversation,
} from "@/src/services/seller.request.offers.service";
import { showError, showInfo, showSuccess, showWarning } from "@/src/utils/useToast";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

type ConversationActionFailure = {
  message: string;
  code?: string;
};

function didReissueTransactionCode(code: string | undefined) {
  return (
    code === "transaction_code_expired_new_code_sent" ||
    code === "transaction_code_not_found_new_code_sent"
  );
}

function isTransactionCodeInputError(code: string | undefined) {
  return (
    code === "invalid_transaction_code" ||
    code === "invalid_transaction_code_format" ||
    code === "otp_required"
  );
}

function openConfirmationClientTarget(target: string) {
  if (target !== "modal.email_setup") return false;

  closePopup();
  router.push({
    pathname: "/(modal)/email-setup",
    params: { title: "Configurar correo" },
  });
  return true;
}

export function normalizeOptionalIcon(icon: string | null | undefined): LucideIconName | undefined {
  if (!icon) return undefined;
  if (icon in lucideIcons) return icon as LucideIconName;
  return undefined;
}

export function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase().trim();
}

export function normalizeStyleFlags(styleCode: string | null) {
  const value = normalizeText(styleCode);
  const isDanger =
    value.includes("error") ||
    value.includes("danger") ||
    value.includes("destructive") ||
    value.includes("reject") ||
    value.includes("cancel");
  const isPrimary =
    value.includes("primary") ||
    value.includes("success") ||
    value.includes("positive") ||
    value.includes("confirm");

  return { isDanger, isPrimary };
}

export function toTopButtonConfig(action: ConversationViewAction): ConversationActionButtonConfig {
  const { isDanger, isPrimary } = normalizeStyleFlags(action.style_code);

  return {
    id: action.id,
    label: action.label || action.code || "",
    icon: normalizeOptionalIcon(action.icon) ?? "ellipsis",
    tone: isPrimary ? "primary" : isDanger ? "danger" : "secondary",
  };
}

function createClientRequestId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    const value = token === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function interpolateTemplate(
  template: string,
  context: Record<string, unknown>
) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = context[key];
    return value == null ? "" : String(value);
  });
}

function toStringValue(value: unknown) {
  if (value == null) return "-";
  if (typeof value === "string") return value;
  return String(value);
}

type RatingPayload = {
  stars: number;
  tags: string[];
  comment: string;
};

function isRatingPayload(value: unknown): value is RatingPayload {
  if (!value || typeof value !== "object") return false;
  const parsed = value as Record<string, unknown>;
  return (
    typeof parsed.stars === "number" &&
    Array.isArray(parsed.tags) &&
    typeof parsed.comment === "string"
  );
}

function didPurgeConversationResult(value: unknown, conversationId: string) {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  const purgedConversationId =
    typeof result.purged_conversation_id === "string"
      ? result.purged_conversation_id
      : typeof result.deleted_conversation_id === "string"
        ? result.deleted_conversation_id
        : null;

  return result.conversation_deleted === true || purgedConversationId === conversationId;
}

function getActionSuccessMessage(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "Acción completada";
  }

  const message = (value as Record<string, unknown>).success_message;
  return typeof message === "string" && message.trim()
    ? message.trim()
    : "Acción completada";
}

type ConversationActionsOptions = {
  conversationId: string | null;
  profileId: string | null;
  conversationView: ConversationView | null;
  refreshConversation: () => Promise<void>;
  onMessagesRefresh?: () => void | Promise<void>;
  onConversationPurged?: () => Promise<void>;
};

export function useConversationActions({
  conversationId,
  profileId,
  conversationView,
  refreshConversation,
  onMessagesRefresh,
  onConversationPurged,
}: ConversationActionsOptions) {
  const [isExecutingAction, setIsExecutingAction] = useState(false);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const isExecutingActionRef = useRef(false);
  const acceptancePopupRef = useRef<{ actionId: string; revision: string; config: PopupSummaryConfig } | null>(null);
  useEffect(() => subscribePopup(({ config }) => {
    if (config !== acceptancePopupRef.current?.config) acceptancePopupRef.current = null;
  }), []);
  useEffect(() => {
    const pending = acceptancePopupRef.current;
    if (!pending || !conversationView || isExecutingActionRef.current) return;
    const acceptance = conversationView.actions.find((action) => action.id === pending.actionId);
    if (JSON.stringify(acceptance?.confirmation?.payload_defaults) !== pending.revision) {
      acceptancePopupRef.current = null;
      closePopup();
      showWarning("La oferta cambió", "Revisa los términos actuales antes de continuar.");
    }
  }, [conversationView, isExecutingAction]);
  const purchaseRequestId = conversationView?.conversation.purchase_request_id ?? null;

  const runAction = useCallback(
    async (
      action: ConversationViewAction,
      payload?: Record<string, unknown> | null,
      onFailure?: (error: ConversationActionFailure) => void
    ) => {
      if (!conversationId || !profileId) return false;
      if (!action.code) {
        showError("Acción no disponible", "Esta acción no tiene código de ejecución.");
        return false;
      }
      if (
        !action.executor ||
        !action.executor.target.trim() ||
        (action.executor.execution_type !== "server_rpc" &&
          action.executor.execution_type !== "client_command")
      ) {
        showError(
          "Acción no disponible",
          "Esta acción tiene una configuración incompleta."
        );
        return false;
      }
      if (isExecutingActionRef.current) return false;

      isExecutingActionRef.current = true;
      setIsExecutingAction(true);
      setExecutingActionId(action.id);

      try {
        let result:
          | { ok: true; data: unknown }
          | { ok: false; error: ConversationActionFailure };

        if (action.executor?.execution_type === "server_rpc") {
          result = await executeConversationActionByExecutor({
            conversationId,
            profileId,
            actionCode: action.code,
            payload: payload ?? null,
            executor: action.executor,
          });
        } else if (action.executor?.execution_type === "client_command") {
          if (action.executor.target === "modal.offer") {
            if (!purchaseRequestId) {
              showError(
                "No se pudo abrir la oferta",
                "La conversación no tiene una solicitud asociada."
              );
              return false;
            }

            const activeDraft = await getActiveSellerOfferDraftMode(conversationId);
            if (!activeDraft.ok) {
              showError("No se pudo abrir la oferta", activeDraft.error.message);
              return false;
            }
            let draftConversationId = conversationId;
            if (activeDraft.data === "batch") {
              const seed = await getOrCreateCurrentSellerOfferSeedConversation(purchaseRequestId);
              if (!seed.ok) {
                showError("No se pudo abrir la oferta", seed.error.message);
                return false;
              }
              draftConversationId = seed.data.id;
            }

            router.push({
              pathname: "/(modal)/offer",
              params: {
                title: "Crear oferta",
                purchaseRequestId,
                conversationId: draftConversationId,
                mode: "create",
              },
            });
          } else if (action.executor.target === "modal.offer.create.new" ||
                     action.executor.target === "modal.offer.batch.new") {
            if (!purchaseRequestId) {
              showError("No se pudo abrir la oferta", "La conversación no tiene una solicitud asociada.");
              return false;
            }
            const seed = await getOrCreateCurrentSellerOfferSeedConversation(purchaseRequestId);
            if (!seed.ok) {
              showError("No se pudo abrir la oferta", seed.error.message);
              return false;
            }
            router.push({ pathname: "/(modal)/offer", params: {
              title: "Agregar otra oferta", purchaseRequestId,
              conversationId: seed.data.id, mode: "create",
            } });
          } else if (action.executor.target === "modal.offer.edit") {
            router.push({
              pathname: "/(modal)/offer",
              params: {
                title: "Modificar oferta",
                conversationId,
                mode: "edit",
                ...(purchaseRequestId ? { purchaseRequestId } : null),
              },
            });
          } else if (action.executor.target === "detail.faq") {
            router.push({
              pathname: "/(detail)/faq",
              params: { title: "Ayuda", hideMenu: "true" },
            });
          } else if (action.executor.target === "detail.seller_business") {
            router.push({
              pathname: "/(detail)/seller-business",
              params: {
                title: "Negocio",
                hideMenu: "true",
                conversationId,
              },
            });
          } else if (action.executor.target === "favorite.toggle") {
            if (!purchaseRequestId) {
              showError(
                "No se pudo agregar a favoritos",
                "La conversación no tiene una solicitud asociada."
              );
              return false;
            }

            const favoriteResult =
              conversationView?.role_code === "BUYER"
                ? await addCurrentBuyerPurchaseRequestFavorite(purchaseRequestId)
                : conversationView?.role_code === "SELLER"
                  ? await addCurrentSellerPurchaseRequestFavorite(purchaseRequestId)
                  : null;

            if (!favoriteResult) {
              showError(
                "No se pudo agregar a favoritos",
                "No pudimos determinar tu rol en esta conversación."
              );
              return false;
            }

            if (!favoriteResult.ok) {
              showError("No se pudo agregar a favoritos", favoriteResult.error.message);
              return false;
            }

            if (favoriteResult.data.alreadyExists) {
              showInfo("Ya estaba en favoritos");
            } else {
              showSuccess("Favorito agregado");
            }
          } else if (action.executor.target !== "popup.close") {
            showError(
              "Acción no disponible",
              "Esta acción tiene una configuración no reconocida."
            );
            return false;
          }
          result = { ok: true, data: null };
        } else {
          showError(
            "Acción no disponible",
            "Esta acción tiene una configuración incompleta."
          );
          return false;
        }

        if (!result.ok) {
          if (onFailure) {
            onFailure(result.error);
          } else {
            showError("No se pudo ejecutar la acción", result.error.message);
          }
          return false;
        }

        const shouldRefresh = action.executor?.requires_refresh ?? true;
        const conversationWasPurged = didPurgeConversationResult(result.data, conversationId);
        if (conversationWasPurged) {
          showSuccess(getActionSuccessMessage(result.data));
          await onConversationPurged?.();
          return true;
        }

        if (shouldRefresh) {
          await refreshConversation();
          await onMessagesRefresh?.();
        }

        if (action.executor?.execution_type !== "client_command") {
          showSuccess(getActionSuccessMessage(result.data));
        }

        return true;
      } catch {
        const error = { message: "Ocurrió un error, intenta de nuevo." };
        if (onFailure) {
          onFailure(error);
        } else {
          showError("No se pudo ejecutar la acción", error.message);
        }
        return false;
      } finally {
        isExecutingActionRef.current = false;
        setIsExecutingAction(false);
        setExecutingActionId(null);
      }
    },
    [
      onConversationPurged,
      onMessagesRefresh,
      conversationId,
      profileId,
      conversationView?.role_code,
      purchaseRequestId,
      refreshConversation,
    ]
  );

  const handleActionPress = useCallback(
    (action: ConversationViewAction): void => {
      if (isExecutingActionRef.current) return;
      const confirmation = action.confirmation;
      if (!confirmation) {
        void runAction(action);
        return;
      }

      const clientRequestId =
        action.code === "REPORT_CONVERSATION" ? createClientRequestId() : null;
      const inputValues: Record<string, unknown> = {
        ...confirmation.payload_defaults,
        ...(clientRequestId ? { client_request_id: clientRequestId } : null),
      };
      const isOfferAcceptance =
        confirmation.code === "BUYER_ACCEPT_OFFER_CONFIRMATION";
      const offerName = isOfferAcceptance
        ? confirmation.fields.find((field) => field.value_source === "offer_name")
        : undefined;
      const offerDescription = isOfferAcceptance
        ? confirmation.fields.find(
            (field) => field.value_source === "offer_description"
          )
        : undefined;
      const description = interpolateTemplate(
        confirmation.description_template,
        conversationView?.context ?? {}
      );
      const rows = confirmation.fields
        .filter((field) => field !== offerName && field !== offerDescription)
        .filter((field) => !confirmation.comparison ||
          !["current_terms", "proposed_terms"].includes(field.value_source))
        .map((field) => ({
          label: field.label,
          value: toStringValue(field.value),
        }));
      const inputs = confirmation.inputs.map((input) => ({
        id: input.id,
        kind: input.kind,
        payload_key: input.payload_key,
        label: input.label,
        helper_text: input.helper_text,
        otp_length: input.otp_length,
        component_config: input.component_config,
        options: input.options.map((option) => ({
          value: option.value,
          methodKind: option.method_kind,
          label: option.label,
          feeLabel: option.fee_label,
          totalLabel: option.total_label,
          timingLabel: option.timing_label,
          availabilityLabel: option.availability_label,
          disabled: option.disabled,
          disabledReason: option.disabled_reason,
          setupActionLabel: option.setup_action?.label,
          onSetupPress:
            option.setup_action &&
            option.setup_action.target === "modal.email_setup"
              ? () => openConfirmationClientTarget(option.setup_action!.target)
              : undefined,
        })),
        is_required: input.is_required,
        onValueChange: (value: unknown) => {
          inputValues[input.payload_key] = value;
        },
      }));
      const ratingInputTitle =
        confirmation.inputs.find((input) => input.kind === "rating")?.label ?? null;
      const confirmStyle = normalizeStyleFlags(confirmation.confirm_style_code);
      const secondaryAction = confirmation.secondary_action_code
        ? conversationView?.actions.find((candidate) =>
            candidate.code === confirmation.secondary_action_code && candidate.id !== action.id)
        : undefined;
      const hasUnavailableRequiredChoice = confirmation.inputs.some(
        (input) =>
          input.kind === "choice" &&
          input.is_required &&
          input.options.length === 0
      );

      const popupConfig: PopupSummaryConfig = {
        type: "summary",
        title: ratingInputTitle || confirmation.title,
        metadata: offerName ? toStringValue(offerName.value) : undefined,
        description: offerDescription
          ? toStringValue(offerDescription.value)
          : description,
        descriptionPlacement: offerDescription || confirmation.comparison ? "afterRows" : undefined,
        rows,
        comparison: confirmation.comparison ? {
          currentLabel: confirmation.comparison.current_label,
          proposedLabel: confirmation.comparison.proposed_label,
          changedLabel: confirmation.comparison.changed_label,
          fields: confirmation.comparison.fields.map((field) => ({
            id: field.id, label: field.label, currentValue: field.current_value,
            proposedValue: field.proposed_value, changed: field.changed, layout: field.layout,
          })),
        } : undefined,
        inputs,
        images: confirmation.images,
        blocker: confirmation.blocker
          ? {
              message: confirmation.blocker.message,
              actionLabel: confirmation.blocker.action_label,
              onActionPress:
                confirmation.blocker.action_target === "modal.email_setup"
                  ? () =>
                      openConfirmationClientTarget(
                        confirmation.blocker!.action_target!
                      )
                  : undefined,
            }
          : null,
        actions: [
          {
            id: `${action.id}-cancel`,
            label: secondaryAction?.confirmation?.confirm_label || secondaryAction?.label || confirmation.cancel_label || "Volver",
            icon: normalizeOptionalIcon(confirmation.cancel_icon),
            backgroundColorKey: "backgroudWhite",
            textColorKey: "textDark",
            iconColorKey: "textDark",
            onPress: secondaryAction ? () => {
              handleActionPress(secondaryAction);
              return false;
            } : undefined,
          },
          {
            id: `${action.id}-confirm`,
            label: confirmation.confirm_label || action.label || "Confirmar",
            icon: normalizeOptionalIcon(confirmation.confirm_icon),
            backgroundColorKey: confirmStyle.isPrimary ? "primary" : "backgroudWhite",
            textColorKey: confirmStyle.isPrimary
              ? "backgroudWhite"
              : confirmStyle.isDanger
                ? "error"
                : "textDark",
            iconColorKey: confirmStyle.isPrimary
              ? "backgroudWhite"
              : confirmStyle.isDanger
                ? "error"
                : "textDark",
            disabled:
              confirmation.blocker != null || hasUnavailableRequiredChoice,
            onPress: () => {
              const missingInputs = confirmation.inputs.filter((input) => {
                if (!input.is_required) return false;

                const raw = inputValues[input.payload_key];
                if (input.kind === "rating") {
                  return !isRatingPayload(raw) || raw.stars < 1;
                }

                const value = typeof raw === "string" ? raw.trim() : "";
                return !value;
              });

              if (missingInputs.length > 0) {
                const labels = Array.from(
                  new Set(missingInputs.map((input) => input.label.trim()))
                ).filter(Boolean);
                return {
                  shouldClose: false,
                  feedback: {
                    tone: "warning",
                    title: "Faltan datos",
                    message: `Completa: ${labels.join(", ")}.`,
                    presentation: "toast",
                  },
                } satisfies PopupSummaryActionOutcome;
              }

              const invalidInput = confirmation.inputs.find((input) => {
                const raw = inputValues[input.payload_key];

                if (input.kind === "otp") {
                  const value = typeof raw === "string" ? raw.trim() : "";
                  if (value && value.length !== input.otp_length) return true;
                  return false;
                }

                if (input.kind === "rating") {
                  return false;
                }

                if (input.kind === "choice") {
                  const value = typeof raw === "string" ? raw.trim() : "";
                  if (input.options.length === 0) return true;
                  if (!value) return false;
                  return !input.options.some(
                    (option) => option.value === value && !option.disabled
                  );
                }

                const value = typeof raw === "string" ? raw.trim() : "";
                if (
                  input.kind === "textarea" &&
                  typeof input.component_config?.max_length === "number" &&
                  value.length > input.component_config.max_length
                ) {
                  return true;
                }
                return false;
              });

              if (invalidInput) {
                const invalidRawValue = inputValues[invalidInput.payload_key];
                const invalidTextLength =
                  typeof invalidRawValue === "string"
                    ? invalidRawValue.trim().length
                    : 0;
                const message =
                  invalidInput.kind === "otp"
                    ? `Ingresa un código de ${invalidInput.otp_length} dígitos.`
                    : invalidInput.kind === "rating"
                      ? "Selecciona una calificación en estrellas."
                    : invalidInput.kind === "choice"
                      ? invalidInput.options.length === 0
                        ? "Las opciones no se pudieron cargar. Actualiza la conversación."
                        : "Selecciona una opción."
                      : invalidInput.kind === "textarea" &&
                          typeof invalidInput.component_config?.max_length ===
                            "number" &&
                          invalidTextLength >
                            invalidInput.component_config.max_length
                        ? `Usa ${invalidInput.component_config.max_length} caracteres o menos.`
                      : "Revisa el valor ingresado.";
                if (
                  invalidInput.kind === "otp" ||
                  invalidInput.kind === "rating" ||
                  invalidInput.kind === "choice" ||
                  invalidInput.kind === "textarea"
                ) {
                  return {
                    shouldClose: false,
                    inputErrors: { [invalidInput.id]: message },
                  } satisfies PopupSummaryActionOutcome;
                }

                return {
                  shouldClose: false,
                  feedback: {
                    tone: "warning",
                    title: "Dato incompleto",
                    message,
                  },
                } satisfies PopupSummaryActionOutcome;
              }

              const payload = confirmation.inputs.reduce<Record<string, unknown>>(
                (acc, input) => {
                  const raw = inputValues[input.payload_key];

                  if (input.kind === "rating") {
                    if (isRatingPayload(raw) && raw.stars >= 1) {
                      acc[input.payload_key] = raw;
                    }
                    return acc;
                  }

                  if (input.kind === "choice") {
                    const value = typeof raw === "string" ? raw.trim() : "";
                    const selectedOption = input.options.find(
                      (option) => option.value === value && !option.disabled
                    );
                    if (selectedOption) {
                      acc[input.payload_key] = selectedOption.value;
                    }
                    return acc;
                  }

                  const value = typeof raw === "string" ? raw.trim() : "";
                  if (value) {
                    acc[input.payload_key] = value;
                  }
                  return acc;
                },
                {
                  ...confirmation.payload_defaults,
                  ...(clientRequestId
                    ? { client_request_id: clientRequestId }
                    : null),
                }
              );
              const actionPayload = Object.keys(payload).length > 0 ? payload : null;

              return (async (): Promise<boolean | PopupSummaryActionOutcome> => {
                let failure: ConversationActionFailure | null = null;
                const succeeded = await runAction(action, actionPayload, (error) => {
                  failure = error;
                });

                if (succeeded) return true;

                const error = failure as ConversationActionFailure | null;
                if (["offer_changed", "offer_proposal_changed", "offer_proposal_closed", "offer_edit_unavailable"].includes(error?.code ?? "")) {
                  closePopup();
                  await refreshConversation();
                  showWarning(
                    "La oferta cambió",
                    error?.message ||
                      "Revísala nuevamente antes de concretar la compra."
                  );
                  return false;
                }
                const codeWasReissued = didReissueTransactionCode(error?.code);
                const otpInputIds = confirmation.inputs
                  .filter((input) => input.kind === "otp")
                  .map((input) => input.id);
                const isOtpInputError =
                  isTransactionCodeInputError(error?.code) && otpInputIds.length > 0;
                const inputErrors = isOtpInputError
                  ? otpInputIds.reduce<Record<string, string>>((acc, inputId) => {
                      acc[inputId] =
                        error?.message ?? "El código no es válido. Inténtalo de nuevo.";
                      return acc;
                    }, {})
                  : undefined;

                return {
                  shouldClose: false,
                  feedback: isOtpInputError
                    ? undefined
                    : {
                        tone: codeWasReissued ? "success" : "error",
                        title: codeWasReissued
                          ? "Nuevo código enviado"
                          : "No se pudo completar la acción",
                        message: codeWasReissued
                          ? "El comprador recibió un código nuevo. Solicítalo para finalizar."
                          : error?.message ?? "Ocurrió un error, intenta de nuevo.",
                      },
                  inputErrors,
                  resetInputIds: codeWasReissued
                    ? otpInputIds
                    : undefined,
                };
              })();
            },
          },
        ],
      };
      acceptancePopupRef.current = typeof confirmation.payload_defaults.offer_revision === "string" ||
        typeof confirmation.payload_defaults.review_revision === "string"
        ? { actionId: action.id, revision: JSON.stringify(confirmation.payload_defaults), config: popupConfig } : null;
      openPopup(popupConfig);
    },
    [conversationView?.context, conversationView?.actions, refreshConversation, runAction]
  );

  return { isExecutingAction, executingActionId, handleActionPress };
}
