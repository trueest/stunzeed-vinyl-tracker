'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  usages: {
    used_length_in: number;
    waste_length_in: number;
  }[];
};

function inchesToFeet(inches: number): string {
  const feet = inches / 12;
  return feet.toFixed(1);
}

export default function QuickUsagePage() {
  const params = useParams();
  const router = useRouter();
  const rollId = params?.id as string | undefined;

  const [roll, setRoll] = useState<Roll | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

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
            width_in
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
        setStatusMsg(` Error loading roll: ${error.message}`);
        setLoading(false);
        return;
      }

      const mapped: Roll = {
        id: data.id,
        starting_length_in: data.starting_length_in,
        status: data.status,
        material: data.materials
          ? {
              brand: data.materials[0].brand,
              film_code: data.materials[0].film_code,
              color_name: data.materials[0].color_name,
              width_in: data.materials[0].width_in,
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
    if (!rollId) return;

    const used_length_in = Math.round(Number(usedFt) * 12);
    const waste_length_in = Math.round(Number(wasteFt || 0) * 12);

    if (used_length_in <= 0) {
      setStatusMsg(' Used length must be greater than 0.');
      return;
    }

    const { error } = await supabase.from('roll_usages').insert([
      {
        roll_id: rollId,
        used_length_in,
        waste_length_in,
      },
    ]);

    if (error) {
      setStatusMsg(` Error saving usage: ${error.message}`);
      return;
    }

    setStatusMsg(' Saved!');

    // Clear fields for next subtraction
    setUsedFt(0);
    setWasteFt(0);

    // Reload remaining
    const { data, error: reloadError } = await supabase
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
          width_in
        ),
        roll_usages (
          used_length_in,
          waste_length_in
        )
      `
      )
      .eq('id', rollId)
      .single();

    if (!reloadError && data) {
      const mapped: Roll = {
        id: data.id,
        starting_length_in: data.starting_length_in,
        status: data.status,
        material: data.materials
          ? {
              brand: data.materials.brand,
              film_code: data.materials.film_code,
              color_name: data.materials.color_name,
              width_in: data.materials.width_in,
            }
          : null,
        usages: data.roll_usages || [],
      };
      setRoll(mapped);
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

  const low =
    remainingIn !== null && remainingIn < 25 * 12; // under 25 ft

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-5 space-y-4">
        <div className="text-center space-y-1">
          <div className="text-xs text-gray-500">Quick Subtract</div>
          <div className="font-semibold">
            {roll.material
              ? `${roll.material.brand} ${roll.material.film_code}`
              : 'Roll'}
          </div>
          {roll.material && (
            <div className="text-xs text-gray-500">
              {roll.material.color_name} · {roll.material.width_in}" wide
            </div>
          )}
          <div className="text-sm mt-2">
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
              value={usedFt}
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
              value={wasteFt}
              onChange={(e) => setWasteFt(Number(e.target.value))}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-black text-white py-3 rounded-lg text-lg font-semibold"
          >
            Save
          </button>
        </form>

        {statusMsg && (
          <div className="text-xs text-gray-600 text-center">
            {statusMsg}
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
  );
}