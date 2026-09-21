import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { checkRequestPure } from '../lib/riskEngine.js';
import { supabase, isSupabaseConfigured } from '../supabase.js';
import { CheckRequest } from '@thirdeye/shared';
import { fallbackIntegrations } from './integrations.js';
import { demoEvents } from './events.js';
import { getTrustProfileById } from '../lib/trustProfileStore.js';
import { integrationRegistry } from '../integrations/registry.js';

export const checkRouter = Router();

/**
 * POST /api/check-request
 * Evaluates an outgoing request to a third-party service against its registered trust profile.
 */
checkRouter.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as CheckRequest;

    if (!body || !body.integrationId || !body.endpoint || !body.method) {
      return res.status(400).json({
        error: 'Missing required attributes: integrationId, endpoint, and method are mandatory.',
        code: 'INVALID_REQUEST',
      });
    }

    let integration: any = null;

    if (isSupabaseConfigured) {
      const { data } = await supabase
        .from('integrations')
        .select('*')
        .eq('id', body.integrationId)
        .maybeSingle();
      integration = data ?? null;
    }

    if (!integration) {
      integration = fallbackIntegrations[body.integrationId] ?? null;
    }

    const profile = await getTrustProfileById(body.integrationId);

    // Direct block if integration is explicitly quarantined
    if (integration?.status === 'QUARANTINED') {
      return res.status(200).json({
        riskScore: 95,
        level: 'CRITICAL',
        action: 'BLOCK',
        violations: [
          {
            code: 'INTEGRATION_QUARANTINED',
            detail: `Integration ${body.integrationId} is quarantined. Outgoing traffic blocked.`,
            points: 95,
          },
        ],
        reason: `Integration ${body.integrationId} is currently quarantined. Outbound requests blocked.`,
      });
    }

    const result = checkRequestPure(body, profile);

    // Update in-memory fallback state for immediate consistency in offline/demo mode
    if (result.violations.length > 0) {
      const newStatus = result.level === 'CRITICAL' ? 'QUARANTINED' : 'ACTIVE';
      if (fallbackIntegrations[body.integrationId]) {
        fallbackIntegrations[body.integrationId].status = newStatus;
        fallbackIntegrations[body.integrationId].risk_score = result.riskScore;
      }
      if (integrationRegistry[body.integrationId]) {
        integrationRegistry[body.integrationId].status = newStatus;
        integrationRegistry[body.integrationId].risk_score = result.riskScore;
      }

      demoEvents.unshift({
        id: crypto.randomUUID(),
        integration_id: body.integrationId,
        integrationId: body.integrationId,
        endpoint: body.endpoint,
        event_type: result.violations[0].code,
        eventType: result.violations[0].code,
        risk_score: result.riskScore,
        riskScore: result.riskScore,
        action: result.action,
        reason: result.reason,
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }

    // Asynchronously persist telemetry without blocking evaluation response
    if (isSupabaseConfigured) {
      (async () => {
        try {
          await supabase.from('requests').insert({
            integration_id: body.integrationId,
            endpoint: body.endpoint,
            method: body.method,
            data_requested: body.dataRequested || [],
            risk_score: result.riskScore,
            action: result.action,
            reason: result.reason,
          });

          if (result.violations.length > 0 && integration) {
            await supabase.from('security_events').insert({
              integration_id: body.integrationId,
              endpoint: body.endpoint,
              event_type: result.violations[0].code,
              risk_score: result.riskScore,
              action: result.action,
              reason: result.reason,
            });

            const status =
              result.level === 'CRITICAL'
                ? 'QUARANTINED'
                : result.level === 'HIGH_RISK'
                  ? 'RATE_LIMITED'
                  : result.level === 'SUSPICIOUS'
                    ? 'MONITORED'
                    : 'ACTIVE';

            await supabase
              .from('integrations')
              .update({ risk_score: result.riskScore, status })
              .eq('id', body.integrationId);
          }
        } catch (dbError) {
          console.error('[telemetry] Failed to record request audit log:', dbError);
        }
      })();
    }

    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({
      error: err.message || 'Failed to process request evaluation',
      code: 'CHECK_FAILED',
    });
  }
});
