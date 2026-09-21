import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { supabase, isSupabaseConfigured } from '../supabase.js';
import { demoEvents } from './events.js';
import { getAllTrustProfiles, getTrustProfileById } from '../lib/trustProfileStore.js';

export const integrationsRouter = Router();

import { integrationRegistry } from '../integrations/registry.js';

// Single source of truth integration registry
export const fallbackIntegrations: Record<string, any> = integrationRegistry;

/**
 * Format an integration row to be compatible with both camelCase and snake_case consumers
 */
function formatIntegration(item: any) {
  const allowedEndpoints = item.allowed_endpoints || item.allowedEndpoints || [];
  const allowedMethods = item.allowed_methods || item.allowedMethods || ['GET', 'POST'];
  const allowedData = item.allowed_data || item.allowedData || [];
  const forbiddenData = item.forbidden_data || item.forbiddenData || [];
  const expectedRate = item.expected_request_rate ?? item.expectedRequestRate ?? 100;
  const riskScore = item.risk_score ?? item.riskScore ?? 0;
  const status = item.status || 'ACTIVE';
  const timestamp = item.updated_at || item.updatedAt || item.created_at || new Date().toISOString();

  return {
    id: item.id,
    name: item.name,
    purpose: item.purpose,
    status,
    risk_score: riskScore,
    riskScore,
    expected_request_rate: expectedRate,
    expectedRequestRate: expectedRate,
    currentRequestRate: expectedRate,
    requestsPerMin: expectedRate,
    allowed_endpoints: allowedEndpoints,
    allowedEndpoints,
    allowed_methods: allowedMethods,
    allowedMethods,
    allowed_data: allowedData,
    allowedData,
    forbidden_data: forbiddenData,
    forbiddenData,
    created_at: item.created_at || timestamp,
    updated_at: timestamp,
    lastActivity: timestamp,
  };
}

/**
 * GET /api/integrations
 * Retrieves all registered integrations with optional status, search, and sort filters
 */
integrationsRouter.get('/', async (req: Request, res: Response) => {
  const { status, search, sort } = req.query;

  try {
    let list: any[] = [];

    if (isSupabaseConfigured) {
      let query = supabase.from('integrations').select('*');
      if (status) {
        query = query.eq('status', String(status).toUpperCase());
      }
      if (sort === 'rate') {
        query = query.order('expected_request_rate', { ascending: false });
      } else if (sort === 'name') {
        query = query.order('name', { ascending: true });
      } else {
        query = query.order('risk_score', { ascending: false });
      }

      const { data, error } = await query;
      if (!error && data) {
        list = data.map(formatIntegration);
      }
    }

    if (!isSupabaseConfigured && list.length === 0) {
      const profiles = await getAllTrustProfiles();
      list = profiles.map(profile => ({
        id: profile.id,
        name: profile.name,
        purpose: profile.purpose,
        status: fallbackIntegrations[profile.id]?.status || 'ACTIVE',
        risk_score: fallbackIntegrations[profile.id]?.risk_score ?? 0,
        riskScore: fallbackIntegrations[profile.id]?.riskScore ?? 0,
        expected_request_rate: profile.expectedRequestRate,
        expectedRequestRate: profile.expectedRequestRate,
        currentRequestRate: profile.expectedRequestRate,
        requestsPerMin: profile.expectedRequestRate,
        allowed_endpoints: profile.allowedEndpoints,
        allowedEndpoints: profile.allowedEndpoints,
        allowed_methods: profile.allowedMethods,
        allowedMethods: profile.allowedMethods,
        allowed_data: profile.allowedData,
        allowedData: profile.allowedData,
        forbidden_data: profile.forbiddenData,
        forbiddenData: profile.forbiddenData,
        created_at: fallbackIntegrations[profile.id]?.created_at || new Date().toISOString(),
        updated_at: fallbackIntegrations[profile.id]?.updated_at || new Date().toISOString(),
        lastActivity: fallbackIntegrations[profile.id]?.updated_at || new Date().toISOString(),
      }));
      if (status) {
        const filterStatus = String(status).toUpperCase();
        list = list.filter(i => i.status === filterStatus);
      }
      if (sort === 'rate') {
        list.sort((a, b) => b.expectedRequestRate - a.expectedRequestRate);
      } else if (sort === 'name') {
        list.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        list.sort((a, b) => b.riskScore - a.riskScore);
      }
    }

    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter(
        i =>
          i.name.toLowerCase().includes(q) ||
          i.purpose.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q)
      );
    }

    return res.status(200).json(list);
  } catch (err: any) {
    return res.status(500).json({ error: err.message, code: 'INTEGRATIONS_FETCH_FAILED' });
  }
});

/**
 * GET /api/integrations/:id
 * Retrieves detailed profile, current vs expected rates, and recent violations
 */
integrationsRouter.get('/:id', async (req: Request, res: Response) => {
  const id = req.params.id;

  try {
    let integration: any = null;
    let recentViolations: any[] = [];

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('integrations').select('*').eq('id', id).maybeSingle();
      if (!error && data) {
        integration = data;
        const { data: events } = await supabase
          .from('security_events')
          .select('*')
          .eq('integration_id', id)
          .order('created_at', { ascending: false })
          .limit(5);
        recentViolations = events || [];
      }
    }

    if (!integration) {
      integration = fallbackIntegrations[id] ?? null;
    }

    if (!integration) {
      const storedProfile = await getTrustProfileById(id);
      if (storedProfile) {
        integration = {
          ...fallbackIntegrations[id],
          ...storedProfile,
          id,
          allowed_endpoints: storedProfile.allowedEndpoints,
          allowed_methods: storedProfile.allowedMethods,
          allowed_data: storedProfile.allowedData,
          forbidden_data: storedProfile.forbiddenData,
          expected_request_rate: storedProfile.expectedRequestRate,
        };
      }
    }

    if (!integration) {
      return res.status(404).json({ error: `Integration with id '${id}' not found`, code: 'NOT_FOUND' });
    }

    const formatted = formatIntegration(integration);
    const expectedRate = formatted.expectedRequestRate;
    const currentRate = integration.current_request_rate ?? expectedRate;

    return res.status(200).json({
      profile: formatted,
      behaviour: {
        normalRate: expectedRate,
        currentRate,
        deviationMultiple: Number((currentRate / Math.max(1, expectedRate)).toFixed(2)),
      },
      recentViolations: recentViolations.map(v => ({
        id: v.id,
        integrationId: v.integration_id,
        eventType: v.event_type,
        endpoint: v.endpoint,
        riskScore: v.risk_score,
        action: v.action,
        reason: v.reason,
        createdAt: v.created_at,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, code: 'INTEGRATION_GET_FAILED' });
  }
});

/**
 * GET /api/integrations/:id/history
 * Provides chronological risk and traffic trend series points for live charts
 */
integrationsRouter.get('/:id/history', async (req: Request, res: Response) => {
  const id = req.params.id;
  let integration = fallbackIntegrations[id];

  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase.from('integrations').select('*').eq('id', id).single();
      if (data) integration = data;
    } catch (err) {
      console.error('[integrations] History fetch error:', err);
    }
  }

  if (!integration) {
    return res.status(404).json({ error: `Integration with id '${id}' not found`, code: 'NOT_FOUND' });
  }

  const normal = Number(integration.expected_request_rate || integration.expectedRequestRate || 100);
  const currentRate = Number(integration.current_request_rate ?? normal);
  const currentRisk = Number(integration.risk_score ?? integration.riskScore ?? 0);

  const intervals = [
    { label: '-50m', volume: Math.round(normal * 0.94), risk: Math.min(currentRisk, 8) },
    { label: '-40m', volume: Math.round(normal * 1.04), risk: Math.min(currentRisk, 10) },
    { label: '-30m', volume: Math.round(normal * 0.9), risk: Math.min(currentRisk, 12) },
    { label: '-20m', volume: Math.round(normal * 1.4), risk: Math.min(currentRisk, 25) },
    { label: '-10m', volume: Math.round(normal * 2.1), risk: Math.max(Math.min(currentRisk, 50), 15) },
    { label: 'now', volume: currentRate, risk: currentRisk },
  ];

  return res.status(200).json({
    integrationId: id,
    normalRate: normal,
    currentRate,
    currentRisk,
    history: intervals.map(int => ({
      t: int.label,
      v: int.volume,
      volume: int.volume,
      risk: int.risk,
      normalRate: normal,
    })),
  });
});

/**
 * POST /api/integrations
 * Registers a new integration and initializes trust profile with sanitized parameters
 */
integrationsRouter.post('/', async (req: Request, res: Response) => {
  const {
    id,
    name,
    purpose,
    expectedRequestRate,
    allowedEndpoints = [],
    allowedMethods = ['GET', 'POST'],
    allowedData = [],
    forbiddenData = [],
  } = req.body || {};

  if (!id || !name || !purpose) {
    return res.status(400).json({
      error: 'Missing required fields: id, name, and purpose are mandatory.',
      code: 'INVALID_INPUT',
    });
  }

  // Defensive input sanitization & hygiene
  const cleanId = String(id).trim().toLowerCase();
  const cleanName = String(name).trim();
  const cleanPurpose = String(purpose).trim();
  const cleanRate = Number(expectedRequestRate) > 0 ? Number(expectedRequestRate) : 100;

  const cleanEndpoints = (Array.isArray(allowedEndpoints) ? allowedEndpoints : [])
    .map((e: any) => {
      let p = String(e).trim();
      if (!p.startsWith('/')) p = '/' + p;
      if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
      return p;
    })
    .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i);

  const cleanMethods = (Array.isArray(allowedMethods) ? allowedMethods : ['GET', 'POST'])
    .map((m: any) => String(m).trim().toUpperCase())
    .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i);

  const cleanAllowedData = (Array.isArray(allowedData) ? allowedData : [])
    .map((d: any) => String(d).trim().toLowerCase())
    .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i);

  const cleanForbiddenData = (Array.isArray(forbiddenData) ? forbiddenData : [])
    .map((d: any) => String(d).trim().toLowerCase())
    .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i);

  const now = new Date().toISOString();
  const newIntegration = {
    id: cleanId,
    name: cleanName,
    purpose: cleanPurpose,
    status: 'ACTIVE',
    risk_score: 0,
    expected_request_rate: cleanRate,
    allowed_endpoints: cleanEndpoints,
    allowed_methods: cleanMethods,
    allowed_data: cleanAllowedData,
    forbidden_data: cleanForbiddenData,
    created_at: now,
    updated_at: now,
  };

  if (isSupabaseConfigured) {
    try {
      await supabase.from('integrations').insert(newIntegration);
    } catch (dbErr) {
      console.error('[integrations] Insert error:', dbErr);
    }
  }

  fallbackIntegrations[cleanId] = newIntegration;

  return res.status(201).json(formatIntegration(newIntegration));
});

/**
 * POST /api/integrations/seed-storex
 * Seed/Connect StoreX discovered integrations into ThirdEye registry
 */
integrationsRouter.post('/seed-storex', async (req: Request, res: Response) => {
  const { projectKey, integrations } = req.body || {};
  const list = Array.isArray(integrations) ? integrations : [];

  list.forEach((item: any) => {
    const id = item.id || `storex_${item.name.toLowerCase().replace(/\s+/g, '_')}`;
    const formatted: any = {
      id,
      name: item.name,
      purpose: item.purpose || `${item.category || 'Third-Party'} connector for StoreX`,
      status: 'ACTIVE',
      risk_score: item.id === 'segment_analytics' ? 88 : item.id === 'klaviyo_marketing' ? 76 : item.id === 'storex_sales_agent_skill' ? 82 : 8,
      riskScore: item.id === 'segment_analytics' ? 88 : item.id === 'klaviyo_marketing' ? 76 : item.id === 'storex_sales_agent_skill' ? 82 : 8,
      expected_request_rate: item.expectedRate || 100,
      expectedRequestRate: item.expectedRate || 100,
      currentRequestRate: item.expectedRate || 100,
      allowed_endpoints: item.allowedEndpoints || [],
      allowedEndpoints: item.allowedEndpoints || [],
      allowed_methods: item.allowedMethods || ['GET', 'POST'],
      allowedMethods: item.allowedMethods || ['GET', 'POST'],
      allowed_data: item.allowedData || [],
      allowedData: item.allowedData || [],
      forbidden_data: item.forbiddenData || [],
      forbiddenData: item.forbiddenData || [],
      api_key: `sec_storex_${id}_key`,
      testApiKey: `sec_storex_${id}_key`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    integrationRegistry[id] = formatted;
    fallbackIntegrations[id] = formatted;
  });

  return res.status(200).json({
    success: true,
    projectKey: projectKey || 'te_proj_storex_99a8b7c6',
    count: list.length,
    message: 'StoreX project integrations successfully registered in ThirdEye!',
  });
});

/**
 * POST /api/integrations/clear
 * Clear all integrations for demo initial state
 */
integrationsRouter.post('/clear', async (req: Request, res: Response) => {
  for (const k of Object.keys(integrationRegistry)) {
    delete integrationRegistry[k];
    delete fallbackIntegrations[k];
  }
  return res.status(200).json({ success: true, count: 0, message: 'Integrations cleared for demo.' });
});

/**
 * PATCH /api/integrations/:id
 * Updates mutable fields such as expected rate or purpose
 */
integrationsRouter.patch('/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  const updates = req.body || {};
  const now = new Date().toISOString();

  const dbUpdates: any = { updated_at: now };
  if (updates.purpose !== undefined) dbUpdates.purpose = updates.purpose;
  if (updates.expectedRequestRate !== undefined)
    dbUpdates.expected_request_rate = updates.expectedRequestRate;
  if (updates.status !== undefined) dbUpdates.status = updates.status;

  if (isSupabaseConfigured) {
    try {
      await supabase.from('integrations').update(dbUpdates).eq('id', id);
    } catch (err) {
      console.error('[integrations] Update error:', err);
    }
  }

  if (fallbackIntegrations[id]) {
    fallbackIntegrations[id] = { ...fallbackIntegrations[id], ...dbUpdates };
  }

  return res.status(200).json({
    id,
    expectedRequestRate: updates.expectedRequestRate ?? fallbackIntegrations[id]?.expected_request_rate,
    purpose: updates.purpose ?? fallbackIntegrations[id]?.purpose,
    status: updates.status ?? fallbackIntegrations[id]?.status,
    updatedAt: now,
  });
});

/**
 * POST /api/integrations/:id/quarantine
 * Immediately restricts an integration by locking status to QUARANTINED
 */
integrationsRouter.post('/:id/quarantine', async (req: Request, res: Response) => {
  const id = req.params.id;
  const reason = req.body?.reason || 'Quarantine applied by security operator';
  const now = new Date().toISOString();

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('integrations')
        .update({ status: 'QUARANTINED', risk_score: 95, updated_at: now })
        .eq('id', id);
      await supabase.from('security_events').insert({
        integration_id: id,
        event_type: 'QUARANTINED',
        risk_score: 95,
        action: 'BLOCK',
        reason,
        created_at: now,
      });
    } catch (err) {
      console.error('[integrations] Quarantine error:', err);
    }
  }

  if (fallbackIntegrations[id]) {
    fallbackIntegrations[id].status = 'QUARANTINED';
    fallbackIntegrations[id].risk_score = 95;
    fallbackIntegrations[id].updated_at = now;
  }

  demoEvents.unshift({
    id: crypto.randomUUID(),
    integration_id: id,
    integrationId: id,
    endpoint: fallbackIntegrations[id]?.allowed_endpoints?.[0] || '/api',
    event_type: 'QUARANTINED',
    eventType: 'QUARANTINED',
    risk_score: 95,
    riskScore: 95,
    action: 'BLOCK',
    reason,
    created_at: now,
    createdAt: now,
  });

  return res.status(200).json({
    id,
    status: 'QUARANTINED',
    riskScore: 95,
    quarantinedAt: now,
    reason,
  });
});

/**
 * POST /api/integrations/:id/release
 * Restores an integration from quarantine back to active monitoring
 */
integrationsRouter.post('/:id/release', async (req: Request, res: Response) => {
  const id = req.params.id;
  const now = new Date().toISOString();

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('integrations')
        .update({ status: 'ACTIVE', risk_score: 8, updated_at: now })
        .eq('id', id);
      await supabase.from('security_events').insert({
        integration_id: id,
        event_type: 'RELEASED',
        risk_score: 8,
        action: 'ALLOW',
        reason: 'Restored to active state by security operator',
        created_at: now,
      });
    } catch (err) {
      console.error('[integrations] Release error:', err);
    }
  }

  if (fallbackIntegrations[id]) {
    fallbackIntegrations[id].status = 'ACTIVE';
    fallbackIntegrations[id].risk_score = 8;
    fallbackIntegrations[id].updated_at = now;
  }

  demoEvents.unshift({
    id: crypto.randomUUID(),
    integration_id: id,
    integrationId: id,
    endpoint: fallbackIntegrations[id]?.allowed_endpoints?.[0] || '/api',
    event_type: 'RELEASED',
    eventType: 'RELEASED',
    risk_score: 8,
    riskScore: 8,
    action: 'ALLOW',
    reason: 'Restored to active state by security operator',
    created_at: now,
    createdAt: now,
  });

  return res.status(200).json({
    id,
    status: 'ACTIVE',
    riskScore: 8,
    releasedAt: now,
    message: 'Integration released and restored to active state',
  });
});
