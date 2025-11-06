'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

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
};

type RemainingRow = {
  roll_id: string;
  remaining_in: number;
};

function inchesToFeet(inches: number): string {
  const feet = inches / 12;
  return feet.toFixed(1);
}

export default function RollsPage() {
  const [rolls, setRolls] = useState<RollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      // 1) Rolls with material
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
            width_in
          )
        `)
        .order('received_at', { ascending: false });

      if (rollsError) {
        setError(rollsError.message);
        setLoading(false);
        return;
      }

      // 2) Remaining from view
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

      // 3) Merge
      const mapped: RollRow[] = (rollsData || []).map((row: any) => ({
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
      }));

      setRolls(mapped);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) return <div className="p-4">Loading rolls…</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">All Rolls</h1>
        <div className="flex gap-2">
          <Link
            href="/materials/new"
            className="text-sm border px-3 py-1 rounded hover:bg-gray-30"
          >
            + Material
          </Link>
          <Link
            href="/rolls/new"
            className="text-sm border px-3 py-1 rounded hover:bg-gray-30"
          >
            + Roll
          </Link>
          <Link
            href="/usage/new"
            className="text-sm border px-3 py-1 rounded hover:bg-gray-30"
          >
            + Usage
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

            // quick low-inventory flag: less than 25 ft remaining
            const low = roll.remaining_in !== null && roll.remaining_in < 25 * 12;

            return (
              <Link
                key={roll.id}
                href={`/rolls/${roll.id}`}
                className="block border rounded-lg p-4 hover:bg-gray-30"
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
  );
}