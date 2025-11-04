// app/test-supabase/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type TestRow = {
  id: number;
  note: string | null;
};

export default function TestSupabasePage() {
  const [rows, setRows] = useState<TestRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('test_ping')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setRows(data || []);
      }
      setLoading(false);
    }

    load();
  }, []);

  if (loading) return <div className="p-4">Loading…</div>;

  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Supabase Test</h1>
      <p className="text-sm text-gray-500">
        If you see rows below, the app is talking to your Supabase project.
      </p>
      <ul className="list-disc list-inside">
        {rows.map((row) => (
          <li key={row.id}>
            #{row.id}: {row.note}
          </li>
        ))}
      </ul>
    </div>
  );
}