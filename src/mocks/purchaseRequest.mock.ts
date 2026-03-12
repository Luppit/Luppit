import { PurchaseRequest } from "../services/purchase.request.service";

export const purchaseRequestExample: PurchaseRequest = {
  id: "8e0b7448-a7a7-48dc-94f8-8cf7e7a2b9c7",
  profile_id: "9e5f0a32-c4f1-4ef7-91b9-f6db8e503011",
  draft_id: "d5b0b6ec-f36a-43fa-a742-3f6b4b3a17f2",
  category_id: "0e4e0a3b-81e6-4ebf-83ca-0996de7688db",
  category_path: "vehiculos/repuestos/ac",
  category_name: "Sistema de A/C",
  title: "Compresor Sentra 2023",
  summary_text:
    "Compresor del aire acondicionado para Nissan Sentra 2023, motor gasolina, original y solo la pieza principal.",
  contract: {
    payment_terms: "Contado",
    delivery_window_days: 3,
    warranty_days: 30,
  },
  status: "published",
  created_at: "2026-03-10T16:20:00.000Z",
  published_at: "2026-03-10T16:21:00.000Z",
  updated_at: "2026-03-10T16:21:00.000Z",
};
