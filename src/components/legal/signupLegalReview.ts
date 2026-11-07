export type SignupLegalReviewState = {
  userType: "buyer" | "seller";
  phoneNumber: string;
  legalAccepted: boolean;
};

let pendingSignup: SignupLegalReviewState | null = null;

export function preserveSignupForLegalReview(state: SignupLegalReviewState) {
  pendingSignup = { ...state };
}

export function getSignupLegalReviewState(): SignupLegalReviewState | null {
  return pendingSignup ? { ...pendingSignup } : null;
}

export function clearSignupLegalReviewState() {
  pendingSignup = null;
}
