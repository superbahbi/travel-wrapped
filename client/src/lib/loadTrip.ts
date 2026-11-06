import {
  parseAccommodations,
  parseIncome,
  parseTransactions,
  type AccommodationEntry,
  type IncomeEntry,
  type Transaction,
} from './csvParser';

export interface TripData {
  transactions: Transaction[];
  accommodations: AccommodationEntry[];
  income: IncomeEntry[];
}

export type LoadOutcome =
  | { status: 'loaded'; data: TripData; warnings: string[] }
  | { status: 'empty' }
  | { status: 'error'; kind: 'network' | 'malformed'; message: string };

export interface FetchResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

export type FetchImpl = (url: string) => Promise<FetchResponse>;

export interface LoadOptions {
  transactionsUrl?: string;
  accommodationUrl?: string;
  incomeUrl?: string;
  cacheBust?: boolean;
}

const TRANSACTIONS_URL = '/data/transactions.csv';
const ACCOMMODATION_URL = '/data/accommodation.csv';
const INCOME_URL = '/data/income.csv';

class LoadFailure extends Error {
  constructor(
    public readonly kind: 'network' | 'malformed' | 'empty',
    message: string,
  ) {
    super(message);
    this.name = 'LoadFailure';
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function withCacheBust(url: string, cacheBust: boolean): string {
  if (!cacheBust) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
}

async function readText(
  fetchImpl: FetchImpl,
  url: string,
): Promise<string> {
  let response: FetchResponse;
  try {
    response = await fetchImpl(url);
  } catch (error) {
    throw new LoadFailure('network', messageOf(error));
  }

  if (!response.ok) {
    throw new LoadFailure('network', `HTTP ${response.status} from ${url}`);
  }

  let text: string;
  try {
    text = await response.text();
  } catch (error) {
    throw new LoadFailure('network', messageOf(error));
  }

  if (!text.trim()) throw new LoadFailure('empty', `${url} is empty`);
  return text;
}

async function loadAccommodations(
  fetchImpl: FetchImpl,
  url: string,
): Promise<{ entries: AccommodationEntry[]; warning?: string }> {
  try {
    const text = await readText(fetchImpl, url);
    return { entries: parseAccommodations(text) };
  } catch (error) {
    return {
      entries: [],
      warning: `Accommodation detail unavailable: ${messageOf(error)}`,
    };
  }
}

async function loadIncome(
  fetchImpl: FetchImpl,
  url: string,
): Promise<{ entries: IncomeEntry[]; warning?: string }> {
  try {
    const text = await readText(fetchImpl, url);
    return { entries: parseIncome(text) };
  } catch (error) {
    return {
      entries: [],
      warning: `Income detail unavailable: ${messageOf(error)}`,
    };
  }
}

/**
 * Load the canonical ledger plus the optional per-night and income detail.
 * Only the ledger can fail the trip; the optional files degrade to warnings.
 */
export async function loadTrip(
  fetchImpl: FetchImpl,
  options: LoadOptions = {},
): Promise<LoadOutcome> {
  const cacheBust = options.cacheBust ?? true;
  const transactionsUrl = withCacheBust(
    options.transactionsUrl ?? TRANSACTIONS_URL,
    cacheBust,
  );
  const accommodationUrl = withCacheBust(
    options.accommodationUrl ?? ACCOMMODATION_URL,
    cacheBust,
  );
  const incomeUrl = withCacheBust(
    options.incomeUrl ?? INCOME_URL,
    cacheBust,
  );

  let transactions: Transaction[];
  try {
    const text = await readText(fetchImpl, transactionsUrl);
    transactions = parseTransactions(text);
    if (transactions.length === 0) return { status: 'empty' };
  } catch (error) {
    if (error instanceof LoadFailure) {
      if (error.kind === 'empty') return { status: 'empty' };
      return { status: 'error', kind: error.kind, message: error.message };
    }
    return { status: 'error', kind: 'malformed', message: messageOf(error) };
  }

  const [accommodation, income] = await Promise.all([
    loadAccommodations(fetchImpl, accommodationUrl),
    loadIncome(fetchImpl, incomeUrl),
  ]);

  const warnings = [accommodation.warning, income.warning].filter(
    (warning): warning is string => Boolean(warning),
  );

  return {
    status: 'loaded',
    data: {
      transactions,
      accommodations: accommodation.entries,
      income: income.entries,
    },
    warnings,
  };
}
