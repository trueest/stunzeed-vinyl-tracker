'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Protected } from '@/app/components/Protected';
import { inchesToFeet } from '@/lib/utils';

type UsageRow = {
  id: string;
  used_length_in: number;
  waste_length_in: number;
  job_code: string | null;
  operator: string | null;
  created_at: string;
};

type RollDetail = {
  id: string;
  location: string | null;
  starting_length_in: number;
  status: string | null;
  note: string | null;
  material: {
    brand: string;
    film_code: string;
    color_name: string;
    width_in: number;
    reorder_threshold_in: number | null;
  } | null;
  usages: UsageRow[];
};


const DEFAULT_REORDER_THRESHOLD_IN = 300; // 25 ft

function toInputValue(n: number): number | '' {
  return n === 0 ? '' : n;
}

export default function RollDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rollId = params?.id as string | undefined;

  const [roll, setRoll] = useState<RollDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    used_length_ft: 0,
    waste_length_ft: 0,
    job_code: '',
    operator: '',
  });

  const remainingIn = useMemo(() => {
    if (!roll) return null;
    const totalUsed = roll.usages.reduce(
      (sum, u) => sum + u.used_length_in + (u.waste_length_in || 0),
      0
    );
    return roll.starting_length_in - totalUsed;
  }, [roll]);

  useEffect(() => {
    if (!rollId) return;

    async function loadRoll() {
      setLoading(true);
      const { data, error } = await supabase
        .from('rolls')
        .select(
          `
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
          ),
          roll_usages (
            id,
            used_length_in,
            waste_length_in,
            job_code,
            operator,
            created_at
          )
        `
        )
        .eq('id', rollId)
        .single();

      if (error) {
        setStatus({ text: `Error loading roll: ${error.message}`, type: 'error' });
        setLoading(false);
        return;
      }

      const mat = Array.isArray(data.materials) ? data.materials[0] : data.materials;

      const mapped: RollDetail = {
        id: data.id,
        location: data.location,
        starting_length_in: data.starting_length_in,
        status: data.status,
        note: data.note,
        material: mat
          ? {
              brand: mat.brand,
              film_code: mat.film_code,
              color_name: mat.color_name,
              width_in: mat.width_in,
              reorder_threshold_in: mat.reorder_threshold_in ?? null,
            }
          : null,
        usages: (data.roll_usages || []).sort(
          (a: UsageRow, b: UsageRow) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        ),
      };

      setRoll(mapped);
      setLoading(false);
    }

    loadRoll();
  }, [rollId]);

  async function handleLogUsage(e: React.FormEvent) {
    e.preventDefault();
    if (!rollId || !roll) return;

    const used_length_in = Math.round(Number(form.used_length_ft) * 12);
    const waste_length_in = Math.round(Number(form.waste_length_ft || 0) * 12);

    if (used_length_in <= 0) {
      setStatus({ text: 'Used length must be greater than 0.', type: 'error' });
      return;
    }

    if (remainingIn !== null && used_length_in + waste_length_in > remainingIn) {
      setStatus({
        text: `Cannot log ${inchesToFeet(used_length_in + waste_length_in)} ft — only ${inchesToFeet(remainingIn)} ft remaining on this roll.`,
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: insertedRow, error } = await supabase
        .from('roll_usages')
        .insert([
          {
            roll_id: rollId,
            job_code: form.job_code || null,
            operator: form.operator || null,
            used_length_in,
            waste_length_in,
          },
        ])
        .select('id, used_length_in, waste_length_in, job_code, operator, created_at')
        .single();

      if (error) {
        setStatus({ text: `Error saving usage: ${error.message}`, type: 'error' });
        return;
      }

      setStatus({ text: 'Usage logged!', type: 'success' });

      setForm({
        used_length_ft: 0,
        waste_length_ft: 0,
        job_code: '',
        operator: '',
      });

      if (insertedRow) {
        setRoll((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            usages: [insertedRow as UsageRow, ...prev.usages],
          };
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!rollId) {
    return <div className="p-4">No roll id provided.</div>;
  }

  if (loading || !roll) {
    return <div className="p-4">Loading roll…</div>;
  }

  const remainingFt =
    remainingIn !== null ? inchesToFeet(remainingIn) : '—';

  const lowThreshold = roll.material?.reorder_threshold_in ?? DEFAULT_REORDER_THRESHOLD_IN;

  const low = remainingIn !== null && remainingIn < lowThreshold;

  return (
    <Protected>
      <div className="p-6 space-y-4 max-w-3xl mx-auto">
        <button
          onClick={() => router.push('/rolls')}
          className="text-sm text-gray-600 hover:underline"
        >
          ← Back to rolls
        </button>

        <div className="border rounded-lg p-4 space-y-2">
          <h1 className="text-xl font-semibold">
            {roll.material
              ? `${roll.material.brand} ${roll.material.film_code} – ${roll.material.color_name} (${roll.material.width_in}" wide)`
              : 'Roll'}
          </h1>
          <div className="text-sm text-gray-600">
            Location: {roll.location || '—'} · Status:{' '}
            {roll.status || '—'}
          </div>
          {roll.note && (
            <div className="text-xs text-gray-500">Note: {roll.note}</div>
          )}
          <div className="mt-2 text-sm">
            Starting: {inchesToFeet(roll.starting_length_in)} ft
          </div>
          <div className="text-sm">
            Remaining:{' '}
            {remainingIn !== null ? `${remainingFt} ft` : '—'}
            {low && (
              <span className="ml-2 text-xs text-red-600">
                (Low inventory)
              </span>
            )}
          </div>
          <button
            onClick={() => router.push(`/quick/${roll.id}`)}
            className="text-xs border px-3 py-1 rounded hover:bg-gray-50"
          >
            Open Quick Log
          </button>
        </div>

        {/* Quick usage form */}
        <div className="border rounded-lg p-4 space-y-3">
          <h2 className="text-lg font-semibold">Log Usage</h2>
          <form onSubmit={handleLogUsage} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="number"
                className="border p-2 rounded w-1/2"
                placeholder="Used length (ft)"
                value={toInputValue(form.used_length_ft)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    used_length_ft: Number(e.target.value),
                  })
                }
                required
              />
              <input
                type="number"
                className="border p-2 rounded w-1/2"
                placeholder="Waste (ft, optional)"
                value={toInputValue(form.waste_length_ft)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    waste_length_ft: Number(e.target.value),
                  })
                }
              />
            </div>

            <input
              className="border p-2 rounded w-full"
              placeholder="Job code / invoice (optional)"
              value={form.job_code}
              onChange={(e) =>
                setForm({ ...form, job_code: e.target.value })
              }
            />

            <input
              className="border p-2 rounded w-full"
              placeholder="Operator (optional)"
              value={form.operator}
              onChange={(e) =>
                setForm({ ...form, operator: e.target.value })
              }
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving…' : 'Save Usage'}
            </button>
          </form>
          {status && (
            <p className={`text-sm mt-1 ${status.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
              {status.text}
            </p>
          )}
        </div>

        {/* Usage history */}
        <div className="border rounded-lg p-4 space-y-2">
          <h2 className="text-lg font-semibold">Usage History</h2>
          {roll.usages.length === 0 ? (
            <p className="text-sm text-gray-600">
              No usage logged yet for this roll.
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {roll.usages.map((u) => (
                <li key={u.id} className="flex justify-between">
                  <div>
                    {u.job_code && (
                      <span className="font-medium">{u.job_code} · </span>
                    )}
                    Used {inchesToFeet(u.used_length_in)} ft
                    {u.waste_length_in > 0 &&
                      ` (+${inchesToFeet(u.waste_length_in)} ft waste)`}
                    {u.operator && ` · ${u.operator}`}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(u.created_at).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Protected>
  );
}
