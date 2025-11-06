'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus('Logging in...');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setStatus(` ${error.message}`);
      setLoading(false);
      return;
    }

    setStatus(' Logged in!');
    setLoading(false);
    router.push('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-30 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-6 space-y-4">
        <h1 className="text-xl font-semibold text-center text-black">
          Login
        </h1>
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="email"
            className="border p-2 w-full rounded placeholder:text-gray-400 text-black"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="border p-2 w-full rounded placeholder:text-gray-400 text-black"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 disabled:opacity-60"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        {status && (
          <p className="text-xs text-gray-600 text-center">{status}</p>
        )}
        <p className="text-[11px] text-gray-500 text-center mt-1">
          For now, create users in the Supabase dashboard under Auth → Users.
        </p>
      </div>
    </div>
  );
}