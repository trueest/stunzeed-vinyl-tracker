'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

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

export default function NewUsagePage() {
  const [rolls, setRolls] = useState<Roll[]>([]);
  const [form, setForm] = useState({
    roll_id: '',
    job_code: '',
    used_length_ft: 0,
    waste_length_ft: 0,
    operator: '',
  });
  const [status, setStatus] = useState<string | null>(null);

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
        .eq('status', 'open');

      if (!error && data) {
        const mapped: Roll[] = data.map((row: any) => ({
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
    }

    loadRolls();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving...');

    if (!form.roll_id) {
      setStatus('Please select a roll.');
      return;
    }

    const used_length_in = Math.round(Number(form.used_length_ft) * 12);
    const waste_length_in = Math.round(Number(form.waste_length_ft || 0) * 12);

    if (used_length_in <= 0) {
      setStatus('Used length must be greater than 0.');
      return;
    }

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
      setStatus(`Error: ${error.message}`);
    } else {
      setStatus('Usage logged!');
      setForm({
        roll_id: '',
        job_code: '',
        used_length_ft: 0,
        waste_length_ft: 0,
        operator: '',
      });
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Log Vinyl Usage</h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Roll selector */}
        <label className="block text-sm font-medium">Roll</label>
        <select
          className="border p-2 w-full rounded"
          value={form.roll_id}
          onChange={(e) => setForm({ ...form, roll_id: e.target.value })}
          required
        >
          <option value="">Select roll...</option>
          {rolls.map((r) => (
            <option key={r.id} value={r.id}>
              {r.material
                ? `${r.material.brand} ${r.material.film_code} – ${r.material.color_name} (${r.material.width_in}" wide)`
                : r.id}
            </option>
          ))}
        </select>

        {/* Job code */}
        <input
          className="border p-2 w-full rounded"
          placeholder="Job code / invoice (optional)"
          value={form.job_code}
          onChange={(e) => setForm({ ...form, job_code: e.target.value })}
        />

        {/* Used length in feet */}
        <input
          type="number"
          className="border p-2 w-full rounded"
          placeholder="Used length (ft)"
          value={form.used_length_ft}
          onChange={(e) =>
            setForm({ ...form, used_length_ft: Number(e.target.value) })
          }
          required
        />

        {/* Waste length in feet */}
        <input
          type="number"
          className="border p-2 w-full rounded"
          placeholder="Waste length (ft, optional)"
          value={form.waste_length_ft}
          onChange={(e) =>
            setForm({ ...form, waste_length_ft: Number(e.target.value) })
          }
        />

        {/* Operator */}
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
          className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
        >
          Save Usage
        </button>
      </form>

      {status && <p className="text-sm text-gray-600">{status}</p>}

      <p className="text-xs text-gray-500 mt-2">
        Note: lengths are entered in feet here and stored as inches in the
        database.
      </p>
    </div>
  );
}