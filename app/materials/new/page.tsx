'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function NewMaterialPage() {
  const [form, setForm] = useState({
    brand: '',
    film_code: '',
    color_name: '',
    finish: '',
    width_in: 60,
    reorder_threshold_in: 300
  });
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('saving...');
    const { error } = await supabase.from('materials').insert([form]);
    if (error) {
      setStatus(`Error: ${error.message}`);
    } else {
      setStatus('Material saved!');
      setForm({
        brand: '',
        film_code: '',
        color_name: '',
        finish: '',
        width_in: 60,
        reorder_threshold_in: 300
      });
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Add New Material</h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          className="border p-2 w-full rounded"
          placeholder="Brand (3M, Avery, etc.)"
          value={form.brand}
          onChange={(e) => setForm({ ...form, brand: e.target.value })}
          required
        />
        <input
          className="border p-2 w-full rounded"
          placeholder="Film Code (2080-G12, etc.)"
          value={form.film_code}
          onChange={(e) => setForm({ ...form, film_code: e.target.value })}
          required
        />
        <input
          className="border p-2 w-full rounded"
          placeholder="Color Name"
          value={form.color_name}
          onChange={(e) => setForm({ ...form, color_name: e.target.value })}
          required
        />
        <input
          className="border p-2 w-full rounded"
          placeholder="Finish (Gloss, Matte, etc.)"
          value={form.finish}
          onChange={(e) => setForm({ ...form, finish: e.target.value })}
        />
        <input
          type="number"
          className="border p-2 w-full rounded"
          placeholder="Width (in)"
          value={form.width_in}
          onChange={(e) => setForm({ ...form, width_in: Number(e.target.value) })}
        />
        <input
          type="number"
          className="border p-2 w-full rounded"
          placeholder="Reorder threshold (in)"
          value={form.reorder_threshold_in}
          onChange={(e) =>
            setForm({ ...form, reorder_threshold_in: Number(e.target.value) })
          }
        />

        <button
          type="submit"
          className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
        >
          Save Material
        </button>
      </form>

      {status && <p className="text-sm text-gray-600">{status}</p>}
    </div>
  );
}