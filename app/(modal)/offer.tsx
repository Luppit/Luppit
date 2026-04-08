import Button from "@/src/components/button/Button";
import ExpandableInfoCard from "@/src/components/expandableInfoCard/ExpandableInfoCard";
import FilePicker, {
  SelectedFile,
} from "@/src/components/filePicker/FilePicker";
import OptionsChecklistCard from "@/src/components/optionsChecklistCard/OptionsChecklistCard";
import { purchaseRequestExample } from "@/src/mocks/purchaseRequest.mock";
import { Currency, getCurrencies } from "@/src/services/currency.service";
import {
  DeliveryCatalog,
  getDeliveryCatalog,
} from "@/src/services/delivery.catalog.service";
import {
  createPurchaseOffer,
  CreatePurchaseOfferInput,
} from "@/src/services/purchase.offer.service";
import { openPopup } from "@/src/services/popup.service";
import {
  getPurchaseRequestById,
  PurchaseRequest,
} from "@/src/services/purchase.request.service";
import { Text } from "@/src/components/Text";
import TextArea from "@/src/components/textArea/TextArea";
import TextFieldWithToggle from "@/src/components/textFieldWithToggle/TextFieldWithToggle";
import { useTheme } from "@/src/themes";
import { showError, showSuccess } from "@/src/utils/useToast";
import { router, useGlobalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  Keyboard,
  ScrollView,
  TouchableWithoutFeedback,
  View,
} from "react-native";

type DeliveryTimeOption = "horas" | "dias";

function parsePurchaseRequestParam(
  raw: string | string[] | undefined
): PurchaseRequest | null {
  if (!raw) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  try {
    return JSON.parse(value) as PurchaseRequest;
  } catch {
    return null;
  }
}

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function OfferScreen() {
  const t = useTheme();
  const params = useGlobalSearchParams<{
    purchaseRequest?: string | string[];
    purchaseRequestId?: string | string[];
    conversationId?: string | string[];
  }>();
  const initialPurchaseRequest = parsePurchaseRequestParam(params.purchaseRequest);
  const purchaseRequestId = Array.isArray(params.purchaseRequestId)
    ? params.purchaseRequestId[0]
    : params.purchaseRequestId;
  const conversationId = Array.isArray(params.conversationId)
    ? params.conversationId[0]
    : params.conversationId;
  const [purchaseRequest, setPurchaseRequest] = useState<PurchaseRequest>(
    initialPurchaseRequest ?? purchaseRequestExample
  );
  const [requestLoading, setRequestLoading] = useState(!initialPurchaseRequest && !!purchaseRequestId);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [deliveryCatalog, setDeliveryCatalog] = useState<DeliveryCatalog[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [deliveryMethods, setDeliveryMethods] = useState<string[]>([]);
  const [pickupDelay, setPickupDelay] = useState("");
  const [pickupDelayUnit, setPickupDelayUnit] =
    useState<DeliveryTimeOption>("horas");
  const [shippingCost, setShippingCost] = useState("");
  const [shippingCostCurrencyId, setShippingCostCurrencyId] = useState("");
  const [shippingMaxTime, setShippingMaxTime] = useState("");
  const [shippingMaxTimeUnit, setShippingMaxTimeUnit] =
    useState<DeliveryTimeOption>("horas");
  const pickupCatalog = useMemo(
    () =>
      deliveryCatalog.find((item) => {
        const hint = normalize(item.hint);
        return hint.length > 0;
      }) ??
      null,
    [deliveryCatalog]
  );
  const shippingCatalog = useMemo(
    () => deliveryCatalog.find((item) => item.id !== pickupCatalog?.id) ?? null,
    [deliveryCatalog, pickupCatalog]
  );
  const currencyToggleOptions = useMemo(() => {
    return currencies.slice(0, 2).map((currency) => ({
      label: currency.display_name ?? "-",
      value: currency.id,
    }));
  }, [currencies]);
  const canSubmitOffer =
    description.trim().length > 0 &&
    price.trim().length > 0 &&
    files.length > 0 &&
    deliveryMethods.length > 0 &&
    currencyId.length > 0;

  const loadCatalogs = useCallback(async () => {
    setCatalogLoading(true);
    const [currencyResult, deliveryResult] = await Promise.all([
      getCurrencies(),
      getDeliveryCatalog(),
    ]);

    if (currencyResult.ok) setCurrencies(currencyResult.data);
    else setCurrencies([]);

    if (deliveryResult.ok) setDeliveryCatalog(deliveryResult.data);
    else setDeliveryCatalog([]);

    setCatalogLoading(false);
  }, []);

  useEffect(() => {
    if (initialPurchaseRequest) {
      setPurchaseRequest(initialPurchaseRequest);
      setRequestLoading(false);
      return;
    }

    if (!purchaseRequestId) {
      setRequestLoading(false);
      return;
    }

    let active = true;

    const loadPurchaseRequest = async () => {
      setRequestLoading(true);
      const result = await getPurchaseRequestById(purchaseRequestId);
      if (!active) return;

      if (result?.ok) {
        setPurchaseRequest(result.data);
      } else {
        showError("No se pudo cargar la solicitud", "Intenta abrir la oferta de nuevo.");
      }

      setRequestLoading(false);
    };

    void loadPurchaseRequest();

    return () => {
      active = false;
    };
  }, [initialPurchaseRequest, purchaseRequestId]);

  useEffect(() => {
    void loadCatalogs();
  }, [loadCatalogs]);

  useFocusEffect(
    useCallback(() => {
      void loadCatalogs();
    }, [loadCatalogs])
  );

  useEffect(() => {
    const firstCurrencyId = currencyToggleOptions[0]?.value ?? "";
    if (firstCurrencyId.length === 0) return;

    if (!currencyId || !currencyToggleOptions.some((option) => option.value === currencyId)) {
      setCurrencyId(firstCurrencyId);
    }

    if (
      !shippingCostCurrencyId ||
      !currencyToggleOptions.some((option) => option.value === shippingCostCurrencyId)
    ) {
      setShippingCostCurrencyId(firstCurrencyId);
    }
  }, [currencyId, shippingCostCurrencyId, currencyToggleOptions]);

  const handlePriceChange = (text: string) => {
    setPrice(text.replace(/\D/g, ""));
  };

  const toDays = (value: number | null | undefined, unit: DeliveryTimeOption) => {
    if (!value || value <= 0) return null;
    if (unit === "dias") return value;
    return Math.ceil(value / 24);
  };

  const selectedCurrency = currencies.find((currency) => currency.id === currencyId) ?? null;
  const selectedShippingCurrency =
    currencies.find((currency) => currency.id === shippingCostCurrencyId) ?? null;
  const isColonCurrency = normalize(selectedCurrency?.currency_code) === "col";
  const isShippingColonCurrency =
    normalize(selectedShippingCurrency?.currency_code) === "col";
  const priceLabel = isColonCurrency ? `₡${price}` : `$${price}`;
  const deliverySummary = deliveryMethods
    .map((method) => {
      const catalog = deliveryCatalog.find((item) => item.id === method);
      const displayName = catalog?.display_name ?? "Entrega";
      if (pickupCatalog && method === pickupCatalog.id) {
        if (!pickupDelay) return displayName;
        return `${displayName}: después de ${pickupDelay} ${pickupDelayUnit}.`;
      }
      if (shippingCatalog && method === shippingCatalog.id) {
        const costText = shippingCost
          ? `${isShippingColonCurrency ? "₡" : "$"}${shippingCost}`
          : "Sin costo definido";
        const timeText = shippingMaxTime
          ? `${shippingMaxTime} ${shippingMaxTimeUnit}`
          : "sin tiempo definido";
        return `${displayName}: ${costText}, tiempo máximo ${timeText}.`;
      }
      return displayName;
    })
    .join(" ");
  const handlePublishOffer = useCallback(async () => {
    const primaryDeliveryCatalogId =
      (shippingCatalog && deliveryMethods.includes(shippingCatalog.id)
        ? shippingCatalog.id
        : deliveryMethods[0]) ?? "";

    const payload: CreatePurchaseOfferInput = {
      purchaseRequestId: purchaseRequest.id,
      conversationId,
      description,
      price: Number(price),
      currencyId,
      primaryDeliveryCatalogId,
      files,
      deliveryMethods,
      pickupDelay: toDays(Number(pickupDelay || 0), pickupDelayUnit),
      pickupDelayUnit,
      shippingCost: Number(shippingCost || 0),
      shippingMaxTime: toDays(
        Number(shippingMaxTime || 0),
        shippingMaxTimeUnit
      ),
      shippingMaxTimeUnit,
    };

    const result = await createPurchaseOffer(payload);
    if (!result.ok) {
      showError("No se pudo publicar la oferta", result.error.message);
      return;
    }

    showSuccess("Oferta publicada");
    router.back();
  }, [
    conversationId,
    currencyId,
    deliveryMethods,
    description,
    files,
    pickupDelay,
    pickupDelayUnit,
    price,
    purchaseRequest.id,
    shippingCatalog,
    shippingCost,
    shippingMaxTime,
    shippingMaxTimeUnit,
  ]);

  if (requestLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Cargando solicitud...</Text>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ScrollView
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: t.spacing.md,
          paddingBottom: t.spacing.xl,
          gap: t.spacing.md,
          flexGrow: 1,
        }}
      >
        <ExpandableInfoCard
          title="Validado por Luppit"
          description="Luppit validará constantemente la información de la oferta, para asegurarnos de que ofreces el producto exacto de la solicitud."
          backgroundColorKey="primary"
          textColorKey="backgroudWhite"
          initiallyExpanded
        />

        <TextArea
          label="Descripción"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe el producto para que el comprador sepa exactamente qué recibirá. Ejemplo: Compresor original, usado, en buen estado con 3 meses de garantía."
        />

        {currencyToggleOptions.length >= 2 ? (
          <TextFieldWithToggle<string>
            label="Precio"
            value={price}
            onChangeText={handlePriceChange}
            options={
              currencyToggleOptions as [
                { label: string; value: string },
                { label: string; value: string },
              ]
            }
            selectedOption={currencyId || currencyToggleOptions[0]?.value || ""}
            onOptionChange={setCurrencyId}
            keyboardType="number-pad"
            inputMode="numeric"
          />
        ) : (
          <Text color="stateAnulated">
            {catalogLoading ? "Cargando monedas..." : "No hay monedas disponibles."}
          </Text>
        )}

        <FilePicker
          label="Imágenes"
          mode="images"
          accept={["image/*"]}
          maxFiles={10}
          value={files}
          onChange={setFiles}
        />

        {deliveryCatalog.length > 0 ? (
          <OptionsChecklistCard
            icon="truck"
            title="Método de entrega"
            description="Selecciona todas las opciones que brindarás para esta oferta."
            allowMultiple
            value={deliveryMethods}
            onChange={setDeliveryMethods}
            options={deliveryCatalog.map((delivery) => ({
              id: delivery.id,
              label: delivery.display_name ?? "-",
              hint: delivery.hint ?? undefined,
              content:
                pickupCatalog && delivery.id === pickupCatalog.id ? (
                  <View style={{ gap: t.spacing.xs }}>
                    <Text color="stateAnulated">Después de</Text>
                    <TextFieldWithToggle<DeliveryTimeOption>
                      value={pickupDelay}
                      onChangeText={(text) =>
                        setPickupDelay(text.replace(/\D/g, ""))
                      }
                      options={[
                        { label: "Hora(s)", value: "horas" },
                        { label: "Día(s)", value: "dias" },
                      ]}
                      selectedOption={pickupDelayUnit}
                      onOptionChange={setPickupDelayUnit}
                      keyboardType="number-pad"
                      inputMode="numeric"
                    />
                  </View>
                ) : shippingCatalog && delivery.id === shippingCatalog.id ? (
                  <View style={{ gap: t.spacing.xs }}>
                    <View style={{ gap: t.spacing.xs }}>
                      <Text color="stateAnulated">Costo</Text>
                      <TextFieldWithToggle<string>
                        value={shippingCost}
                        onChangeText={(text) =>
                          setShippingCost(text.replace(/\D/g, ""))
                        }
                        options={
                          currencyToggleOptions as [
                            { label: string; value: string },
                            { label: string; value: string },
                          ]
                        }
                        selectedOption={
                          shippingCostCurrencyId || currencyToggleOptions[0]?.value || ""
                        }
                        onOptionChange={setShippingCostCurrencyId}
                        keyboardType="number-pad"
                        inputMode="numeric"
                      />
                    </View>

                    <View style={{ gap: t.spacing.xs }}>
                      <Text color="stateAnulated">Tiempo máximo de entrega</Text>
                      <TextFieldWithToggle<DeliveryTimeOption>
                        value={shippingMaxTime}
                        onChangeText={(text) =>
                          setShippingMaxTime(text.replace(/\D/g, ""))
                        }
                        options={[
                          { label: "Hora(s)", value: "horas" },
                          { label: "Día(s)", value: "dias" },
                        ]}
                        selectedOption={shippingMaxTimeUnit}
                        onOptionChange={setShippingMaxTimeUnit}
                        keyboardType="number-pad"
                        inputMode="numeric"
                      />
                    </View>
                  </View>
                ) : undefined,
            }))}
          />
        ) : (
          <Text color="stateAnulated">
            {catalogLoading
              ? "Cargando métodos de entrega..."
              : "No hay métodos de entrega disponibles."}
          </Text>
        )}

        {canSubmitOffer ? (
          <Button
            variant="dark"
            title="Enviar oferta"
            onPress={() =>
              openPopup({
                type: "summary",
                title: "Revisa la oferta antes de publicarla",
                icon: "file-text",
                description:
                  "Revisa la información antes de publicarla. Asegúrate de que la descripción y los detalles de la oferta sean correctos.",
                rows: [
                  { label: "Descripción", value: description },
                  { label: "Precio", value: priceLabel },
                  { label: "Método de entrega", value: deliverySummary },
                ],
                images: files.map((file) => ({ uri: file.uri })),
                actions: [
                  {
                    id: "edit",
                    label: "Seguir editando",
                    icon: "sliders-horizontal",
                    backgroundColorKey: "backgroudWhite",
                    textColorKey: "textDark",
                    iconColorKey: "textDark",
                  },
                  {
                    id: "publish",
                    label: "Publicar oferta",
                    icon: "check",
                    backgroundColorKey: "primary",
                    textColorKey: "backgroudWhite",
                    iconColorKey: "backgroudWhite",
                    onPress: () => void handlePublishOffer(),
                  },
                ],
              })
            }
          />
        ) : null}
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}
