'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Protected } from '../../components/Protected';
import Link from 'next/link';

type UsageRow = {
  used_length_in: number;
  waste_length_in: number;
  created_at: string;
  rolls: {
    id: string;
    materials: {
      brand: string;
      film_code: string;
      color_name: string;
      width_in: number;
    } | null;
  } | null;
};

type MaterialKey = string;

type Aggregated = {
  brand: string;
  film_code: string;
  color_name: string;
  width_in: number;
  total_used_in: number;
  total_waste_in: number;
};

function inchesToFeet(inches: number): string {
  const feet = inches / 12;
  return feet.toFixed(1);
}

function getDefaultDateRange() {
  const today = new Date();
  const to = today.toISOString().slice(0, 10); // YYYY-MM-DD

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);
  const from = fromDate.toISOString().slice(0, 10);

  return { from, to };
}

export default function UsageReportPage() {
  const { from: defaultFrom, to: defaultTo } = getDefaultDateRange();

  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [data, setData] = useState<Aggregated[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function loadReport() {
    setLoading(true);
    setStatus('Loading usage data...');

    // Build ISO date range (inclusive)
    const fromISO = new Date(dateFrom + 'T00:00:00').toISOString();
    const toDateObj = new Date(dateTo + 'T23:59:59');
    const toISO = toDateObj.toISOString();

    // Fetch usage with rolls + materials
    const { data: usageData, error } = await supabase
      .from('roll_usages')
      .select(
        `
        used_length_in,
        waste_length_in,
        created_at,
        rolls:roll_id (
          id,
          materials:material_id (
            brand,
            film_code,
            color_name,
            width_in
          )
        )
      `
      )
      .gte('created_at', fromISO)
      .lte('created_at', toISO);

    if (error) {
      console.error(error);
      setStatus(`Error: ${error.message}`);
      setLoading(false);
      return;
    }

    const rows: UsageRow[] = (usageData || []) as any;

    const agg: Record<MaterialKey, Aggregated> = {};

    for (const row of rows) {
      const mat = row.rolls?.materials;
      if (!mat) continue; // skip if roll/material missing

      const key: MaterialKey = `${mat.brand}|${mat.film_code}|${mat.color_name}|${mat.width_in}`;

      if (!agg[key]) {
        agg[key] = {
          brand: mat.brand,
          film_code: mat.film_code,
          color_name: mat.color_name,
          width_in: mat.width_in,
          total_used_in: 0,
          total_waste_in: 0,
        };
      }

      agg[key].total_used_in += row.used_length_in || 0;
      agg[key].total_waste_in += row.waste_length_in || 0;
    }

    const aggregated = Object.values(agg).sort((a, b) => {
      const nameA = `${a.brand} ${a.film_code}`.toLowerCase();
      const nameB = `${b.brand} ${b.film_code}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });

    setData(aggregated);
    setStatus(
      `Showing usage from ${dateFrom} to ${dateTo} (${rows.length} cuts)`
    );
    setLoading(false);
  }

  useEffect(() => {
    loadReport();
  }, []);

  return (
    <Protected>
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/"> ← Back to Dashboard </Link>
            <h1 className="text-2xl font-semibold">Usage Report</h1>
            <p className="text-sm text-gray-600">
              Aggregated vinyl usage by material over a selected date range.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="border rounded-lg p-4 flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">From</label>
            <input
              type="date"
              className="border p-2 rounded"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-600 mb-1">To</label>
            <input
              type="date"
              className="border p-2 rounded"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <button
            onClick={loadReport}
            disabled={loading}
            className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-60"
          >
            {loading ? 'Loading…' : 'Run Report'}
          </button>
        </div>

        {status && (
          <p className="text-xs text-gray-600 mt-1">{status}</p>
        )}

        {/* Table */}
        <div className="border rounded-lg p-4 overflow-x-auto">
          {data.length === 0 ? (
            <p className="text-sm text-gray-600">
              No usage found for this date range.
            </p>
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
                {data.map((m) => {
                  const usedFt = m.total_used_in / 12;
                  const wasteFt = m.total_waste_in / 12;
                  const totalFt = usedFt + wasteFt;
                  const wastePct =
                    totalFt > 0 ? (wasteFt / totalFt) * 100 : 0;

                  return (
                    <tr key={`${m.brand}-${m.film_code}-${m.width_in}`} className="border-b last:border-b-0">
                      <td className="py-1 pr-2">
                        <div className="font-medium">
                          {m.brand} {m.film_code}
                        </div>
                        <div className="text-xs text-gray-600">
                          {m.color_name}
                        </div>
                      </td>
                      <td className="py-1 px-2 text-right">
                        {m.width_in}" 
                      </td>
                      <td className="py-1 px-2 text-right">
                        {usedFt.toFixed(1)}
                      </td>
                      <td className="py-1 px-2 text-right">
                        {wasteFt.toFixed(1)}
                      </td>
                      <td className="py-1 pl-2 text-right">
                        {wastePct.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Protected>
  );
}