import Button from "@/src/components/button/Button";
import ExpandableInfoCard from "@/src/components/expandableInfoCard/ExpandableInfoCard";
import FilePicker, {
  SelectedFile,
} from "@/src/components/filePicker/FilePicker";
import OptionsChecklistCard from "@/src/components/optionsChecklistCard/OptionsChecklistCard";
import { openPopup } from "@/src/services/popup.service";
import { Text } from "@/src/components/Text";
import TextArea from "@/src/components/textArea/TextArea";
import TextFieldWithToggle from "@/src/components/textFieldWithToggle/TextFieldWithToggle";
import { useTheme } from "@/src/themes";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Keyboard,
  ScrollView,
  TouchableWithoutFeedback,
  View,
} from "react-native";

type CurrencyOption = "colones" | "dolares";
type DeliveryTimeOption = "horas" | "dias";

export default function OfferScreen() {
  const t = useTheme();
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<CurrencyOption>("colones");
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [deliveryMethods, setDeliveryMethods] = useState<string[]>([]);
  const [pickupDelay, setPickupDelay] = useState("");
  const [pickupDelayUnit, setPickupDelayUnit] =
    useState<DeliveryTimeOption>("horas");
  const [shippingCost, setShippingCost] = useState("");
  const [shippingCostCurrency, setShippingCostCurrency] =
    useState<CurrencyOption>("colones");
  const [shippingMaxTime, setShippingMaxTime] = useState("");
  const [shippingMaxTimeUnit, setShippingMaxTimeUnit] =
    useState<DeliveryTimeOption>("horas");
  const canSubmitOffer =
    description.trim().length > 0 &&
    price.trim().length > 0 &&
    files.length > 0 &&
    deliveryMethods.length > 0;

  const handlePriceChange = (text: string) => {
    setPrice(text.replace(/\D/g, ""));
  };

  const priceLabel = currency === "colones" ? `₡${price}` : `$${price}`;
  const deliverySummary = deliveryMethods
    .map((method) => {
      if (method === "pickup") {
        if (!pickupDelay) return "Recoger en tienda";
        return `Recoger en tienda: después de ${pickupDelay} ${pickupDelayUnit}.`;
      }
      if (method === "shipping") {
        const costText = shippingCost
          ? `${shippingCostCurrency === "colones" ? "₡" : "$"}${shippingCost}`
          : "Sin costo definido";
        const timeText = shippingMaxTime
          ? `${shippingMaxTime} ${shippingMaxTimeUnit}`
          : "sin tiempo definido";
        return `Envío: ${costText}, tiempo máximo ${timeText}.`;
      }
      return method;
    })
    .join(" ");

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

        <TextFieldWithToggle<CurrencyOption>
          label="Precio"
          value={price}
          onChangeText={handlePriceChange}
          options={[
            { label: "Colones", value: "colones" },
            { label: "Dólares", value: "dolares" },
          ]}
          selectedOption={currency}
          onOptionChange={setCurrency}
          keyboardType="number-pad"
          inputMode="numeric"
        />

        <FilePicker
          label="Imágenes"
          mode="images"
          accept={["image/*"]}
          maxFiles={10}
          value={files}
          onChange={setFiles}
        />

        <OptionsChecklistCard
          icon="truck"
          title="Método de entrega"
          description="Selecciona todas las opciones que brindarás para esta oferta."
          allowMultiple
          value={deliveryMethods}
          onChange={setDeliveryMethods}
          options={[
            {
              id: "pickup",
              label: "Recoger en tienda",
              hint: "Indica en cuánto tiempo estará lista la opción de retiro en tienda.",
              content: (
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
              ),
            },
            {
              id: "shipping",
              label: "Envío",
              content: (
                <View style={{ gap: t.spacing.xs }}>
                  <View style={{ gap: t.spacing.xs }}>
                    <Text color="stateAnulated">Costo</Text>
                    <TextFieldWithToggle<CurrencyOption>
                      value={shippingCost}
                      onChangeText={(text) =>
                        setShippingCost(text.replace(/\D/g, ""))
                      }
                      options={[
                        { label: "Colones", value: "colones" },
                        { label: "Dólares", value: "dolares" },
                      ]}
                      selectedOption={shippingCostCurrency}
                      onOptionChange={setShippingCostCurrency}
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
              ),
            },
          ]}
        />

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
                    onPress: () => {
                      console.log("offer payload", {
                        description,
                        price,
                        currency,
                        files,
                        deliveryMethods,
                        pickupDelay,
                        pickupDelayUnit,
                        shippingCost,
                        shippingCostCurrency,
                        shippingMaxTime,
                        shippingMaxTimeUnit,
                      });
                      router.back();
                    },
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
