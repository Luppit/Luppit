import { FunctionName } from "../types";

export const RPC_FUNCTIONS = {
  ACCEPT_CURRENT_LEGAL_DOCUMENTS: "accept_current_legal_documents",
  BEGIN_CURRENT_USER_BUYER_ONBOARDING:
    "begin_current_user_buyer_onboarding",
  BEGIN_CURRENT_USER_SELLER_ONBOARDING:
    "begin_current_user_seller_onboarding",
  ADD_BUYER_PURCHASE_REQUEST_FAVORITE:
    "add_buyer_purchase_request_favorite",
  ADD_SELLER_PURCHASE_REQUEST_FAVORITE:
    "add_seller_purchase_request_favorite",
  CANCEL_CURRENT_BUYER_PURCHASE_REQUEST:
    "cancel_current_buyer_purchase_request",
  COMPLETE_CURRENT_USER_PROFILE_SETUP:
    "complete_current_user_profile_setup",
  CREATE_CURRENT_USER_PROFILE: "create_current_user_profile",
  CREATE_CURRENT_USER_BUYER_PROFILE_FROM_VERIFIED_IDENTITY:
    "create_current_user_buyer_profile_from_verified_identity",
  CREATE_CURRENT_USER_SELLER_PROFILE_FROM_VERIFIED_IDENTITY:
    "create_current_user_seller_profile_from_verified_identity",
  GET_CURRENT_BUSINESS_VERIFICATION:
    "get_current_business_verification",
  DECLINE_CURRENT_USER_BUSINESS_INVITATION:
    "decline_current_user_business_invitation",
  DISMISS_ALL_PROFILE_NOTIFICATIONS:
    "dismiss_all_profile_notifications",
  GET_BUYER_HOME_PURCHASE_REQUESTS: "get_buyer_home_purchase_requests",
  GET_BUYER_MARKETPLACE_HUB: "get_buyer_marketplace_hub",
  GET_BUYER_MARKETPLACE_HUB_ITEMS: "get_buyer_marketplace_hub_items",
  GET_BUYER_PURCHASE_REQUEST_FAVORITES:
    "get_buyer_purchase_request_favorites",
  GET_BUYER_PURCHASE_REQUEST_OFFERS: "get_buyer_purchase_request_offers",
  GET_BUYER_VISIBLE_BUSINESS_PROFILE: "get_buyer_visible_business_profile",
  GET_ACTIVE_LEGAL_DOCUMENT: "get_active_legal_document",
  GET_CATEGORY_LINEAGE: "get_category_lineage",
  GET_CATEGORY_REQUIREMENTS: "get_category_requirements",
  GET_CONVERSATION_MESSAGES: "get_conversation_messages",
  GET_CONVERSATION_TIMELINE: "get_conversation_timeline",
  GET_CONVERSATION_VIEW: "get_conversation_view",
  GET_CURRENT_BUSINESS_TEAM: "get_current_business_team",
  GET_CURRENT_ACCOUNT_ONBOARDING: "get_current_account_onboarding",
  GET_CURRENT_BUYER_PURCHASE_REQUEST_CANCELLATION_ELIGIBILITY:
    "get_current_buyer_purchase_request_cancellation_eligibility",
  GET_CURRENT_PROFILE_CONVERSATIONS: "get_current_profile_conversations",
  GET_CURRENT_LEGAL_ACCEPTANCE_STATE:
    "get_current_legal_acceptance_state",
  GET_CURRENT_SAFETY_BLOCKS: "get_current_safety_blocks",
  GET_CURRENT_SELLER_PURCHASE_OFFERS: "get_current_seller_purchase_offers",
  GET_CURRENT_USER_BUSINESS_INVITATIONS:
    "get_current_user_business_invitations",
  GET_CURRENT_USER_PROFILES: "get_current_user_profiles",
  GET_DELIVERY_CATALOG_OPTIONS: "get_delivery_catalog_options",
  GET_NAVBAR_ITEMS_BY_PROFILE: "get_navbar_items_by_profile",
  GET_OR_CREATE_SELLER_PURCHASE_REQUEST_CONVERSATION:
    "get_or_create_seller_purchase_request_conversation",
  GET_PURCHASE_REQUEST_STATUS_UI_OPTIONS:
    "get_purchase_request_status_ui_options",
  GET_PURCHASE_REQUEST_VISUALIZATION_COUNT:
    "get_purchase_request_visualization_count",
  GET_SELLER_HOME_FILTER_OPTIONS: "get_seller_home_filter_options",
  GET_SELLER_HOME_PURCHASE_REQUESTS: "get_seller_home_purchase_requests",
  GET_SELLER_MARKETPLACE_HUB: "get_seller_marketplace_hub",
  GET_SELLER_MARKETPLACE_HUB_ITEMS: "get_seller_marketplace_hub_items",
  GET_SELLER_OFFER_EDIT_PAYLOAD_V2: "get_seller_offer_edit_payload_v2",
  GET_SELLER_PURCHASE_REQUEST_FAVORITES:
    "get_seller_purchase_request_favorites",
  INVITE_CURRENT_USER_TO_BUSINESS: "invite_current_user_to_business",
  MARK_ALL_PROFILE_NOTIFICATIONS_READ:
    "mark_all_profile_notifications_read",
  MARK_PROFILE_NOTIFICATION_READ: "mark_profile_notification_read",
  PHONE_NUMBER_IS_REGISTERED: "phone_number_is_registered",
  REMOVE_BUYER_PURCHASE_REQUEST_FAVORITE:
    "remove_buyer_purchase_request_favorite",
  REMOVE_CURRENT_BUSINESS_MEMBER: "remove_current_business_member",
  REMOVE_SELLER_PURCHASE_REQUEST_FAVORITE:
    "remove_seller_purchase_request_favorite",
  REGISTER_CURRENT_PUSH_DEVICE: "register_current_push_device",
  REVOKE_CURRENT_USER_BUSINESS_INVITATION:
    "revoke_current_user_business_invitation",
  SEND_EMAIL_VERIFICATION_OTP: "send_email_verification_otp",
  SET_CURRENT_BUSINESS_CATEGORY_PREFERENCES:
    "set_current_business_category_preferences",
  SET_CURRENT_BUSINESS_LOCATION: "set_current_business_location",
  SET_CURRENT_BUYER_PROFILE_IMAGE: "set_current_buyer_profile_image",
  SET_CURRENT_BUSINESS_PROFILE_IMAGE: "set_current_business_profile_image",
  UPDATE_CURRENT_PROFILE_IDENTITY_FIELD:
    "update_current_profile_identity_field",
  UPDATE_CURRENT_BUSINESS_COMMERCIAL_NAME:
    "update_current_business_commercial_name",
  UPDATE_SELLER_OFFER_FULFILLMENT_FROM_CONVERSATION:
    "update_seller_offer_fulfillment_from_conversation",
  UNREGISTER_CURRENT_PUSH_DEVICE: "unregister_current_push_device",
  UNBLOCK_SAFETY_BLOCK: "unblock_safety_block",
  VERIFY_EMAIL_VERIFICATION_OTP: "verify_email_verification_otp",
} as const satisfies Record<string, FunctionName>;
