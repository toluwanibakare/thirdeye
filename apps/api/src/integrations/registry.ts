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

const INITIAL_INTEGRATIONS: Record<string, IntegrationRecord> = {};

// Mutable runtime registry in memory (starts empty until Agent Skill or UI connects)
export const integrationRegistry: Record<string, IntegrationRecord> = {};

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
