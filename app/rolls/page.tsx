'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Protected } from '@/app/components/Protected';
import { inchesToFeet, ROLL_STATUS } from '@/lib/utils';

const DEFAULT_REORDER_THRESHOLD_IN = 300;

/** Shape returned by the Supabase query (roll + joined material). */
type RawRollRow = {
  id: string;
  location: string | null;
  starting_length_in: number;
  status: string | null;
  note: string | null;
  materials: {
    brand: string | null;
    film_code: string | null;
    color_name: string | null;
    width_in: number | null;
    reorder_threshold_in: number | null;
  } | null;
};

/** Flattened shape used throughout the component. */
type RollRow = {
  id: string;
  location: string | null;
  starting_length_in: number;
  status: string | null;
  note: string | null;
  material_brand: string | null;
  material_film_code: string | null;
  material_color_name: string | null;
  width_in: number | null;
  remaining_in: number | null;
  reorder_threshold_in: number | null;
};

type RemainingRow = {
  roll_id: string;
  remaining_in: number;
};


export default function RollsPage() {
  const [rolls, setRolls] = useState<RollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: rollsData, error: rollsError } = await supabase
        .from('rolls')
        .select(`
          id,
          location,
          starting_length_in,
          status,
          note,
          materials:material_id (
            brand,
            film_code,
            color_name,
            width_in,
            reorder_threshold_in
          )
        `)
        .eq('status', ROLL_STATUS.OPEN)
        .order('received_at', { ascending: false });

      if (rollsError) {
        setError(rollsError.message);
        setLoading(false);
        return;
      }

      const { data: remainingData, error: remainingError } = await supabase
        .from('roll_remaining')
        .select('roll_id, remaining_in');

      if (remainingError) {
        setError(remainingError.message);
        setLoading(false);
        return;
      }

      const remainingById: Record<string, number> = {};
      (remainingData || []).forEach((row: RemainingRow) => {
        remainingById[row.roll_id] = row.remaining_in;
      });

      // Merge remaining into flattened RollRow shape
      const mapped: RollRow[] = (rollsData as RawRollRow[]).map((row) => ({
        id: row.id,
        location: row.location,
        starting_length_in: row.starting_length_in,
        status: row.status,
        note: row.note,
        material_brand: row.materials?.brand ?? null,
        material_film_code: row.materials?.film_code ?? null,
        material_color_name: row.materials?.color_name ?? null,
        width_in: row.materials?.width_in ?? null,
        remaining_in: remainingById[row.id] ?? null,
        reorder_threshold_in: row.materials?.reorder_threshold_in ?? null,
      }));

      setRolls(mapped);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) return <div className="p-4">Loading rolls…</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <Protected>
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <div className="grid grid-cols-3 items-center">
        <Link href="/"> ← Back to Dashboard </Link>
        <h1 className="text-2xl font-semibold text-center">Open Rolls</h1>
        <div className="flex gap-2 justify-end">
          <Link
            href="/materials/new"
            className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
          >
            + New Material
          </Link>
          <Link
            href="/rolls/new"
            className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
          >
            + New Roll
          </Link>
          <Link
            href="/usage/new"
            className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
          >
            + Log Usage
          </Link>
        </div>
      </div>

      {rolls.length === 0 ? (
        <p className="text-gray-600">No rolls yet. Add one to get started.</p>
      ) : (
        <div className="space-y-3">
          {rolls.map((roll) => {
            const remainingFt =
              typeof roll.remaining_in === 'number'
                ? inchesToFeet(roll.remaining_in)
                : null;

            const threshold = roll.reorder_threshold_in ?? DEFAULT_REORDER_THRESHOLD_IN;
            const low = roll.remaining_in !== null && roll.remaining_in < threshold;

            return (
              <Link
                key={roll.id}
                href={`/rolls/${roll.id}`}
                className="block border rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">
                      {roll.material_brand} {roll.material_film_code} –{' '}
                      {roll.material_color_name}{' '}
                      {roll.width_in ? `(${roll.width_in}" wide)` : ''}
                    </div>
                    <div className="text-sm text-gray-600">
                      Location: {roll.location || '—'} · Status:{' '}
                      {roll.status || '—'}
                    </div>
                    {roll.note && (
                      <div className="text-xs text-gray-500 mt-1">
                        Note: {roll.note}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm">
                      Remaining:{' '}
                      {remainingFt !== null ? `${remainingFt} ft` : '—'}
                    </div>
                    <div className="text-xs text-gray-500">
                      Start: {inchesToFeet(roll.starting_length_in)} ft
                    </div>
                    {low && (
                      <div className="mt-1 text-xs text-red-600 font-medium">
                        Low inventory
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
    </Protected>
  );
}