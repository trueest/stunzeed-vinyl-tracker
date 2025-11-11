'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type Material = {
  id: string;
  brand: string;
  film_code: string;
  color_name: string;
  width_in: number;
};

export default function NewRollPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [form, setForm] = useState({
    material_id: '',
    supplier: '',
    starting_length_in: 1800, // 150 feet.
    cost_cents: 0,
    note: '',
  });
  const [status, setStatus] = useState<string | null>(null);

  // Load materials when component mounts
  useEffect(() => {
    async function loadMaterials() {
      const { data, error } = await supabase
        .from('materials')
        .select('id, brand, film_code, color_name, width_in')
        .order('brand');
      if (!error && data) setMaterials(data);
    }
    loadMaterials();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving...');
    const { error } = await supabase.from('rolls').insert([form]);
    if (error) {
      setStatus(`Error: ${error.message}`);
    } else {
      setStatus('Roll saved!');
      setForm({
        material_id: '',
        supplier: '',
        starting_length_in: 1800, // reset to default again
        cost_cents: 0,
        note: '',
      });
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <Link href="/"> ← Back to Dashboard </Link>
      <h1 className="text-2xl font-semibold">Add New Roll</h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-sm font-medium">Material</label>
        <select
          className="border p-2 w-full rounded"
          value={form.material_id}
          onChange={(e) => setForm({ ...form, material_id: e.target.value })}
          required
        >
          <option value="">Select material...</option>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.brand} {m.film_code} – {m.color_name} ({m.width_in}"
              wide)
            </option>
          ))}
        </select>

        <input
          className="border p-2 w-full rounded"
          placeholder="Supplier (Fellers, Metro, etc.)"
          value={form.supplier}
          onChange={(e) => setForm({ ...form, supplier: e.target.value })}
        />

        <input
          type="number"
          className="border p-2 w-full rounded"
          placeholder="Starting length (in) Set to 150 feet (1800 inches)"
          //value={form.starting_length_in} // default to 150 feet
          onChange={(e) =>
            setForm({ ...form, starting_length_in: Number(e.target.value) })
          }
          required
        />

        <input
          type="number"
          className="border p-2 w-full rounded"
          placeholder="Cost (USD)"
          value={form.cost_cents === 0 ? '' : form.cost_cents / 100}
          onChange={(e) =>
            setForm({
              ...form,
              cost_cents: Math.round(Number(e.target.value) * 100),
            })
          }
        />

        <textarea
          className="border p-2 w-full rounded"
          placeholder="Notes (optional)"
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
        >
          Save Roll
        </button>
      </form>

      {status && <p className="text-sm text-gray-600">{status}</p>}
    </div>
  );
}