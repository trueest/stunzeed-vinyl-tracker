'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { Protected } from './components/Protected';
import { useRouter } from 'next/navigation';

type MaterialRemaining = {
  material_id: string;
  brand: string;
  film_code: string;
  color_name: string;
  width_in: number;
  reorder_threshold_in: number;
  total_remaining_in: number;
};

function inchesToFeet(inches: number): string {
  const feet = inches / 12;
  return feet.toFixed(1);
}

export default function DashboardPage() {
  const router = useRouter();
  const [materialsCount, setMaterialsCount] = useState<number | null>(null);
  const [openRollsCount, setOpenRollsCount] = useState<number | null>(null);
  const [lowInventory, setLowInventory] = useState<MaterialRemaining[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  useEffect(() => {
    async function load() {
      setLoading(true);

      // Total materials
      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select('id', { count: 'exact', head: true });

      if (materialsError) {
        setError(materialsError.message);
        setLoading(false);
        return;
      }

      setMaterialsCount(materialsData === null ? 0 : (materialsData as any).length);

      const { count: matCount, error: matCountError } = await supabase
        .from('materials')
        .select('*', { count: 'exact', head: true });

      if (!matCountError && matCount !== null) {
        setMaterialsCount(matCount);
      }

      // Open rolls count
      const { count: rollCount, error: rollsError } = await supabase
        .from('rolls')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

      if (rollsError) {
        setError(rollsError.message);
        setLoading(false);
        return;
      }

      setOpenRollsCount(rollCount ?? 0);

      // Low inventory list from material_remaining
      const { data: materialRemaining, error: mrError } = await supabase
        .from('material_remaining')
        .select(
          'material_id, brand, film_code, color_name, width_in, reorder_threshold_in, total_remaining_in'
        );

      if (mrError) {
        setError(mrError.message);
        setLoading(false);
        return;
      }

      const low = (materialRemaining || []).filter((m: any) => {
        const threshold = m.reorder_threshold_in || 0;
        if (threshold <= 0) return false;
        return m.total_remaining_in < threshold;
      });

      setLowInventory(low);
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return (
    <Protected><div className="p-6">Loading dashboard…</div>;
    </Protected> )
  }

  if (error) {
    return (
      <Protected><div className="p-6 text-red-600">
        Error loading dashboard: {error}
      </div>
    </Protected> );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Vinyl Inventory Dashboard</h1>
          <p className="text-sm text-gray-600">
            Quick overview of materials, rolls, and low inventory.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/rolls"
            className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
          >
            View Rolls
          </Link>
          <Link
            href="/rolls/new"
            className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
          >
            + New Roll
          </Link>
          <Link
            href="/materials/new"
            className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
          >
            + New Material
          </Link>
          <Link 
            href="/reports/usage"
            className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
          >
            Reports
          </Link>
          <button 
          onClick={handleLogout} 
          className="text-sm border px-3 py-1 rounded hover:bg-gray-50">
          Logout
          </button>
        </div>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-xs text-gray-500">Materials</div>
          <div className="text-2xl font-semibold">
            {materialsCount ?? 0}
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-xs text-gray-500">Open Rolls</div>
          <div className="text-2xl font-semibold">
            {openRollsCount ?? 0}
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-xs text-gray-500">Low Inventory</div>
          <div className="text-2xl font-semibold">
            {lowInventory.length}
          </div>
        </div>
      </div>

      {/* Low inventory list */}
      <section className="border rounded-lg p-4 space-y-3">
        <h2 className="text-lg font-semibold">Low Inventory Materials</h2>
        {lowInventory.length === 0 ? (
          <p className="text-sm text-gray-600">
            No materials are currently below their reorder thresholds.
          </p>
        ) : (
          <div className="space-y-2 text-sm">
            {lowInventory.map((m) => (
              <div
                key={m.material_id}
                className="flex items-center justify-between border-b last:border-b-0 pb-2"
              >
                <div>
                  <div className="font-medium">
                    {m.brand} {m.film_code} – {m.color_name}{' '}
                    ({m.width_in}" wide)
                  </div>
                  <div className="text-xs text-gray-600">
                    Remaining:{' '}
                    {inchesToFeet(m.total_remaining_in)} ft ·
                    Threshold:{' '}
                    {inchesToFeet(m.reorder_threshold_in)} ft
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}