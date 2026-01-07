'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Protected } from '../components/Protected'; // adjust if your Protected path differs
import Link from 'next/link';

type UsageRow = {
  id: string;
  roll_id: string;
  used_length_in: number;
  waste_length_in: number;
  job_code: string | null;
  operator: string | null;
  created_at: string;
};

type ArchivedRoll = {
  id: string;
  starting_length_in: number;
  location: string | null;
  note: string | null;
  material: {
    brand: string;
    film_code: string;
    color_name: string;
    width_in: number;
  } | null;
  usages: UsageRow[];
};

function inchesToFeet(inches: number) {
  return (inches / 12).toFixed(1);
}

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  return { from: ymd(from), to: ymd(to) };
}

function toISOStart(ymd: string) {
  return new Date(`${ymd}T00:00:00`).toISOString();
}
function toISOEnd(ymd: string) {
  return new Date(`${ymd}T23:59:59`).toISOString();
}

export default function HistoryPage() {
  const { from: defFrom, to: defTo } = defaultRange();

  const [tab, setTab] = useState<'archived' | 'reports'>('archived');
  const [dateFrom, setDateFrom] = useState(defFrom);
  const [dateTo, setDateTo] = useState(defTo);

  const [archived, setArchived] = useState<ArchivedRoll[]>([]);
  const [loading, setLoading] = useState(false);

  // report data
  const [reportRows, setReportRows] = useState<
    { brand: string; film_code: string; color_name: string; width_in: number; used_in: number; waste_in: number }[]
  >([]);
  const [reportLoading, setReportLoading] = useState(false);

  async function loadArchived() {
    setLoading(true);

    // 1) Get consumed rolls + material info
    const { data: rolls, error: rollsErr } = await supabase
      .from('rolls')
      .select(`
        id,
        starting_length_in,
        location,
        note,
        materials:material_id (
          brand, film_code, color_name, width_in
        )
      `)
      .eq('status', 'consumed');

    if (rollsErr) {
      setArchived([]);
      setLoading(false);
      return;
    }

    // 2) Get usage rows filtered by date
    const { data: usages, error: usageErr } = await supabase
      .from('roll_usages')
      .select(`id, roll_id, used_length_in, waste_length_in, job_code, operator, created_at`)
      .gte('created_at', toISOStart(dateFrom))
      .lte('created_at', toISOEnd(dateTo));

    if (usageErr) {
      setArchived([]);
      setLoading(false);
      return;
    }

    // group usage by roll_id
    const byRoll: Record<string, UsageRow[]> = {};
    (usages || []).forEach((u: any) => {
      if (!byRoll[u.roll_id]) byRoll[u.roll_id] = [];
      byRoll[u.roll_id].push(u);
    });

    const result: ArchivedRoll[] = (rolls || []).map((r: any) => {
      const mat = Array.isArray(r.materials) ? r.materials[0] : r.materials;
      const rows = (byRoll[r.id] || []).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return {
        id: r.id,
        starting_length_in: r.starting_length_in,
        location: r.location,
        note: r.note,
        material: mat
          ? { brand: mat.brand, film_code: mat.film_code, color_name: mat.color_name, width_in: mat.width_in }
          : null,
        usages: rows,
      };
    });

    // optional: sort newest first by most recent usage
    result.sort((a, b) => {
      const aT = a.usages[0]?.created_at ? new Date(a.usages[0].created_at).getTime() : 0;
      const bT = b.usages[0]?.created_at ? new Date(b.usages[0].created_at).getTime() : 0;
      return bT - aT;
    });

    setArchived(result);
    setLoading(false);
  }

  async function loadReport() {
    setReportLoading(true);

    const { data, error } = await supabase
      .from('roll_usages')
      .select(`
        used_length_in,
        waste_length_in,
        created_at,
        rolls:roll_id (
          materials:material_id (
            brand, film_code, color_name, width_in
          )
        )
      `)
      .gte('created_at', toISOStart(dateFrom))
      .lte('created_at', toISOEnd(dateTo));

    if (error) {
      setReportRows([]);
      setReportLoading(false);
      return;
    }

    const agg: Record<string, any> = {};
    (data || []).forEach((row: any) => {
      const mat = Array.isArray(row.rolls?.materials) ? row.rolls.materials[0] : row.rolls?.materials;
      if (!mat) return;

      const key = `${mat.brand}|${mat.film_code}|${mat.color_name}|${mat.width_in}`;
      if (!agg[key]) {
        agg[key] = {
          brand: mat.brand,
          film_code: mat.film_code,
          color_name: mat.color_name,
          width_in: mat.width_in,
          used_in: 0,
          waste_in: 0,
        };
      }
      agg[key].used_in += row.used_length_in || 0;
      agg[key].waste_in += row.waste_length_in || 0;
    });

    setReportRows(Object.values(agg));
    setReportLoading(false);
  }

  useEffect(() => {
    if (tab === 'archived') loadArchived();
    if (tab === 'reports') loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <Protected>
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        <Link href="/"> ← Back to Dashboard </Link>
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">History</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setTab('archived')}
              className={`text-sm border px-3 py-1 rounded ${tab === 'archived' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            >
              Archived Rolls
            </button>
            <button
              onClick={() => setTab('reports')}
              className={`text-sm border px-3 py-1 rounded ${tab === 'reports' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            >
              Reports
            </button>
          </div>
        </header>

        <div className="border rounded-lg p-4 flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">From</label>
            <input type="date" className="border p-2 rounded" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">To</label>
            <input type="date" className="border p-2 rounded" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <button
            onClick={() => (tab === 'archived' ? loadArchived() : loadReport())}
            className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
          >
            Apply
          </button>
        </div>

        {tab === 'archived' && (
          <section className="space-y-3">
            <div className="text-sm text-gray-600">{loading ? 'Loading…' : `${archived.length} archived roll(s)`}</div>

            {archived.length === 0 ? (
              <p className="text-sm text-gray-600">No archived rolls found.</p>
            ) : (
              <div className="space-y-3">
                {archived.map((r) => {
                  const usedTotalIn = r.usages.reduce((s, u) => s + (u.used_length_in || 0) + (u.waste_length_in || 0), 0);
                  const remainingIn = Math.max(0, r.starting_length_in - usedTotalIn);

                  return (
                    <details key={r.id} className="border rounded-lg p-4">
                      <summary className="cursor-pointer list-none flex items-center justify-between">
                        <div>
                          <div className="font-medium">
                            {r.material
                              ? `${r.material.brand} ${r.material.film_code} – ${r.material.color_name} (${r.material.width_in}" wide)`
                              : 'Roll'}
                          </div>
                          <div className="text-xs text-gray-600">
                            Start: {inchesToFeet(r.starting_length_in)} ft · Remaining: {inchesToFeet(remainingIn)} ft
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">Expand</span>
                      </summary>

                      <div className="mt-3 overflow-x-auto">
                        {r.usages.length === 0 ? (
                          <div className="text-sm text-gray-600">No usage entries in this date range.</div>
                        ) : (
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 pr-2">When</th>
                                <th className="text-left py-2 pr-2">Job</th>
                                <th className="text-left py-2 pr-2">Operator</th>
                                <th className="text-right py-2 px-2">Used (ft)</th>
                                <th className="text-right py-2 px-2">Waste (ft)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {r.usages.map((u) => (
                                <tr key={u.id} className="border-b last:border-b-0">
                                  <td className="py-1 pr-2">{new Date(u.created_at).toLocaleString()}</td>
                                  <td className="py-1 pr-2">{u.job_code ?? '—'}</td>
                                  <td className="py-1 pr-2">{u.operator ?? '—'}</td>
                                  <td className="py-1 px-2 text-right">{(u.used_length_in / 12).toFixed(1)}</td>
                                  <td className="py-1 px-2 text-right">{(u.waste_length_in / 12).toFixed(1)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {tab === 'reports' && (
          <section className="space-y-3">
            <div className="text-sm text-gray-600">{reportLoading ? 'Loading…' : 'Usage by material'}</div>

            <div className="border rounded-lg p-4 overflow-x-auto">
              {reportRows.length === 0 ? (
                <p className="text-sm text-gray-600">No usage found for this date range.</p>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-2">Material</th>
                      <th className="text-right py-2 px-2">Width</th>
                      <th className="text-right py-2 px-2">Used (ft)</th>
                      <th className="text-right py-2 px-2">Waste (ft)</th>
                      <th className="text-right py-2 pl-2">Waste %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportRows.map((m) => {
                      const usedFt = m.used_in / 12;
                      const wasteFt = m.waste_in / 12;
                      const totalFt = usedFt + wasteFt;
                      const pct = totalFt > 0 ? (wasteFt / totalFt) * 100 : 0;

                      return (
                        <tr key={`${m.brand}-${m.film_code}-${m.width_in}`} className="border-b last:border-b-0">
                          <td className="py-1 pr-2">
                            <div className="font-medium">
                              {m.brand} {m.film_code}
                            </div>
                            <div className="text-xs text-gray-600">{m.color_name}</div>
                          </td>
                          <td className="py-1 px-2 text-right">{m.width_in}"</td>
                          <td className="py-1 px-2 text-right">{usedFt.toFixed(1)}</td>
                          <td className="py-1 px-2 text-right">{wasteFt.toFixed(1)}</td>
                          <td className="py-1 pl-2 text-right">{pct.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}
      </div>
    </Protected>
  );
}