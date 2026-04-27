'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Protected } from '@/app/components/Protected';

export default function NewMaterialPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    brand: '',
    film_code: '',
    color_name: '',
    finish: '',
    width_in: 60,
    reorder_threshold_in: 300,
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.from('materials').insert([form]);
      if (error) {
        setErrorMsg(error.message);
      } else {
        router.push('/');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Protected>
      <div className="p-6 max-w-md mx-auto space-y-4">
        <Link href="/"> ← Back to Dashboard </Link>
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
            placeholder="Width (inches) — default 60 in"
            value={form.width_in === 0 ? '' : form.width_in}
            onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, width_in: val === '' ? 0 : Number(val) });
            }}
          />
          <input
            type="number"
            className="border p-2 w-full rounded"
            placeholder="Reorder threshold (inches) — default 300 in (25 ft)"
            value={form.reorder_threshold_in === 0 ? '' : form.reorder_threshold_in}
            onChange={(e) => {
              const val = e.target.value;
              setForm({
                ...form,
                reorder_threshold_in: val === '' ? 0 : Number(val),
              });
            }}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving…' : 'Save Material'}
          </button>
        </form>

        {errorMsg && (
          <p className="text-sm text-red-600">{errorMsg}</p>
        )}
      </div>
    </Protected>
  );
}
