import { getDeploymentVersion } from '@/lib/version';
import { query, withTransaction } from '@/lib/local/db';
import type { PoolClient } from 'pg';
import { getUsdToCnyRate } from '@/lib/usage/fx';

export type ReportType = 'daily' | 'weekly' | 'monthly';
export type ReportRevision = { reportType: ReportType; periodStart: Date; periodEnd: Date; revision: number; isFinal: boolean };
export type ReportJobResult = { status: 'succeeded' | 'skipped' | 'failed'; reportRunId?: string; reportType: ReportType; revision: number; error?: string; recomputed?: boolean };

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
// Legacy chat rows and ledger rows were dual-written before this cutoff; only
// count the legacy table before it to prevent historical double counting.
// 迁移前聊天同时写入两张表；截止时间前才读取旧表，避免历史数据重复统计。
const LEGACY_USAGE_CUTOFF = '2026-07-15T10:56:12+08:00';
const REPORT_SCHEMA_VERSION = '1';
const STALE_RUNNING_MS = 30 * 60 * 1000;
const MAX_GENERATED_REPORTS_PER_RUN = 4;

type DateParts = { year: number; month: number; day: number; weekday: number; hour: number; minute: number };

function dateParts(date: Date): DateParts {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(date).reduce<Record<string, string>>((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  const weekday = ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[formatted.weekday];
  return {
    year: Number(formatted.year),
    month: Number(formatted.month),
    day: Number(formatted.day),
    weekday: weekday ?? 0,
    hour: Number(formatted.hour),
    minute: Number(formatted.minute),
  };
}

function shanghaiDayStart(date: Date) {
  const parts = dateParts(date);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day) - SHANGHAI_OFFSET_MS);
}

function shanghaiMonthStart(date: Date, monthOffset = 0) {
  const parts = dateParts(date);
  return new Date(Date.UTC(parts.year, parts.month - 1 + monthOffset, 1) - SHANGHAI_OFFSET_MS);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function previousWindow(type: ReportType, now: Date, distance: number): { start: Date; end: Date } {
  if (type === 'daily') {
    const end = addDays(shanghaiDayStart(now), -(distance - 1));
    return { start: addDays(end, -1), end };
  }
  if (type === 'weekly') {
    const today = shanghaiDayStart(now);
    const currentMonday = addDays(today, -(dateParts(now).weekday === 0 ? 6 : dateParts(now).weekday - 1));
    const end = addDays(currentMonday, -7 * (distance - 1));
    return { start: addDays(end, -7), end };
  }
  const end = shanghaiMonthStart(now, -(distance - 1));
  return { start: shanghaiMonthStart(now, -distance), end };
}

function minutesSinceMidnight(date: Date) {
  const parts = dateParts(date);
  return parts.hour * 60 + parts.minute;
}

function job(reportType: ReportType, window: { start: Date; end: Date }, revision: number, isFinal: boolean): ReportRevision {
  return { reportType, periodStart: window.start, periodEnd: window.end, revision, isFinal };
}

/** Returns catch-up jobs; missing periods are safe because claimReportRun is idempotent. */
export function getDueReportJobs(now = new Date()): ReportRevision[] {
  const parts = dateParts(now);
  const minute = minutesSinceMidnight(now);
  const jobs: ReportRevision[] = [];

  if (minute >= 15) {
    jobs.push(job('daily', previousWindow('daily', now, 1), 0, false));
    for (let distance = 2; distance <= 14; distance += 1) {
      jobs.push(job('daily', previousWindow('daily', now, distance), 1, true));
    }
  }

  const mondayOrLater = parts.weekday >= 1;
  if (mondayOrLater && minute >= 30) {
    jobs.push(job('weekly', previousWindow('weekly', now, 1), 0, false));
  }
  if (parts.weekday >= 3 && minute >= 30) {
    for (let distance = 1; distance <= 8; distance += 1) {
      jobs.push(job('weekly', previousWindow('weekly', now, distance), 1, true));
    }
  }

  if (parts.day >= 1 && minute >= 45) jobs.push(job('monthly', previousWindow('monthly', now, 1), 0, false));
  if (parts.day >= 3 && minute >= 45) {
    for (let distance = 1; distance <= 12; distance += 1) {
      jobs.push(job('monthly', previousWindow('monthly', now, distance), 1, true));
    }
  }
  return jobs;
}

function numberValue(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function fixed(value: unknown, digits = 6) {
  return Number(numberValue(value).toFixed(digits));
}

function errorMessage(value: unknown) {
  return typeof value === 'string' ? value.slice(0, 1_000) : '';
}

async function claimReportRun(spec: ReportRevision) {
  return withTransaction(async (client) => {
    await client.query("set local statement_timeout = '10s'");
    await client.query("set local lock_timeout = '5s'");
    // Coordinate the creation window with ingestion; report reads run outside this lock.
    // 创建任务时与事件入库互斥，报表读取不持有此锁。
    await client.query("select pg_advisory_xact_lock(hashtext('fg-observability-report-claim'))");
    const existing = await client.query<{ id: string; status: string; updated_at: string; summary: unknown }>(
      `select id, status, updated_at, summary
         from report_runs
        where report_type = $1 and period_start = $2 and period_end = $3 and revision = $4`,
      [spec.reportType, spec.periodStart.toISOString(), spec.periodEnd.toISOString(), spec.revision],
    );
    const current = existing.rows[0];
    if (current?.status === 'succeeded') return null;
    if (current?.status === 'running' && Date.now() - new Date(current.updated_at).getTime() < STALE_RUNNING_MS) return null;

    if (current) {
      const updated = await client.query<{ id: string; watermark: string; lease: string }>(
        `update report_runs
            set status = 'running', is_final = $1, data_as_of = clock_timestamp(), error = null, updated_at = now()
          where id = $2
            and (status = 'failed' or updated_at < now() - interval '30 minutes')
        returning id, data_as_of::text as watermark, updated_at::text as lease`,
        [spec.isFinal, current.id],
      );
      return updated.rows[0] ? { ...updated.rows[0], recomputed: Object.keys(recordValue(current.summary) || {}).length > 0 } : null;
    }

    const inserted = await client.query<{ id: string; watermark: string; lease: string }>(
      `insert into report_runs
        (report_type, period_start, period_end, revision, status, is_final, data_as_of, schema_version)
       values ($1, $2, $3, $4, 'running', $5, clock_timestamp(), $6)
       on conflict (report_type, period_start, period_end, revision) do nothing
       returning id, data_as_of::text as watermark, updated_at::text as lease`,
      [spec.reportType, spec.periodStart.toISOString(), spec.periodEnd.toISOString(), spec.revision, spec.isFinal, REPORT_SCHEMA_VERSION],
    );
    return inserted.rows[0] ? { ...inserted.rows[0], recomputed: false } : null;
  });
}

type AccountRow = {
  user_id: string;
  account_email: string;
  platform_role: string;
  activity_kind: 'ai' | 'session_only' | 'ai_and_session';
  audit_records: string | number;
  usage_calls: string | number;
  successful_calls: string | number;
  failed_calls: string | number;
  in_progress_calls: string | number;
  unknown_calls: string | number;
  input_tokens: string | number;
  output_tokens: string | number;
  total_tokens: string | number;
  image_count: string | number;
  video_seconds: string | number;
  duration_ms: string | number;
  confirmed_cost_usd: string | number;
  estimated_cost_usd: string | number;
  reserved_cost_usd: string | number;
  unknown_cost_calls: string | number;
  error_count: string | number;
};

async function accountRows(spec: ReportRevision, client: PoolClient) {
  const result = await client.query<AccountRow>(
    `with usage_facts as (
       select user_id, kind, status, input_tokens, output_tokens, total_tokens,
              image_count, video_seconds, duration_ms, reported_cost_usd,
              estimated_cost_usd, cost_source
         from ai_usage_ledger
        where created_at >= $1 and created_at < $2
       union all
       select user_id, 'text', 'succeeded', input_tokens, completion_tokens, total_tokens,
              0, 0, 0, null, null, 'unknown'
         from ai_usage
        where user_id is not null
          and created_at >= $1 and created_at < $2
          and created_at < $3
     ), usage_rollup as (
       select user_id,
              count(*) as usage_calls,
              count(*) filter (where status = 'succeeded') as successful_calls,
              count(*) filter (where status = 'failed') as failed_calls,
              count(*) filter (where status in ('submitted', 'running', 'unknown')) as in_progress_calls,
              count(*) filter (where status = 'unknown') as unknown_calls,
              coalesce(sum(input_tokens), 0) as input_tokens,
              coalesce(sum(output_tokens), 0) as output_tokens,
              coalesce(sum(total_tokens), 0) as total_tokens,
              coalesce(sum(image_count), 0) as image_count,
              coalesce(sum(video_seconds), 0) as video_seconds,
              coalesce(sum(duration_ms), 0) as duration_ms,
              coalesce(sum(case when reported_cost_usd is not null then abs(reported_cost_usd) else 0 end), 0) as confirmed_cost_usd,
              coalesce(sum(case when reported_cost_usd is null then coalesce(abs(estimated_cost_usd), 0) else 0 end), 0) as estimated_cost_usd,
              coalesce(sum(case when status in ('submitted', 'running', 'unknown', 'succeeded') then coalesce(abs(reported_cost_usd), abs(estimated_cost_usd), 0) else 0 end), 0) as reserved_cost_usd,
              count(*) filter (where reported_cost_usd is null and estimated_cost_usd is null) as unknown_cost_calls
         from usage_facts
        group by user_id
     ), audit_rollup as (
       select actor_id as user_id, count(*) as audit_records
         from audit_events
        where actor_id is not null and occurred_at >= $1 and occurred_at < $2
        group by actor_id
     ), session_rollup as (
       select actor_id as user_id
         from audit_events
        where actor_id is not null and occurred_at >= $1 and occurred_at < $2
          and feature like 'creator_session%'
        group by actor_id
     ), error_rollup as (
       select user_id, count(*) as error_count
         from observability_error_events
        where user_id is not null and occurred_at >= $1 and occurred_at < $2
        group by user_id
       union all
       select actor_id, count(*)
         from audit_events
        where actor_id is not null and occurred_at >= $1 and occurred_at < $2
          and (outcome in ('failed', 'rejected', 'unknown') or (error is not null and error <> 'null'::jsonb))
        group by actor_id
     ), error_totals as (
       select user_id, sum(error_count) as error_count
         from error_rollup
        group by user_id
     ), active_users as (
       select user_id from usage_rollup
       union select user_id from audit_rollup
       union select user_id from error_totals
     )
     select active_users.user_id,
            coalesce(profiles.email, '[已删除账户]') as account_email,
            coalesce(profiles.platform_role, 'user') as platform_role,
            case when usage_rollup.user_id is null then 'session_only'
                 when session_rollup.user_id is not null then 'ai_and_session'
                 else 'ai' end as activity_kind,
            coalesce(audit_rollup.audit_records, 0) as audit_records,
            coalesce(usage_rollup.usage_calls, 0) as usage_calls,
            coalesce(usage_rollup.successful_calls, 0) as successful_calls,
            coalesce(usage_rollup.failed_calls, 0) as failed_calls,
            coalesce(usage_rollup.in_progress_calls, 0) as in_progress_calls,
            coalesce(usage_rollup.unknown_calls, 0) as unknown_calls,
            coalesce(usage_rollup.input_tokens, 0) as input_tokens,
            coalesce(usage_rollup.output_tokens, 0) as output_tokens,
            coalesce(usage_rollup.total_tokens, 0) as total_tokens,
            coalesce(usage_rollup.image_count, 0) as image_count,
            coalesce(usage_rollup.video_seconds, 0) as video_seconds,
            coalesce(usage_rollup.duration_ms, 0) as duration_ms,
            coalesce(usage_rollup.confirmed_cost_usd, 0) as confirmed_cost_usd,
            coalesce(usage_rollup.estimated_cost_usd, 0) as estimated_cost_usd,
            coalesce(usage_rollup.reserved_cost_usd, 0) as reserved_cost_usd,
            coalesce(usage_rollup.unknown_cost_calls, 0) as unknown_cost_calls,
            coalesce(error_totals.error_count, 0) as error_count
       from active_users
       left join profiles on profiles.id = active_users.user_id
       left join usage_rollup on usage_rollup.user_id = active_users.user_id
       left join audit_rollup on audit_rollup.user_id = active_users.user_id
       left join session_rollup on session_rollup.user_id = active_users.user_id
       left join error_totals on error_totals.user_id = active_users.user_id
      order by reserved_cost_usd desc, usage_calls desc, account_email asc`,
    [spec.periodStart.toISOString(), spec.periodEnd.toISOString(), LEGACY_USAGE_CUTOFF],
  );
  return result.rows;
}

type ErrorRow = {
  fingerprint: string;
  source: string;
  service: string;
  severity: string;
  impact: string;
  code: string | null;
  message: string;
  first_occurred_at: string | null;
  last_occurred_at: string | null;
  occurrences: string | number;
  affected_accounts: string | number;
  affected_requests: string | number;
  affected_tasks: string | number;
  sample_trace_id: string | null;
  sample: unknown;
  affected_account_emails?: string[] | null;
  metadata?: unknown;
};

function stringValues(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
}

function errorAccountEmails(row: Pick<ErrorRow, 'affected_account_emails' | 'metadata'>) {
  const direct = stringValues(row.affected_account_emails);
  if (direct.length) return direct;
  if (!row.metadata || typeof row.metadata !== 'object' || Array.isArray(row.metadata)) return [];
  return stringValues((row.metadata as Record<string, unknown>).affectedAccountEmails);
}

function recordValue(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function errorSample(row: Pick<ErrorRow, 'sample' | 'metadata'>) {
  return recordValue(row.sample) || recordValue(recordValue(row.metadata)?.sample);
}

function errorGroupKey(row: Pick<ErrorRow, 'fingerprint' | 'source' | 'service' | 'severity' | 'impact'>) {
  return [row.fingerprint, row.source, row.service, row.severity, row.impact].join('\u001f');
}

async function errorRows(spec: ReportRevision, client: PoolClient) {
  const result = await client.query<ErrorRow>(
    `with service_seed as (
       select distinct on (host, service, check_name) *
         from observability_service_events
        where observed_at < $1 and observed_at >= $1::timestamptz - interval '90 seconds'
        order by host, service, check_name, observed_at desc, id desc
     ), period_service_events as (
       select *, row_number() over (partition by host, service, check_name order by observed_at, id) as period_rank
         from observability_service_events
        where observed_at >= $1 and observed_at < $2
     ), service_error_candidates as (
       select observed_at, host, service, check_name, state, message, event_key, metadata,
              id, observed_at as source_observed_at,
              period_rank = 1 and previous_state = 'unhealthy' as ongoing
         from period_service_events
        where state = 'unhealthy'
          and (period_rank = 1 or not (
            service in ('tunnel', 'public-media')
            and coalesce(previous_state = 'unhealthy', false)
            and coalesce(metadata->'monitorHeartbeat' = 'true'::jsonb, false)
          ))
       union all
       select $1::timestamptz, seed.host, seed.service, seed.check_name, seed.state, seed.message,
              seed.event_key, seed.metadata, seed.id, seed.observed_at, true
         from service_seed seed
        where seed.state = 'unhealthy'
          and not exists (
            select 1 from period_service_events current
             where current.host = seed.host and current.service = seed.service and current.check_name = seed.check_name
               and current.period_rank = 1
               and (current.state = 'unhealthy' or current.observed_at = $1::timestamptz)
          )
     ), report_service_errors as (
       select candidate.observed_at, candidate.service, candidate.check_name, candidate.state,
              candidate.message, candidate.event_key,
              case when candidate.ongoing then coalesce(candidate.metadata, '{}'::jsonb) || jsonb_build_object(
                'ongoing', true, 'sourceObservedAt', candidate.source_observed_at,
                'sourceEventId', candidate.id,
                'incidentStartedAt', (
                  select original.observed_at from observability_service_events original
                   where original.host = candidate.host and original.service = candidate.service
                     and original.check_name = candidate.check_name and original.state = 'unhealthy'
                     and coalesce(original.previous_state, 'healthy') <> 'unhealthy'
                     and (original.observed_at, original.id) <= (candidate.source_observed_at, candidate.id)
                   order by original.observed_at desc, original.id desc limit 1
                )
              ) else candidate.metadata end as metadata
         from service_error_candidates candidate
     ), raw_errors as (
       select occurred_at, source, service, severity, impact, fingerprint, code, message,
              user_id, request_id, task_id, trace_id,
              event_key::text as sample_event_id, route as sample_route, stack as sample_stack,
              feature as sample_feature, action as sample_action, null::text as sample_stage,
              severity as sample_outcome, null::jsonb as sample_parameters, null::jsonb as sample_data,
              metadata as sample_metadata
         from observability_error_events
        where occurred_at >= $1 and occurred_at < $2
       union all
       select occurred_at,
              case when feature like 'creator_video%' then 'provider'
                   when feature like '%usage%' then 'billing' else 'app' end,
              coalesce(feature, 'app'),
              case when outcome = 'rejected' then 'warning' else 'error' end,
              case when outcome = 'unknown' then 'unknown' else 'blocked' end,
              md5(concat_ws('|', 'audit', feature, action, stage, outcome, coalesce(error->>'message', ''))),
              nullif(error->>'code', ''),
              left(coalesce(nullif(error->>'message', ''), feature || ' ' || stage || ' ' || outcome), 1000),
              actor_id, trace_id,
              case when resource_type = 'creator_generation_task' then resource_id else null end,
              trace_id, event_id::text, coalesce(data->>'route', metadata->>'route'),
              nullif(error->>'stack', ''), feature, action, stage, outcome, parameters, data, metadata
         from audit_events
        where occurred_at >= $1 and occurred_at < $2
          and (outcome in ('failed', 'rejected', 'unknown') or (error is not null and error <> 'null'::jsonb))
       union all
       select coalesce(completed_at, updated_at, created_at), 'provider', 'generation_task', 'error',
              case when status = 'unknown' then 'unknown' else 'blocked' end,
              md5(concat_ws('|', 'task', model, status, coalesce(error, ''))),
              null, left(coalesce(nullif(error, ''), 'task status ' || status), 1000),
              user_id, null, id::text, null, null::text, null::text, null::text,
              'generation_task', 'status', status, status, request, output,
              jsonb_build_object('provider', provider, 'model', model, 'externalTaskId', external_task_id)
         from creator_generation_tasks task
        where status in ('failed', 'unknown')
          and coalesce(completed_at, updated_at, created_at) >= $1
          and coalesce(completed_at, updated_at, created_at) < $2
          and not exists (
            select 1 from audit_events audit
             where audit.resource_id = task.id::text
               and audit.outcome in ('failed', 'rejected', 'unknown')
          )
       union all
       select observed_at, 'infra', service, 'error',
              case when service in ('app', 'postgres') then 'blocked' else 'degraded' end,
              md5(concat_ws('|', 'service', service, check_name, state)),
              state, left(message, 1000), null::uuid, null::text, null::text, null::text,
              event_key::text, null::text, null::text, 'service.health', check_name, state, state,
              null::jsonb, null::jsonb, metadata
         from report_service_errors
     ), raw_errors_with_accounts as (
       select raw_errors.*,
              case when raw_errors.user_id is null then null
                   else coalesce(nullif(profiles.email, ''), '[已删除账户]') end as account_email
         from raw_errors
         left join profiles on profiles.id = raw_errors.user_id
     ), ranked_errors as (
       select raw_errors_with_accounts.*,
              row_number() over (
                partition by fingerprint, source, service, severity, impact
                order by occurred_at desc, sample_event_id desc nulls last
              ) as sample_rank
         from raw_errors_with_accounts
     )
     select fingerprint, source, service, severity, impact, max(code) as code,
            max(message) as message, min(occurred_at) as first_occurred_at,
            max(occurred_at) as last_occurred_at, count(*) as occurrences,
            count(distinct user_id) as affected_accounts,
            array_agg(distinct account_email order by account_email)
              filter (where user_id is not null) as affected_account_emails,
            count(distinct coalesce(request_id, trace_id)) as affected_requests,
            count(distinct task_id) as affected_tasks,
            max(trace_id) filter (where sample_rank = 1) as sample_trace_id,
            (jsonb_agg(
              jsonb_strip_nulls(jsonb_build_object(
                'occurredAt', occurred_at,
                'eventId', sample_event_id,
                'actorId', user_id,
                'actorEmail', account_email,
                'traceId', trace_id,
                'requestId', request_id,
                'taskId', task_id,
                'route', sample_route,
                'feature', sample_feature,
                'action', sample_action,
                'stage', sample_stage,
                'outcome', sample_outcome,
                'code', code,
                'message', message,
                'stack', sample_stack,
                'parameters', sample_parameters,
                'data', sample_data,
                'metadata', sample_metadata
              )) order by occurred_at desc, sample_event_id desc nulls last
            ) filter (where sample_rank = 1))->0 as sample
       from ranked_errors
      group by fingerprint, source, service, severity, impact
      order by occurrences desc, last_occurred_at desc`,
    [spec.periodStart.toISOString(), spec.periodEnd.toISOString()],
  );
  return result.rows;
}

type ServiceRow = {
  service: string;
  check_count: string | number;
  healthy_checks: string | number;
  unhealthy_checks: string | number;
  incident_count: string | number;
  observed_seconds: string | number;
  unhealthy_seconds: string | number;
  availability_ratio: string | number | null;
  data_complete: boolean;
  first_observed_at: string | null;
  last_observed_at: string | null;
};

async function serviceRows(spec: ReportRevision, client: PoolClient) {
  const result = await client.query<ServiceRow>(
    `with seed as (
       -- Supervisor transitions explain recovery actions; periodic probes measure availability.
       -- supervisor 仅描述恢复动作，不能覆盖周期健康探针的可用率状态。
       select distinct on (host, service, check_name) id, host, service, check_name, observed_at, state
         from observability_service_events
        where check_name <> 'supervisor' and observed_at < $1
          and (observed_at >= $1::timestamptz - interval '90 seconds' or exists (
            select 1 from observability_service_events current
             where current.host = observability_service_events.host
               and current.service = observability_service_events.service
               and current.check_name = observability_service_events.check_name
               and current.observed_at >= $1 and current.observed_at < $2
          ))
        order by host, service, check_name, observed_at desc, id desc
     ), scoped as (
       select * from seed
       union all
       select id, host, service, check_name, observed_at, state
         from observability_service_events
        where check_name <> 'supervisor' and observed_at >= $1 and observed_at < $2
     ), transitions as (
       select *,
              lag(state) over (partition by host, service, check_name order by observed_at, id) as previous_state,
              lead(observed_at) over (partition by host, service, check_name order by observed_at, id) as next_observed_at
         from scoped
     ), intervals as (
       select *, greatest(observed_at, $1::timestamptz) as interval_start,
              least(coalesce(next_observed_at, $2::timestamptz), $2::timestamptz) as interval_end
         from transitions
     ), measured as (
       select *, extract(epoch from (interval_end - interval_start)) as seconds,
              interval_end - observed_at <= interval '90 seconds' as contiguous
         from intervals
     ), streams as (
       select host, service, check_name,
              count(*) filter (where observed_at >= $1) as check_count,
              count(*) filter (where observed_at >= $1 and state = 'healthy') as healthy_checks,
              count(*) filter (where observed_at >= $1 and state = 'unhealthy') as unhealthy_checks,
              count(*) filter (where observed_at >= $1 and state = 'unhealthy' and coalesce(previous_state, 'healthy') <> 'unhealthy') as incident_count,
              coalesce(sum(seconds) filter (where contiguous and state in ('healthy', 'unhealthy')), 0) as observed_seconds,
              coalesce(sum(seconds) filter (where contiguous and state = 'healthy'), 0) as healthy_seconds,
              coalesce(sum(seconds) filter (where contiguous and state = 'unhealthy'), 0) as unhealthy_seconds,
              -- Use the same freshness limit at both boundaries and between samples.
              -- 首尾及样本间统一使用 90 秒新鲜度，unknown 不能作为有效观测。
              min(observed_at) <= $1::timestamptz + interval '90 seconds'
                and coalesce(bool_and(contiguous and state in ('healthy', 'unhealthy')) filter (where seconds > 0), false)
                and coalesce(sum(seconds) filter (where contiguous and state in ('healthy', 'unhealthy')), 0)
                  >= extract(epoch from ($2::timestamptz - $1::timestamptz)) - 90 as data_complete,
              min(observed_at) filter (where observed_at >= $1) as first_observed_at,
              max(observed_at) filter (where observed_at >= $1) as last_observed_at
         from measured
        group by host, service, check_name
     )
     select service, sum(check_count) as check_count,
            sum(healthy_checks) as healthy_checks, sum(unhealthy_checks) as unhealthy_checks,
            sum(incident_count) as incident_count, sum(observed_seconds) as observed_seconds,
            sum(unhealthy_seconds) as unhealthy_seconds,
            case when sum(observed_seconds) > 0
                 then sum(healthy_seconds) / sum(observed_seconds)
                 else null end as availability_ratio,
            bool_and(data_complete) as data_complete,
            min(first_observed_at) as first_observed_at, max(last_observed_at) as last_observed_at
       from streams
      group by service
      order by service`,
    [spec.periodStart.toISOString(), spec.periodEnd.toISOString()],
  );
  return result.rows;
}

function accountSnapshot(row: AccountRow) {
  return {
    userId: row.user_id,
    accountEmail: row.account_email,
    platformRole: row.platform_role,
    activityKind: row.activity_kind,
    auditRecords: numberValue(row.audit_records),
    usageCalls: numberValue(row.usage_calls),
    successfulCalls: numberValue(row.successful_calls),
    failedCalls: numberValue(row.failed_calls),
    inProgressCalls: numberValue(row.in_progress_calls),
    unknownCalls: numberValue(row.unknown_calls),
    inputTokens: numberValue(row.input_tokens),
    outputTokens: numberValue(row.output_tokens),
    totalTokens: numberValue(row.total_tokens),
    imageCount: numberValue(row.image_count),
    videoSeconds: fixed(row.video_seconds, 3),
    durationMs: numberValue(row.duration_ms),
    confirmedCostUsd: fixed(row.confirmed_cost_usd, 10),
    estimatedCostUsd: fixed(row.estimated_cost_usd, 10),
    reservedCostUsd: fixed(row.reserved_cost_usd, 10),
    unknownCostCalls: numberValue(row.unknown_cost_calls),
    errorCount: numberValue(row.error_count),
  };
}

function reportSummary(spec: ReportRevision, accounts: ReturnType<typeof accountSnapshot>[], errors: ErrorRow[], services: ServiceRow[]) {
  const total = <T extends keyof ReturnType<typeof accountSnapshot>>(key: T) => accounts.reduce((sum, account) => sum + numberValue(account[key]), 0);
  const confirmedCostUsd = total('confirmedCostUsd');
  const estimatedCostUsd = total('estimatedCostUsd');
  const reservedCostUsd = total('reservedCostUsd');
  const rate = getUsdToCnyRate();
  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    reportType: spec.reportType,
    revision: spec.revision,
    isFinal: spec.isFinal,
    timezone: 'Asia/Shanghai',
    periodStart: spec.periodStart.toISOString(),
    periodEnd: spec.periodEnd.toISOString(),
    dataAsOf: new Date().toISOString(),
    deploymentVersion: getDeploymentVersion(),
    accounts: {
      active: accounts.length,
      aiActive: accounts.filter((account) => account.activityKind !== 'session_only').length,
      sessionOnly: accounts.filter((account) => account.activityKind === 'session_only').length,
    },
    usage: {
      calls: total('usageCalls'),
      successfulCalls: total('successfulCalls'),
      failedCalls: total('failedCalls'),
      inProgressCalls: total('inProgressCalls'),
      inputTokens: total('inputTokens'),
      outputTokens: total('outputTokens'),
      totalTokens: total('totalTokens'),
      imageCount: total('imageCount'),
      videoSeconds: fixed(total('videoSeconds'), 3),
      durationMs: total('durationMs'),
    },
    costs: {
      confirmedUsd: fixed(confirmedCostUsd, 10),
      estimatedUsd: fixed(estimatedCostUsd, 10),
      reservedUsd: fixed(reservedCostUsd, 10),
      unknownCostCalls: total('unknownCostCalls'),
      cnyRate: rate,
      confirmedCny: fixed(confirmedCostUsd * rate, 6),
      estimatedCny: fixed(estimatedCostUsd * rate, 6),
      reservedCny: fixed(reservedCostUsd * rate, 6),
    },
    errors: {
      fingerprints: errors.length,
      occurrences: errors.reduce((sum, error) => sum + numberValue(error.occurrences), 0),
      affectedAccounts: accounts.filter((account) => account.errorCount > 0).length,
      blocked: errors.filter((error) => error.impact === 'blocked').length,
      degraded: errors.filter((error) => error.impact === 'degraded').length,
      unknown: errors.filter((error) => error.impact === 'unknown').length,
    },
    services: {
      monitored: services.length,
      complete: services.filter((service) => service.data_complete).length,
      incidents: services.reduce((sum, service) => sum + numberValue(service.incident_count), 0),
    },
  };
}

async function readReportSnapshots(spec: ReportRevision) {
  // Read one bounded database snapshot so all report sections describe the same data.
  // 使用有超时的统一数据库快照，确保报表各部分描述同一份数据。
  return withTransaction(async (client) => {
    await client.query('set transaction isolation level repeatable read, read only');
    await client.query("set local statement_timeout = '60s'");
    await client.query("set local lock_timeout = '5s'");
    const rawAccounts = await accountRows(spec, client);
    const errors = await errorRows(spec, client);
    const services = await serviceRows(spec, client);
    const accounts = rawAccounts.map(accountSnapshot);
    return { accounts, errors, services, summary: reportSummary(spec, accounts, errors, services) };
  });
}

async function insertAccountSnapshots(client: PoolClient, reportRunId: string, rows: ReturnType<typeof accountSnapshot>[]) {
  if (!rows.length) return;
  const values: unknown[] = [];
  const tuples = rows.map((row, index) => {
    const offset = index * 23;
    values.push(
      reportRunId, row.userId, row.accountEmail, row.platformRole, row.activityKind, row.auditRecords,
      row.usageCalls, row.successfulCalls, row.failedCalls, row.inProgressCalls, row.unknownCalls,
      row.inputTokens, row.outputTokens, row.totalTokens, row.imageCount, row.videoSeconds, row.durationMs,
      row.confirmedCostUsd, row.estimatedCostUsd, row.reservedCostUsd, row.unknownCostCalls, row.errorCount, JSON.stringify({}),
    );
    return `(${Array.from({ length: 23 }, (_, field) => `$${offset + field + 1}`).join(', ')})`;
  });
  await client.query(
    `insert into report_account_summaries
      (report_run_id, user_id, account_email, platform_role, activity_kind, audit_records,
       usage_calls, successful_calls, failed_calls, in_progress_calls, unknown_calls,
       input_tokens, output_tokens, total_tokens, image_count, video_seconds, duration_ms,
       confirmed_cost_usd, estimated_cost_usd, reserved_cost_usd, unknown_cost_calls, error_count, metadata)
     values ${tuples.join(', ')}`,
    values,
  );
}

async function insertErrorSnapshots(client: PoolClient, reportRunId: string, rows: ErrorRow[]) {
  if (!rows.length) return;
  const values: unknown[] = [];
  const tuples = rows.map((row, index) => {
    const offset = index * 16;
    values.push(
      reportRunId, row.fingerprint, row.source, row.service, row.severity, row.impact, row.code,
      row.message, row.first_occurred_at, row.last_occurred_at, numberValue(row.occurrences),
      numberValue(row.affected_accounts), numberValue(row.affected_requests), numberValue(row.affected_tasks), row.sample_trace_id,
      JSON.stringify({ affectedAccountEmails: errorAccountEmails(row), sample: row.sample || null }),
    );
    return `(${Array.from({ length: 16 }, (_, field) => `$${offset + field + 1}`).join(', ')})`;
  });
  await client.query(
    `insert into report_error_summaries
      (report_run_id, fingerprint, source, service, severity, impact, code, message,
       first_occurred_at, last_occurred_at, occurrences, affected_accounts,
       affected_requests, affected_tasks, sample_trace_id, metadata)
     values ${tuples.join(', ')}`,
    values,
  );
}

async function insertServiceSnapshots(client: PoolClient, reportRunId: string, rows: ServiceRow[]) {
  if (!rows.length) return;
  const values: unknown[] = [];
  const tuples = rows.map((row, index) => {
    const offset = index * 13;
    values.push(
      reportRunId, row.service, numberValue(row.check_count), numberValue(row.healthy_checks), numberValue(row.unhealthy_checks),
      numberValue(row.incident_count), fixed(row.observed_seconds, 3), fixed(row.unhealthy_seconds, 3),
      row.availability_ratio === null ? null : fixed(row.availability_ratio, 9), row.data_complete,
      row.first_observed_at, row.last_observed_at, JSON.stringify({}),
    );
    return `(${Array.from({ length: 13 }, (_, field) => `$${offset + field + 1}`).join(', ')})`;
  });
  await client.query(
    `insert into report_service_summaries
      (report_run_id, service, check_count, healthy_checks, unhealthy_checks, incident_count,
       observed_seconds, unhealthy_seconds, availability_ratio, data_complete,
       first_observed_at, last_observed_at, metadata)
     values ${tuples.join(', ')}`,
    values,
  );
}

export async function generateReport(spec: ReportRevision): Promise<ReportJobResult> {
  const claim = await claimReportRun(spec);
  if (!claim) return { status: 'skipped', reportType: spec.reportType, revision: spec.revision };

  const reportRunId = claim.id;
  try {
    // Run report reads sequentially so catch-up work consumes at most one shared
    // PostgreSQL connection while interactive creation requests are active.
    // 报表读取串行执行，补算期间最多占用一个共享连接，避免与在线创作请求争抢连接池。
    const { accounts, errors, services, summary } = await readReportSnapshots(spec);
    // Publish all report snapshots and the succeeded marker atomically so readers
    // can never observe a partially regenerated report.
    // 三类报表快照与成功状态必须原子发布，读取端不能看到半份重算结果。
    const published = await withTransaction(async (client) => {
      await client.query("set local statement_timeout = '30s'");
      await client.query("set local lock_timeout = '5s'");
      // Lock before publication; an insert committed during reads invalidates this snapshot.
      // 发布前锁定任务，读取期间入库的迟到事件必须触发下一轮重算。
      const run = await client.query<{ watermark: string; lease: string }>(
        'select data_as_of::text as watermark, updated_at::text as lease from report_runs where id = $1 for update', [reportRunId],
      );
      if (run.rows[0]?.lease !== claim.lease) return false;
      if (run.rows[0]?.watermark !== claim.watermark) {
        await client.query("update report_runs set status = 'failed', error = null, updated_at = now() where id = $1", [reportRunId]);
        return false;
      }
      await client.query('delete from report_account_summaries where report_run_id = $1', [reportRunId]);
      await client.query('delete from report_error_summaries where report_run_id = $1', [reportRunId]);
      await client.query('delete from report_service_summaries where report_run_id = $1', [reportRunId]);
      await insertAccountSnapshots(client, reportRunId, accounts);
      await insertErrorSnapshots(client, reportRunId, errors);
      await insertServiceSnapshots(client, reportRunId, services);
      await client.query(
        `update report_runs
            set status = 'succeeded', summary = $1::jsonb, data_as_of = now(), updated_at = now()
          where id = $2`,
        [JSON.stringify(summary), reportRunId],
      );
      return true;
    });
    return { status: published ? 'succeeded' : 'skipped', reportRunId, reportType: spec.reportType, revision: spec.revision, recomputed: claim.recomputed };
  } catch (error) {
    const message = errorMessage(error instanceof Error ? error.message : error);
    await query(
      `update report_runs set status = 'failed', error = $1, updated_at = now() where id = $2 and updated_at::text = $3`,
      [message || 'report generation failed', reportRunId, claim.lease],
    ).catch(() => undefined);
    return { status: 'failed', reportRunId, reportType: spec.reportType, revision: spec.revision, error: message || 'report generation failed', recomputed: claim.recomputed };
  }
}

export async function generateDueReports(now = new Date()) {
  const results: ReportJobResult[] = [];
  let generated = 0;
  // Failed snapshots remain queued regardless of the ordinary catch-up horizon.
  // 已失效快照不受常规补算时间范围限制，历史迟到事件也必须重算。
  const pending = await query<{ report_type: ReportType; period_start: string; period_end: string; revision: number; is_final: boolean }>(
    `select report_type, period_start, period_end, revision, is_final from report_runs
      where status = 'failed'
         or (status = 'running' and updated_at < now() - interval '30 minutes')
      order by updated_at, id limit $1`, [MAX_GENERATED_REPORTS_PER_RUN],
  );
  const retries = pending.rows.map((row) => ({
    reportType: row.report_type, periodStart: new Date(row.period_start), periodEnd: new Date(row.period_end),
    revision: row.revision, isFinal: row.is_final,
  }));
  const due = getDueReportJobs(now);
  const specKey = (spec: ReportRevision) => [spec.reportType, spec.periodStart.toISOString(), spec.periodEnd.toISOString(), spec.revision].join('|');
  const existing = due.length ? await query<{ report_type: ReportType; period_start: string; period_end: string; revision: number }>(
    `select report_type, period_start, period_end, revision from report_runs
      where period_start >= $1 and period_start <= $2`,
    [new Date(Math.min(...due.map((spec) => spec.periodStart.getTime()))).toISOString(),
      new Date(Math.max(...due.map((spec) => spec.periodStart.getTime()))).toISOString()],
  ) : { rows: [] };
  const existingKeys = new Set(existing.rows.map((row) => specKey({
    reportType: row.report_type, periodStart: new Date(row.period_start), periodEnd: new Date(row.period_end),
    revision: row.revision, isFinal: false,
  })));
  const queues = [due.filter((spec) => !existingKeys.has(specKey(spec))), retries];
  let queueIndex = 0;
  // Alternate actual attempts; only a claim skipped before any report reads is free.
  // 新任务与历史重试交替占实际额度，仅未领取任务的跳过不计预算。
  while (queues.some((queue) => queue.length) && generated < MAX_GENERATED_REPORTS_PER_RUN) {
    const spec = queues[queueIndex].shift();
    if (!spec) {
      queueIndex = 1 - queueIndex;
      continue;
    }
    const result = await generateReport(spec);
    results.push(result);
    if (result.status === 'skipped' && !result.reportRunId) continue;
    generated += 1;
    queueIndex = 1 - queueIndex;
  }
  return results;
}

export type ReportRunRecord = {
  id: string;
  report_type: ReportType;
  period_start: string;
  period_end: string;
  revision: number;
  status: 'running' | 'succeeded' | 'failed';
  is_final: boolean;
  data_as_of: string;
  schema_version: string;
  summary: Record<string, unknown>;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export async function getLiveTodayReport(now = new Date()) {
  const spec = job('daily', { start: shanghaiDayStart(now), end: now }, 0, false);
  const { accounts, errors, services, summary } = await readReportSnapshots(spec);
  const dataAsOf = summary.dataAsOf;
  const run: ReportRunRecord = {
    id: 'live-today',
    report_type: 'daily',
    period_start: spec.periodStart.toISOString(),
    period_end: spec.periodEnd.toISOString(),
    revision: 0,
    status: 'succeeded',
    is_final: false,
    data_as_of: dataAsOf,
    schema_version: REPORT_SCHEMA_VERSION,
    summary,
    error: null,
    created_at: dataAsOf,
    updated_at: dataAsOf,
  };
  // This synthetic run is read-only and never enters report_runs or scheduler history.
  // 该临时快照只读生成，不写入 report_runs，也不会污染调度历史。
  return { run, accounts, errors, services };
}

export type ReportRunFilters = {
  search?: string;
};

export async function listReportRuns(limitPerType = 30, filters: ReportRunFilters = {}) {
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limitPerType)));
  const values: Array<string | number> = [];
  const conditions: string[] = [];
  // Filter on PostgreSQL before applying the display limit so old reports stay searchable.
  // 先由 PostgreSQL 筛选再应用展示上限，避免历史版本过多时前端无法检索。
  const search = filters.search?.trim().slice(0, 80);
  if (search) {
    const searchPattern = "%" + search + "%";
    const normalizedPattern = "%" + search.replace(/[\/-]/g, ".") + "%";
    values.push(searchPattern, normalizedPattern);
    const rawIndex = values.length - 1;
    const normalizedIndex = values.length;
    conditions.push([
      "      (",
      "        period_start::text ilike $" + rawIndex,
      "        or period_end::text ilike $" + rawIndex,
      "        or to_char(period_start at time zone 'Asia/Shanghai', 'YYYY.MM.DD HH24:MI') ilike $" + normalizedIndex,
      "        or to_char(period_end at time zone 'Asia/Shanghai', 'YYYY.MM.DD HH24:MI') ilike $" + normalizedIndex,
      "        or revision::text ilike $" + rawIndex,
      "        or ('r' || revision::text) ilike $" + rawIndex,
      "        or report_type::text ilike $" + rawIndex,
      "        or (case report_type when 'daily' then '日报' when 'weekly' then '周报' when 'monthly' then '月报' end) ilike $" + rawIndex,
      "        or status::text ilike $" + rawIndex,
      "        or (case when status = 'running' then '生成中 running' when status = 'failed' and error is null then '待重算 queued' when status = 'failed' then '失败待重试 failed' when is_final then '最终版 final' else '临时版 draft' end) ilike $" + rawIndex,
      "      )",
    ].join("\n"));
  }
  values.push(safeLimit);
  const limitIndex = values.length;
  // Limit each report type independently so frequent daily runs cannot hide monthly reports.
  // 按报表类型分别限制历史数量，避免频繁生成的日报挤掉月报。
  const reportSql = [
    "with ranked_runs as (",
    "  select *, row_number() over (",
    "    partition by report_type order by period_start desc, revision desc, id asc",
    "  ) as type_rank",
    "    from report_runs",
    conditions.length ? "   where " + conditions.join(" and ") : "",
    ")",
    "select id, report_type, period_start, period_end, revision, status, is_final,",
    "       data_as_of, schema_version, summary, error, created_at, updated_at",
    "  from ranked_runs",
    " where type_rank <= $" + limitIndex,
    " order by period_start desc, report_type asc, revision desc, id asc",
  ].filter(Boolean).join("\n");
  const result = await query<ReportRunRecord>(reportSql, values);
  return result.rows;
}

export async function getReportDetails(reportRunId: string) {
  // Read the run marker and all summaries from one snapshot across atomic regeneration.
  // 重算原子发布期间，任务状态与三类汇总必须从同一快照读取。
  return withTransaction(async (client) => {
    await client.query('set transaction isolation level repeatable read, read only');
    await client.query("set local statement_timeout = '60s'");
    await client.query("set local lock_timeout = '5s'");
    const runSql = [
      "select id, report_type, period_start, period_end, revision, status, is_final,",
      "       data_as_of, schema_version, summary, error, created_at, updated_at",
      "  from report_runs where id = $1",
    ].join("\n");
    const run = await client.query<ReportRunRecord>(runSql, [reportRunId]);
    if (!run.rows[0]) return null;
    const [accountSnapshotResult, errorSnapshotResult, services] = await Promise.all([
      client.query<AccountRow>("select * from report_account_summaries where report_run_id = $1 order by reserved_cost_usd desc, usage_calls desc, account_email", [reportRunId]),
      client.query<ErrorRow>("select * from report_error_summaries where report_run_id = $1 order by occurrences desc, last_occurred_at desc", [reportRunId]),
      client.query("select * from report_service_summaries where report_run_id = $1 order by service", [reportRunId]),
    ]);
    const accounts = accountSnapshotResult.rows.map(accountSnapshot);
    let errors = errorSnapshotResult.rows;
    const reportRun = run.rows[0];
    const needsErrorLookup = errors.some((row) => (
      numberValue(row.affected_accounts) > 0 && errorAccountEmails(row).length === 0
    ) || !errorSample(row));
    if (needsErrorLookup) {
      const currentErrorRows = await errorRows({
        reportType: reportRun.report_type,
        periodStart: new Date(reportRun.period_start),
        periodEnd: new Date(reportRun.period_end),
        revision: reportRun.revision,
        isFinal: reportRun.is_final,
      }, client);
      const currentErrorsByKey = new Map(currentErrorRows.map((row) => [errorGroupKey(row), row]));
      errors = errors.map((row) => {
        const current = currentErrorsByKey.get(errorGroupKey(row));
        if (!current) return row;
        const emails = errorAccountEmails(row).length ? errorAccountEmails(row) : errorAccountEmails(current);
        const sample = errorSample(row) || errorSample(current);
        const metadata = recordValue(row.metadata) || {};
        return {
          ...row,
          ...(emails.length ? { affected_account_emails: emails } : {}),
          ...(row.sample || sample ? { sample: row.sample || sample } : {}),
          ...(row.sample_trace_id || !current.sample_trace_id ? {} : { sample_trace_id: current.sample_trace_id }),
          ...(sample && !metadata.sample ? { metadata: { ...metadata, sample } } : {}),
        };
      });
    }
    return { run: reportRun, accounts, errors, services: services.rows };
  });
}
