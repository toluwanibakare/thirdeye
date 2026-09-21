import { IntegrationProfile, IntegrationStatus } from '@thirdeye/shared';

export interface IntegrationRecord extends IntegrationProfile {
  // Aliases for backwards compatibility with database/legacy formats
  allowed_endpoints: string[];
  allowed_methods: string[];
  allowed_data: string[];
  forbidden_data: string[];
  expected_request_rate: number;
  current_request_rate: number;
  risk_score: number;
  api_key: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

const DEFAULT_STOREX_CONNECTORS: Record<string, IntegrationRecord> = {
  stripe_pay: {
    id: 'stripe_pay',
    name: 'Stripe Payments',
    purpose: 'Process online checkout payments, card tokens and refunds for StoreX.',
    status: 'ACTIVE',
    riskScore: 8,
    risk_score: 8,
    expectedRequestRate: 150,
    expected_request_rate: 150,
    current_request_rate: 150,
    allowedEndpoints: ['/payments', '/refunds'],
    allowed_endpoints: ['/payments', '/refunds'],
    allowedMethods: ['POST'],
    allowed_methods: ['POST'],
    allowedData: ['amount', 'currency', 'order_id'],
    allowed_data: ['amount', 'currency', 'order_id'],
    forbiddenData: ['full_card_number', 'cvv', 'raw_password'],
    forbidden_data: ['full_card_number', 'cvv', 'raw_password'],
    api_key: 'sec_storex_stripe_pay_key',
    testApiKey: 'sec_storex_stripe_pay_key',
  },
  fedex_delivery: {
    id: 'fedex_delivery',
    name: 'ShipFast Logistics',
    purpose: 'Generate package tracking numbers, shipping rates and dispatch orders.',
    status: 'ACTIVE',
    riskScore: 8,
    risk_score: 8,
    expectedRequestRate: 80,
    expected_request_rate: 80,
    current_request_rate: 80,
    allowedEndpoints: ['/orders', '/delivery/shipments'],
    allowed_endpoints: ['/orders', '/delivery/shipments'],
    allowedMethods: ['GET', 'POST'],
    allowed_methods: ['GET', 'POST'],
    allowedData: ['order_id', 'recipient_name', 'delivery_address'],
    allowed_data: ['order_id', 'recipient_name', 'delivery_address'],
    forbiddenData: ['card_number', 'cvv', 'password_hash'],
    forbidden_data: ['card_number', 'cvv', 'password_hash'],
    api_key: 'sec_storex_fedex_delivery_key',
    testApiKey: 'sec_storex_fedex_delivery_key',
  },
  segment_analytics: {
    id: 'segment_analytics',
    name: 'Segment Analytics (3-Yr Legacy Trial)',
    purpose: 'Collect storefront clickstream metrics and user session events.',
    status: 'ACTIVE',
    riskScore: 88,
    risk_score: 88,
    expectedRequestRate: 200,
    expected_request_rate: 200,
    current_request_rate: 200,
    allowedEndpoints: ['/analytics/events'],
    allowed_endpoints: ['/analytics/events'],
    allowedMethods: ['POST'],
    allowed_methods: ['POST'],
    allowedData: ['anonymous_user_id', 'page', 'event'],
    allowed_data: ['anonymous_user_id', 'page', 'event'],
    forbiddenData: ['payment_info', 'phone_number', 'customer_address'],
    forbidden_data: ['payment_info', 'phone_number', 'customer_address'],
    api_key: 'sec_storex_segment_analytics_key',
    testApiKey: 'sec_storex_segment_analytics_key',
  },
  klaviyo_marketing: {
    id: 'klaviyo_marketing',
    name: 'Klaviyo Marketing',
    purpose: 'Send automated order receipt emails and promo campaign notifications.',
    status: 'ACTIVE',
    riskScore: 76,
    risk_score: 76,
    expectedRequestRate: 95,
    expected_request_rate: 95,
    current_request_rate: 95,
    allowedEndpoints: ['/campaigns', '/subscribers'],
    allowed_endpoints: ['/campaigns', '/subscribers'],
    allowedMethods: ['POST'],
    allowed_methods: ['POST'],
    allowedData: ['campaign_id', 'email', 'first_name'],
    allowed_data: ['campaign_id', 'email', 'first_name'],
    forbiddenData: ['payment_details', 'card_cvv'],
    forbidden_data: ['payment_details', 'card_cvv'],
    api_key: 'sec_storex_klaviyo_marketing_key',
    testApiKey: 'sec_storex_klaviyo_marketing_key',
  },
  storex_sales_agent_skill: {
    id: 'storex_sales_agent_skill',
    name: 'StoreX Sales AI Agent Skill',
    purpose: 'Autonomous sales assistant executing checkout recommendations, cart updates & product lookup.',
    status: 'ACTIVE',
    riskScore: 82,
    risk_score: 82,
    expectedRequestRate: 300,
    expected_request_rate: 300,
    current_request_rate: 300,
    allowedEndpoints: ['/agent/recommend', '/agent/cart-checkout'],
    allowed_endpoints: ['/agent/recommend', '/agent/cart-checkout'],
    allowedMethods: ['POST'],
    allowed_methods: ['POST'],
    allowedData: ['item_sku', 'session_token', 'quantity'],
    allowed_data: ['item_sku', 'session_token', 'quantity'],
    forbiddenData: ['full_credit_card', 'customer_password_hash'],
    forbidden_data: ['full_credit_card', 'customer_password_hash'],
    api_key: 'sec_storex_storex_sales_agent_skill_key',
    testApiKey: 'sec_storex_storex_sales_agent_skill_key',
  },
};

const INITIAL_INTEGRATIONS: Record<string, IntegrationRecord> = { ...DEFAULT_STOREX_CONNECTORS };

// Mutable runtime registry in memory
export const integrationRegistry: Record<string, IntegrationRecord> = { ...DEFAULT_STOREX_CONNECTORS };

export function getAllIntegrations(): IntegrationRecord[] {
  return Object.values(integrationRegistry);
}

export function getIntegrationById(id: string): IntegrationRecord | null {
  return integrationRegistry[id] || null;
}

export function getIntegrationByApiKey(apiKey: string): IntegrationRecord | null {
  if (!apiKey) return null;
  const cleanKey = apiKey.trim();
  return (
    Object.values(integrationRegistry).find(
      item => item.testApiKey === cleanKey || item.api_key === cleanKey
    ) || null
  );
}

export function updateIntegrationStatus(
  id: string,
  status: IntegrationStatus,
  riskScore?: number
): IntegrationRecord | null {
  const item = integrationRegistry[id];
  if (!item) return null;

  item.status = status;
  if (typeof riskScore === 'number') {
    item.riskScore = riskScore;
    item.risk_score = riskScore;
  }
  item.updatedAt = new Date().toISOString();
  return item;
}

export function resetIntegration(id: string): IntegrationRecord | null {
  const initial = INITIAL_INTEGRATIONS[id];
  if (!initial) return null;
  integrationRegistry[id] = JSON.parse(JSON.stringify(initial));
  integrationRegistry[id].updatedAt = new Date().toISOString();
  return integrationRegistry[id];
}

export function resetAllIntegrations(): void {
  for (const id of Object.keys(INITIAL_INTEGRATIONS)) {
    resetIntegration(id);
  }
}
