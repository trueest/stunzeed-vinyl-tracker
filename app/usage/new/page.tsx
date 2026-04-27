'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Protected } from '@/app/components/Protected';
import { ROLL_STATUS } from '@/lib/utils';

type Roll = {
  id: string;
  starting_length_in: number;
  status: string | null;
  material: {
    brand: string;
    film_code: string;
    color_name: string;
    width_in: number;
  } | null;
};

type RawRollRow = {
  id: string;
  starting_length_in: number;
  status: string | null;
  materials: {
    brand: string;
    film_code: string;
    color_name: string;
    width_in: number;
  } | null;
};

type Message = { text: string; type: 'error' | 'success' };

function toInputValue(n: number): number | '' {
  return n === 0 ? '' : n;
}

export default function NewUsagePage() {
  const [rolls, setRolls] = useState<Roll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({
    roll_id: '',
    job_code: '',
    used_length_ft: 0,
    waste_length_ft: 0,
    operator: '',
  });
  const [message, setMessage] = useState<Message | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load open rolls with material info
  useEffect(() => {
    async function loadRolls() {
      const { data, error } = await supabase
        .from('rolls')
        .select(`
          id,
          starting_length_in,
          status,
          materials:material_id (
            brand,
            film_code,
            color_name,
            width_in
          )
        `)
        .eq('status', ROLL_STATUS.OPEN);

      if (!error && data) {
        const mapped: Roll[] = (data as unknown as RawRollRow[]).map((row) => ({
          id: row.id,
          starting_length_in: row.starting_length_in,
          status: row.status,
          material: row.materials
            ? {
                brand: row.materials.brand,
                film_code: row.materials.film_code,
                color_name: row.materials.color_name,
                width_in: row.materials.width_in,
              }
            : null,
        }));
        setRolls(mapped);
      }
      setIsLoading(false);
    }

    loadRolls();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    if (!form.roll_id) {
      setMessage({ text: 'Please select a roll.', type: 'error' });
      setIsSubmitting(false);
      return;
    }

    const used_length_in = Math.round(Number(form.used_length_ft) * 12);
    const waste_length_in = Math.round(Number(form.waste_length_ft || 0) * 12);

    if (used_length_in <= 0) {
      setMessage({ text: 'Used length must be greater than 0.', type: 'error' });
      setIsSubmitting(false);
      return;
    }

    try {
      const { error } = await supabase.from('roll_usages').insert([
        {
          roll_id: form.roll_id,
          job_code: form.job_code || null,
          operator: form.operator || null,
          used_length_in,
          waste_length_in,
        },
      ]);

      if (error) {
        setMessage({ text: `Error: ${error.message}`, type: 'error' });
      } else {
        setMessage({ text: 'Usage logged!', type: 'success' });
        setForm({
          roll_id: '',
          job_code: '',
          used_length_ft: 0,
          waste_length_ft: 0,
          operator: '',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Protected>
      <div className="p-6 max-w-md mx-auto space-y-4">
        <Link href="/"> ← Back to Dashboard </Link>
        <h1 className="text-2xl font-semibold">Log Vinyl Usage</h1>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-sm font-medium">Roll</label>
          <select
            className="border p-2 w-full rounded"
            value={form.roll_id}
            onChange={(e) => setForm({ ...form, roll_id: e.target.value })}
            disabled={isLoading}
            required
          >
            {isLoading ? (
              <option value="" disabled>Loading rolls…</option>
            ) : (
              <>
                <option value="">Select roll...</option>
                {rolls.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.material
                      ? `${r.material.brand} ${r.material.film_code} – ${r.material.color_name} (${r.material.width_in}" wide)`
                      : r.id}
                  </option>
                ))}
              </>
            )}
          </select>

          <input
            className="border p-2 w-full rounded"
            placeholder="Job code / invoice (optional)"
            value={form.job_code}
            onChange={(e) => setForm({ ...form, job_code: e.target.value })}
          />

          <input
            type="number"
            className="border p-2 w-full rounded"
            placeholder="Used length (ft)"
            value={toInputValue(form.used_length_ft)}
            onChange={(e) =>
              setForm({ ...form, used_length_ft: Number(e.target.value) })
            }
            required
          />

          <input
            type="number"
            className="border p-2 w-full rounded"
            placeholder="Waste length (ft, optional)"
            value={toInputValue(form.waste_length_ft)}
            onChange={(e) =>
              setForm({ ...form, waste_length_ft: Number(e.target.value) })
            }
          />

          <input
            className="border p-2 w-full rounded"
            placeholder="Operator (optional)"
            value={form.operator}
            onChange={(e) =>
              setForm({ ...form, operator: e.target.value })
            }
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving…' : 'Save Usage'}
          </button>
        </form>

        {message && (
          <p className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
            {message.text}
          </p>
        )}

        <p className="text-xs text-gray-500 mt-2">
          Note: lengths are entered in feet here and stored as inches in the
          database.
        </p>
      </div>
    </Protected>
  );
}
