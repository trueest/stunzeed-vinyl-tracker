'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Protected } from '@/app/components/Protected';
import { inchesToFeet } from '@/lib/utils';

const DEFAULT_REORDER_THRESHOLD_IN = 300; // 25 ft

type Roll = {
  id: string;
  starting_length_in: number;
  status: string | null;
  material: {
    brand: string;
    film_code: string;
    color_name: string;
    width_in: number;
    reorder_threshold_in: number | null;
  } | null;
  usages: {
    used_length_in: number;
    waste_length_in: number;
  }[];
};


function toInputValue(n: number): number | '' {
  return n === 0 ? '' : n;
}

export default function QuickUsagePage() {
  const params = useParams();
  const router = useRouter();
  const rollId = params?.id as string | undefined;

  const [roll, setRoll] = useState<Roll | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [usedFt, setUsedFt] = useState<number>(0);
  const [wasteFt, setWasteFt] = useState<number>(0);

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
          starting_length_in,
          status,
          materials:material_id (
            brand,
            film_code,
            color_name,
            width_in,
            reorder_threshold_in
          ),
          roll_usages (
            used_length_in,
            waste_length_in
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

      const mapped: Roll = {
        id: data.id,
        starting_length_in: data.starting_length_in,
        status: data.status,
        material: mat
          ? {
              brand: mat.brand,
              film_code: mat.film_code,
              color_name: mat.color_name,
              width_in: mat.width_in,
              reorder_threshold_in: mat.reorder_threshold_in ?? null,
            }
          : null,
        usages: data.roll_usages || [],
      };

      setRoll(mapped);
      setLoading(false);
    }

    loadRoll();
  }, [rollId]);

  async function handleQuickLog(e: React.FormEvent) {
    e.preventDefault();
    if (!rollId || !roll) return;

    const used_length_in = Math.round(Number(usedFt) * 12);
    const waste_length_in = Math.round(Number(wasteFt || 0) * 12);

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
      const { error } = await supabase.from('roll_usages').insert([
        {
          roll_id: rollId,
          used_length_in,
          waste_length_in,
        },
      ]);

      if (error) {
        setStatus({ text: `Error saving usage: ${error.message}`, type: 'error' });
        return;
      }

      setStatus({ text: 'Saved!', type: 'success' });

      setUsedFt(0);
      setWasteFt(0);

      setRoll((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          usages: [...prev.usages, { used_length_in, waste_length_in }],
        };
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!rollId) {
    return <div className="p-4">No roll id provided.</div>;
  }

  if (loading || !roll) {
    return <div className="p-4">Loading…</div>;
  }

  const remainingFt =
    remainingIn !== null ? inchesToFeet(remainingIn) : '—';

  const low = remainingIn !== null && remainingIn < (roll.material?.reorder_threshold_in ?? DEFAULT_REORDER_THRESHOLD_IN);

  return (
    <Protected>
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-5 space-y-4">
          <div className="text-center space-y-1">
            <div className="text-xs text-gray-500">Quick Subtract</div>
            <div className="font-semibold text-black">
              {roll.material
                ? `${roll.material.brand} ${roll.material.film_code}`
                : 'Roll'}
            </div>
            {roll.material && (
              <div className="text-xs text-black">
                {roll.material.color_name} · {roll.material.width_in}" wide
              </div>
            )}
            <div className="text-sm mt-2 text-black">
              Remaining:{' '}
              <span className="font-semibold">
                {remainingFt} ft
              </span>
              {low && (
                <span className="ml-2 text-xs text-red-600">
                  (Low)
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleQuickLog} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Used (ft)
              </label>
              <input
                type="number"
                className="border rounded-lg w-full p-3 text-center text-lg"
                value={toInputValue(usedFt)}
                onChange={(e) => setUsedFt(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Waste (ft, optional)
              </label>
              <input
                type="number"
                className="border rounded-lg w-full p-3 text-center text-lg"
                value={toInputValue(wasteFt)}
                onChange={(e) => setWasteFt(Number(e.target.value))}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-black text-white py-3 rounded-lg text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving…' : 'Save'}
            </button>
          </form>

          {status && (
            <div className={`text-xs text-center ${status.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
              {status.text}
            </div>
          )}

          <button
            onClick={() => router.push(`/rolls/${roll.id}`)}
            className="w-full text-xs text-gray-500 mt-1 underline"
          >
            View full details
          </button>
        </div>
      </div>
    </Protected>
  );
}
