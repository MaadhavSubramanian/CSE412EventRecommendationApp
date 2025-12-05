import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { insertPendingInserts, prepareIngestionRun, DEFAULT_LOOKBACK_DAYS } from './ingestion/core';
import type { EventSourceConfig } from './ingestion/types';

const DEFAULT_FEED_URL = 'https://sundevilcentral.eoss.asu.edu/ical/arizonau/ical_arizonau.ics';
const POLL_MINUTES = parseIntSafe(process.env.INGEST_POLL_MINUTES, 15);
const LOOKBACK_DAYS = parseIntSafe(process.env.INGEST_LOOKBACK_DAYS, DEFAULT_LOOKBACK_DAYS);
const DEFAULT_DURATION_MINUTES = parseIntSafe(process.env.SUN_DEVIL_EVENT_DURATION_MINUTES, 120);

const sunDevilSource: EventSourceConfig = {
  key: 'sun-devil-central-ics',
  type: 'ics',
  url: process.env.SUN_DEVIL_ICS_URL ?? DEFAULT_FEED_URL,
  defaultDurationMinutes: DEFAULT_DURATION_MINUTES,
  defaultStatus: 'scheduled',
  defaultOrganizerName: 'Sun Devil Central',
  tags: ['asu', 'campus']
};

async function bootstrap() {
  const supabaseUrl = process.env.INGEST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase url or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const pollIntervalMs = Math.max(1, POLL_MINUTES) * 60 * 1000;

  console.log(
    `Polling Sun Devil Central feed every ${POLL_MINUTES} minute(s) (lookback=${LOOKBACK_DAYS} days).`
  );

  let isRunning = false;

  const tick = async () => {
    if (isRunning) {
      console.log('[poll] Previous run still in progress; skipping tick.');
      return;
    }
    isRunning = true;
    const start = Date.now();

    try {
      const { pending, normalizedCount, dedupedCount } = await prepareIngestionRun({
        supabase,
        sourceConfigs: [sunDevilSource],
        lookbackDays: LOOKBACK_DAYS
      });

      if (!normalizedCount) {
        console.log('[poll] No events fetched from Sun Devil Central.');
        return;
      }

      if (!pending.length) {
        console.log(
          `[poll] No new events to insert (fetched=${normalizedCount}, deduped=${dedupedCount}).`
        );
        return;
      }

      const { eventsInserted, categoriesInserted } = await insertPendingInserts(supabase, pending);
      const durationMs = Date.now() - start;
      console.log(
        `[poll] Inserted ${eventsInserted} events (${categoriesInserted} categories) in ${durationMs}ms.`
      );
    } catch (error) {
      console.error('[poll] Ingestion error:', error);
    } finally {
      isRunning = false;
    }
  };

  await tick();
  const interval = setInterval(() => {
    void tick();
  }, pollIntervalMs);

  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, () => {
      console.log('Shutting down ingestion server...');
      clearInterval(interval);
      process.exit(0);
    });
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start ingestion server:', error);
  process.exitCode = 1;
});

function parseIntSafe(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return fallback;
}
