import { describe, expect, it } from 'vitest';
import { loadTrip, type FetchImpl } from './loadTrip';

const TX_HEADER =
  'Date,Merchant,Amount,Currency,AmountUSD,FXRate,FXDate,Category,Payment,City,Country,Notes';

const TX_CSV = [
  TX_HEADER,
  '2026-06-08 09:30:00,Cafe,-28.00,CNY,-4.00,7.0000,2026-06-08,Food,Alipay,Chengdu,China,',
].join('\n');

const AC_HEADER =
  'Date,Merchant,City,Country,Amount,Currency,AmountUSD,FXRate,FXDate,Notes';

const AC_CSV = [
  AC_HEADER,
  '2026-06-08,Dengba Hostel,Shenzhen,China,60.10,CNY,8.347222,7.2000,2026-06-08,1 night',
].join('\n');

const INCOME_HEADER =
  'Date,Source,Amount,Currency,AmountUSD,FXRate,FXDate,Notes';

const INCOME_CSV = [
  INCOME_HEADER,
  '2026-03-10,WHITEHAVEN WINE COMP,1035.17,NZD,621.10,1.666667,2026-03-10,Wise',
].join('\n');

type Route = string | { ok: boolean; status: number; body?: string; throws?: boolean };

function fakeFetch(routes: Record<string, Route>): FetchImpl {
  return async (url) => {
    const key = url.split('?')[0];
    const route = routes[key];
    if (route === undefined) {
      return { ok: false, status: 404, text: async () => '' };
    }
    if (typeof route === 'string') {
      return { ok: true, status: 200, text: async () => route };
    }
    if (route.throws) throw new Error('offline');
    return {
      ok: route.ok,
      status: route.status,
      text: async () => route.body ?? '',
    };
  };
}

const all = {
  '/data/transactions.csv': TX_CSV,
  '/data/accommodation.csv': AC_CSV,
  '/data/income.csv': INCOME_CSV,
};

describe('loadTrip', () => {
  it('loads the ledger, the per-night detail, and the income detail', async () => {
    const result = await loadTrip(fakeFetch(all), { cacheBust: false });
    expect(result.status).toBe('loaded');
    if (result.status !== 'loaded') return;
    expect(result.data.transactions).toHaveLength(1);
    expect(result.data.accommodations).toHaveLength(1);
    expect(result.data.income).toHaveLength(1);
    expect(result.warnings).toEqual([]);
  });

  it('asks for the canonical paths by default', async () => {
    const urls: string[] = [];
    const fetchImpl: FetchImpl = async (url) => {
      urls.push(url);
      return { ok: true, status: 200, text: async () => TX_CSV };
    };

    await loadTrip(fetchImpl, { cacheBust: false });

    expect(urls).toEqual([
      '/data/transactions.csv',
      '/data/accommodation.csv',
      '/data/income.csv',
    ]);
  });

  it('cache-busts by default', async () => {
    const urls: string[] = [];
    const fetchImpl: FetchImpl = async (url) => {
      urls.push(url);
      return { ok: true, status: 200, text: async () => TX_CSV };
    };

    await loadTrip(fetchImpl);

    expect(urls[0]).toMatch(/^\/data\/transactions\.csv\?t=\d+$/);
  });

  it('reports an empty ledger', async () => {
    const result = await loadTrip(
      fakeFetch({
        '/data/transactions.csv': `${TX_HEADER}\n`,
        '/data/accommodation.csv': AC_CSV,
      }),
      { cacheBust: false },
    );
    expect(result).toEqual({ status: 'empty' });
  });

  it('reports a network failure', async () => {
    const result = await loadTrip(
      fakeFetch({
        '/data/transactions.csv': { ok: false, status: 500 },
        '/data/accommodation.csv': AC_CSV,
      }),
      { cacheBust: false },
    );
    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.kind).toBe('network');
    expect(result.message).toContain('500');
  });

  it('reports a thrown network failure', async () => {
    const result = await loadTrip(
      fakeFetch({
        '/data/transactions.csv': { ok: true, status: 200, throws: true },
      }),
      { cacheBust: false },
    );
    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.kind).toBe('network');
  });

  it('reports a malformed ledger', async () => {
    const malformed = TX_CSV.replace(',Country', '');
    const result = await loadTrip(
      fakeFetch({
        '/data/transactions.csv': malformed,
        '/data/accommodation.csv': AC_CSV,
      }),
      { cacheBust: false },
    );
    expect(result.status).toBe('error');
    if (result.status !== 'error') return;
    expect(result.kind).toBe('malformed');
    expect(result.message).toContain('Country');
  });

  it('degrades a missing accommodation file to a warning', async () => {
    const result = await loadTrip(
      fakeFetch({
        '/data/transactions.csv': TX_CSV,
        '/data/accommodation.csv': { ok: false, status: 404 },
        '/data/income.csv': INCOME_CSV,
      }),
      { cacheBust: false },
    );
    expect(result.status).toBe('loaded');
    if (result.status !== 'loaded') return;
    expect(result.data.transactions).toHaveLength(1);
    expect(result.data.accommodations).toEqual([]);
    expect(result.warnings).toHaveLength(1);
  });

  it('degrades a missing income file to a warning', async () => {
    const result = await loadTrip(
      fakeFetch({
        '/data/transactions.csv': TX_CSV,
        '/data/accommodation.csv': AC_CSV,
        '/data/income.csv': { ok: false, status: 404 },
      }),
      { cacheBust: false },
    );
    expect(result.status).toBe('loaded');
    if (result.status !== 'loaded') return;
    expect(result.data.income).toEqual([]);
    expect(result.warnings).toHaveLength(1);
  });
});
