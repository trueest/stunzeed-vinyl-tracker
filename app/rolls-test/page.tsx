'use client';

import { useEffect, useState } from 'react';
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
  remaining_in: number | null;
};

type RemainingRow = {
  roll_id: string;
  remaining_in: number;
};

function inchesToFeet(inches: number): string {
  const feet = inches / 12;
  return feet.toFixed(1); // e.g., 48.5 ft
}

export default function RollsTestPage() {
  const [rolls, setRolls] = useState<RollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      // 1) Get rolls + their material info
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
            color_name
          )
        `);

      if (rollsError) {
        setError(rollsError.message);
        setLoading(false);
        return;
      }

      // 2) Get remaining lengths from the view
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

      // 3) Merge into a flat structure for the UI
      const mapped: RollRow[] = (rollsData || []).map((row: any) => ({
        id: row.id,
        location: row.location,
        starting_length_in: row.starting_length_in,
        status: row.status,
        note: row.note,
        material_brand: row.materials?.brand ?? null,
        material_film_code: row.materials?.film_code ?? null,
        material_color_name: row.materials?.color_name ?? null,
        remaining_in: remainingById[row.id] ?? null,
      }));

      setRolls(mapped);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) return <div className="p-4">Loading rolls…</div>;

  if (error) {
    return (
      <div className="p-4 text-red-600">
        Error loading rolls: {error}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold mb-2">Rolls (Dev Test)</h1>
      <p className="text-sm text-gray-600 mb-4">
        Values are stored in inches in the database and shown as feet here.
      </p>
      {rolls.length === 0 ? (
        <p className="text-gray-600">No rolls found yet.</p>
      ) : (
        <div className="space-y-3">
          {rolls.map((roll) => (
            <div
              key={roll.id}
              className="border rounded-lg p-4 flex flex-col gap-1"
            >
              <div className="font-semibold">
                {roll.material_brand} {roll.material_film_code} –{' '}
                {roll.material_color_name}
              </div>
              <div className="text-sm text-gray-600">
                Location: {roll.location || '—'} · Status:{' '}
                {roll.status || '—'}
              </div>
              <div className="text-sm">
                Starting: {inchesToFeet(roll.starting_length_in)} ft · Remaining:{' '}
                {roll.remaining_in !== null
                  ? `${inchesToFeet(roll.remaining_in)} ft`
                  : '—'}
              </div>
              {roll.note && (
                <div className="text-xs text-gray-500 mt-1">
                  Note: {roll.note}
                </div>
              )}
              {typeof roll.remaining_in === 'number' && (
                <div className="text-xs text-gray-500 mt-1">
                  Remaining raw: {roll.remaining_in} in
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}