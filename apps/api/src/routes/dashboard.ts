import { Router, Request, Response } from 'express';
import { supabase, isSupabaseConfigured } from '../supabase.js';
import { fallbackIntegrations } from './integrations.js';
import { demoEvents } from './events.js';

export const dashboardRouter = Router();

/**
 * GET /api/dashboard/stats
 * Aggregates high-level metrics for dashboard cards
 */
dashboardRouter.get('/stats', async (_req: Request, res: Response) => {
  try {
    if (isSupabaseConfigured) {
      const { data: integrations } = await supabase.from('integrations').select('id,status,risk_score');
      const { count: threats } = await supabase
        .from('security_events')
        .select('id', { count: 'exact', head: true });
      const { count: monitored } = await supabase
        .from('requests')
        .select('id', { count: 'exact', head: true });

      const list = integrations || [];
      const total = list.length;
      const active = list.filter(i => i.status === 'ACTIVE').length;
      const quarantined = list.filter(i => i.status === 'QUARANTINED').length;
      const totalThreats = total === 0 ? 0 : (threats || 0);
      const totalMonitored = total === 0 ? 0 : (monitored || 0);

      return res.status(200).json({
        integrations: total,
        totalIntegrations: total,
        active,
        activeIntegrations: active,
        monitoredRequests: totalMonitored,
        threats: totalThreats,
        totalThreats,
        quarantined,
        quarantinedIntegrations: quarantined,
      });
    }

    const fallbackList = Object.values(fallbackIntegrations);
    const total = fallbackList.length;
    const active = fallbackList.filter((i: any) => i.status === 'ACTIVE').length;
    const quarantined = fallbackList.filter((i: any) => i.status === 'QUARANTINED').length;
    const threats = total === 0 ? 0 : demoEvents.length;

    return res.status(200).json({
      integrations: total,
      totalIntegrations: total,
      active,
      activeIntegrations: active,
      monitoredRequests: total === 0 ? 0 : 12480,
      threats,
      totalThreats: threats,
      quarantined,
      quarantinedIntegrations: quarantined,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, code: 'STATS_FETCH_FAILED' });
  }
});

/**
 * GET /api/dashboard/activity
 * Provides a combined reverse-chronological activity feed
 */
dashboardRouter.get('/activity', async (req: Request, res: Response) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));

  try {
    if (isSupabaseConfigured) {
      const { data: requests, error } = await supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && requests) {
        const activity = requests.map(r => ({
          id: r.id,
          type: r.action === 'ALLOW' ? 'NORMAL' : 'VIOLATION',
          integrationId: r.integration_id,
          endpoint: r.endpoint,
          action: r.action,
          riskScore: r.risk_score,
          reason: r.reason || 'Request evaluated',
          timestamp: r.created_at,
        }));
        return res.status(200).json(activity);
      }
    }

    const fallbackList = Object.values(fallbackIntegrations);
    if (fallbackList.length === 0) {
      return res.status(200).json([]);
    }

    const now = Date.now();
    return res.status(200).json([
      {
        id: 'act-001',
        type: 'VIOLATION',
        integrationId: 'analytics_001',
        integrationName: 'Analytics Provider',
        endpoint: '/customers/payment-details',
        action: 'BLOCK',
        riskScore: 95,
        reason: 'Forbidden data: payment, phone, address',
        timestamp: new Date(now - 60000).toISOString(),
      },
      {
        id: 'act-002',
        type: 'NORMAL',
        integrationId: 'payment_001',
        integrationName: 'Payment Provider',
        endpoint: '/payments/status',
        action: 'ALLOW',
        riskScore: 5,
        reason: 'Matches Payment Provider trust profile',
        timestamp: new Date(now - 120000).toISOString(),
      },
      {
        id: 'act-003',
        type: 'NORMAL',
        integrationId: 'delivery_001',
        integrationName: 'Delivery Provider',
        endpoint: '/orders',
        action: 'ALLOW',
        riskScore: 10,
        reason: 'Matches Delivery Provider trust profile',
        timestamp: new Date(now - 180000).toISOString(),
      },
    ]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message, code: 'ACTIVITY_FETCH_FAILED' });
  }
});
