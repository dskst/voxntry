'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        conferenceId: '',
        password: '',
        staffName: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Auto-login in development mode
    useEffect(() => {
        const isDevelopment = process.env.NODE_ENV === 'development';
        const autoLogin = process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN === 'true';

        if (isDevelopment && autoLogin) {
            const devConferenceId = process.env.NEXT_PUBLIC_DEV_CONFERENCE_ID || 'demo-conf';
            const devPassword = process.env.NEXT_PUBLIC_DEV_PASSWORD || 'password123';
            const devStaffName = process.env.NEXT_PUBLIC_DEV_STAFF_NAME || 'DevUser';

            setLoading(true);
            fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    conferenceId: devConferenceId,
                    password: devPassword,
                    staffName: devStaffName,
                }),
            })
                .then(async res => {
                    console.log('Login response status:', res.status);
                    console.log('Login response headers:', res.headers);
                    const setCookieHeader = res.headers.get('set-cookie');
                    console.log('Set-Cookie header:', setCookieHeader);
                    return res.json();
                })
                .then(async data => {
                    console.log('Login response data:', data);
                    if (data.success) {
                        console.log('Login successful, redirecting to dashboard...');
                        // Use Next.js router for proper client-side navigation with cookies
                        router.push('/dashboard');
                    } else {
                        setError('Auto-login failed. Please login manually.');
                        setLoading(false);
                    }
                })
                .catch((err) => {
                    console.error('Auto-login error:', err);
                    setError('Auto-login failed. Please login manually.');
                    setLoading(false);
                });
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Login failed');
            }

            console.log('Manual login successful, redirecting to dashboard...');
            // Use Next.js router for proper client-side navigation with cookies
            router.push('/dashboard');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full border border-gray-700">
                <h1 className="text-2xl font-bold text-white mb-6 text-center">
                    VOXNTRY Login
                </h1>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Conference ID</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-blue-500"
                            value={formData.conferenceId}
                            onChange={(e) => setFormData({ ...formData, conferenceId: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Password</label>
                        <input
                            type="password"
                            required
                            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-blue-500"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Staff Name</label>
                        <input
                            type="text"
                            required
                            placeholder="Your Name"
                            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-blue-500"
                            value={formData.staffName}
                            onChange={(e) => setFormData({ ...formData, staffName: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition disabled:opacity-50"
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
}
