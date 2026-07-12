// Kept for backwards-compatible imports. The real implementation lives in the
// SubscriptionContext so all screens share one source of truth (a license
// activation in the Paywall updates every screen immediately).
export { useSubscription } from '../contexts/SubscriptionContext';
