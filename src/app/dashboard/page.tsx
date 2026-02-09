'use client';

import { useState, useEffect, useMemo } from 'react';
import { Attendee } from '@/types';
import { Search, UserCheck, RefreshCw, LogOut, X, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { filterAttendees, SearchableField } from '@/utils/search';
import { api } from '@/lib/api-client';

export default function Dashboard() {
    const router = useRouter();
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [checkingIn, setCheckingIn] = useState<string | null>(null);
    const [cancelingCheckIn, setCancelingCheckIn] = useState<string | null>(null);
    const [confirmModalData, setConfirmModalData] = useState<Attendee | null>(null);

    const fetchAttendees = async () => {
        setLoading(true);
        try {
            console.log('Fetching attendees...');

            // Fetch attendees - middleware will handle authentication
            const res = await api.get('/api/attendees');
            console.log('Fetch attendees response status:', res.status);
            if (res.status === 401) {
                console.error('Unauthorized - no valid token');
                router.push('/');
                return;
            }
            const data = await res.json();
            if (data.attendees) {
                setAttendees(data.attendees);
            }
        } catch (error) {
            console.error('Error fetching attendees:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendees();
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query);
        }, 400);

        return () => {
            clearTimeout(handler);
        };
    }, [query]);

    // 検索対象フィールドを定数として定義
    const SEARCH_FIELDS: SearchableField[] = ['name', 'nameKana', 'affiliation'];

    const filteredAttendees = useMemo(() => {
        try {
            return filterAttendees(attendees, debouncedQuery, {
                fields: SEARCH_FIELDS,
                normalize: true, // 全角・半角、ひらがな・カタカナを正規化
            });
        } catch (error) {
            console.error('Search filtering error:', error);
            // エラー時は全件表示（フォールバック）
            return attendees;
        }
    }, [attendees, debouncedQuery]);

    // Open modal for check-in confirmation
    const handleCheckIn = (attendee: Attendee) => {
        setConfirmModalData(attendee);
    };

    // Perform actual check-in after confirmation
    const confirmCheckIn = async () => {
        if (!confirmModalData) return;

        setCheckingIn(confirmModalData.id);
        try {
            const res = await api.post('/api/attendees/checkin', {
                rowId: confirmModalData.id,
            });

            if (res.ok) {
                // Optimistic update
                setAttendees((prev) =>
                    prev.map((a) =>
                        a.id === confirmModalData.id
                            ? { ...a, checkedIn: true, checkedInAt: new Date().toISOString() }
                            : a
                    )
                );
                setConfirmModalData(null); // Close modal
            } else if (res.status === 403) {
                // CSRF token validation failed - refresh page to get new token
                alert('セッションが更新されました。もう一度お試しください');
                window.location.reload();
            } else {
                alert('Check-in failed');
            }
        } catch (error) {
            alert('Error during check-in');
        } finally {
            setCheckingIn(null);
        }
    };

    // Handle check-in cancellation
    const handleCancelCheckIn = async (id: string, name: string) => {
        if (!confirm(`Cancel check-in for ${name}?`)) return;

        setCancelingCheckIn(id);
        try {
            const res = await api.post('/api/attendees/checkout', { rowId: id });

            if (res.ok) {
                // Optimistic update
                setAttendees((prev) =>
                    prev.map((a) =>
                        a.id === id ? { ...a, checkedIn: false, checkedInAt: undefined } : a
                    )
                );
            } else if (res.status === 403) {
                // CSRF token validation failed - refresh page to get new token
                alert('セッションが更新されました。もう一度お試しください');
                window.location.reload();
            } else {
                alert('Cancel check-in failed');
            }
        } catch (error) {
            alert('Error during cancel check-in');
        } finally {
            setCancelingCheckIn(null);
        }
    };

    const stats = useMemo(() => {
        const total = attendees.length;
        const checkedIn = attendees.filter((a) => a.checkedIn).length;
        return { total, checkedIn };
    }, [attendees]);

    // Helper to parse comma-separated string into array (for novelties)
    const parseCommaSeparated = (value: string | undefined): string[] => {
        if (!value || value.trim() === '') return [];
        const normalized = value.replace(/、/g, ',');
        return normalized.split(',').map(item => item.trim()).filter(item => item !== '');
    };

    // Get attribute badge color
    const getAttributeColor = (attribute: string | undefined) => {
        if (!attribute) return null;
        const attr = attribute.toLowerCase();
        if (attr.includes('speaker') || attr.includes('登壇')) return 'purple';
        if (attr.includes('sponsor') || attr.includes('スポンサー')) return 'yellow';
        if (attr.includes('staff') || attr.includes('スタッフ')) return 'blue';
        if (attr.includes('press') || attr.includes('報道')) return 'pink';
        if (attr.includes('vip')) return 'red';
        return 'gray';
    };

    // Confirmation Modal Component
    const ConfirmationModal = ({
        attendee,
        onConfirm,
        onCancel,
        isLoading,
    }: {
        attendee: Attendee;
        onConfirm: () => void;
        onCancel: () => void;
        isLoading: boolean;
    }) => {
        const noveltiesArray = parseCommaSeparated(attendee.novelties);

        return (
            <div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4
                           animate-in fade-in duration-200"
                onClick={onCancel}
            >
                <div
                    className="bg-gray-800 border border-gray-700 rounded-2xl max-w-md w-full
                               shadow-2xl animate-in zoom-in-95 duration-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-gray-700">
                        <h2 className="text-xl font-bold text-white">Check-In Confirmation</h2>
                        <button
                            onClick={onCancel}
                            disabled={isLoading}
                            className="text-gray-400 hover:text-white transition p-1 rounded-lg hover:bg-gray-700"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                        {/* Attribute Badges */}
                        {attendee.attributes && attendee.attributes.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-2">
                                {attendee.attributes.map((attr, idx) => (
                                    <span key={idx} className={`text-xs font-bold px-3 py-1 rounded-full ${
                                        getAttributeColor(attr) === 'purple' ? 'bg-purple-600 text-white' :
                                        getAttributeColor(attr) === 'yellow' ? 'bg-yellow-600 text-white' :
                                        getAttributeColor(attr) === 'blue' ? 'bg-blue-600 text-white' :
                                        getAttributeColor(attr) === 'pink' ? 'bg-pink-600 text-white' :
                                        getAttributeColor(attr) === 'red' ? 'bg-red-600 text-white' :
                                        'bg-gray-600 text-white'
                                    }`}>
                                        {attr}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Affiliation */}
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Affiliation</p>
                            <p className="text-lg text-gray-300">{attendee.affiliation}</p>
                        </div>

                        {/* Name */}
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Name</p>
                            <p className="text-2xl font-bold text-white">{attendee.name}</p>
                            {attendee.nameKana && (
                                <p className="text-sm text-gray-400 mt-1">{attendee.nameKana}</p>
                            )}
                        </div>

                        {/* Items to Hand Out */}
                        {attendee.items.length > 0 && (
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Items to Hand Out</p>
                                <div className="flex flex-wrap gap-2">
                                    {attendee.items.map((item, idx) => (
                                        <span
                                            key={idx}
                                            className="text-sm text-yellow-400 bg-yellow-500/20 px-3 py-1.5 rounded-lg
                                                       border border-yellow-500/30 font-medium"
                                        >
                                            🎁 {item}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Memo */}
                        {attendee.memo && (
                            <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-3">
                                <p className="text-xs text-orange-400 mb-1 font-semibold">⚠️ Important Note</p>
                                <p className="text-sm text-white">{attendee.memo}</p>
                            </div>
                        )}

                        {/* Additional Info Grid */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            {attendee.bodySize && (
                                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                                    <p className="text-xs text-blue-400 mb-1">Body Size</p>
                                    <p className="text-lg font-bold text-blue-300">
                                        👕 {attendee.bodySize}
                                    </p>
                                </div>
                            )}

                            {attendee.attendsReception !== undefined && (
                                <div
                                    className={`rounded-lg p-3 border ${
                                        attendee.attendsReception
                                            ? 'bg-green-500/10 border-green-500/30'
                                            : 'bg-gray-500/10 border-gray-500/30'
                                    }`}
                                >
                                    <p className="text-xs text-gray-400 mb-1">Reception</p>
                                    <p
                                        className={`text-sm font-bold ${
                                            attendee.attendsReception
                                                ? 'text-green-300'
                                                : 'text-gray-300'
                                        }`}
                                    >
                                        🍽️{' '}
                                        {attendee.attendsReception ? '参加' : '不参加'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Novelties */}
                        {noveltiesArray.length > 0 && (
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Additional Novelties</p>
                                <div className="flex flex-wrap gap-2">
                                    {noveltiesArray.map((item, idx) => (
                                        <span
                                            key={idx}
                                            className="text-sm text-pink-400 bg-pink-500/20 px-3 py-1.5 rounded-lg
                                                       border border-pink-500/30 font-medium"
                                        >
                                            🎁 {item}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex gap-3 p-6 border-t border-gray-700">
                        <button
                            onClick={onCancel}
                            disabled={isLoading}
                            className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white
                                       rounded-xl font-medium transition active:scale-95 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white
                                       rounded-xl font-bold transition active:scale-95
                                       flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <CheckCircle2 size={20} />
                            {isLoading ? 'Checking In...' : 'Confirm Check-In'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-4 pb-20">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-gray-900/95 backdrop-blur z-10 py-4 border-b border-gray-800">
                <div>
                    <h1 className="text-xl font-bold text-white">VOXNTRY Dashboard</h1>
                    <p className="text-sm text-gray-400">
                        Checked In: <span className="text-green-400 font-bold">{stats.checkedIn}</span> / {stats.total}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchAttendees}
                        className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition"
                        title="Refresh"
                    >
                        <RefreshCw size={20} />
                    </button>
                    <button
                        onClick={() => router.push('/login')}
                        className="p-2 bg-gray-800 rounded-full hover:bg-red-900/50 transition text-red-400"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-500" size={20} />
                    <input
                        type="text"
                        placeholder="名前・カナ・所属で検索..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>
                {debouncedQuery && (
                    <div className="text-sm text-gray-400">
                        検索結果: <span className="text-blue-400 font-semibold">{filteredAttendees.length}</span>件
                        {filteredAttendees.length !== attendees.length && (
                            <span className="text-gray-500"> / 全{attendees.length}件</span>
                        )}
                    </div>
                )}
            </div>

            {/* List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="text-center text-gray-500 py-10">Loading attendees...</div>
                ) : filteredAttendees.length === 0 ? (
                    <div className="text-center text-gray-500 py-10">No attendees found.</div>
                ) : (
                    filteredAttendees.map((attendee) => {
                        const noveltiesArray = parseCommaSeparated(attendee.novelties);

                        return (
                            <div
                                key={attendee.id}
                                className={`p-4 rounded-lg border ${attendee.checkedIn
                                    ? 'bg-green-900/10 border-green-900/30'
                                    : 'bg-gray-800 border-gray-700'
                                    } flex justify-between items-center transition`}
                            >
                                <div className="flex-1">
                                    {/* Attribute Badges */}
                                    {attendee.attributes && attendee.attributes.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-1">
                                            {attendee.attributes.map((attr, idx) => (
                                                <span key={idx} className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${
                                                    getAttributeColor(attr) === 'purple' ? 'bg-purple-600 text-white' :
                                                    getAttributeColor(attr) === 'yellow' ? 'bg-yellow-600 text-white' :
                                                    getAttributeColor(attr) === 'blue' ? 'bg-blue-600 text-white' :
                                                    getAttributeColor(attr) === 'pink' ? 'bg-pink-600 text-white' :
                                                    getAttributeColor(attr) === 'red' ? 'bg-red-600 text-white' :
                                                    'bg-gray-600 text-white'
                                                }`}>
                                                    {attr}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <p className="text-gray-400 text-xs uppercase font-semibold mb-1">
                                        {attendee.affiliation}
                                    </p>
                                    <h3 className="text-lg font-bold text-white leading-tight mb-1">
                                        {attendee.name}
                                    </h3>

                                    {/* Name Kana */}
                                    {attendee.nameKana && (
                                        <p className="text-xs text-gray-500 mb-2">
                                            {attendee.nameKana}
                                        </p>
                                    )}

                                    {/* Multiple item badges */}
                                    {attendee.items.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {attendee.items.map((item, idx) => (
                                                <span
                                                    key={idx}
                                                    className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded"
                                                >
                                                    📂 {item}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Novelties */}
                                    {noveltiesArray.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {noveltiesArray.map((item, idx) => (
                                                <span
                                                    key={idx}
                                                    className="text-xs text-pink-500 bg-pink-500/10 px-2 py-0.5 rounded"
                                                >
                                                    🎁 {item}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Attribute information */}
                                    <div className="flex gap-3 mt-2">
                                        {attendee.bodySize && (
                                            <div className="flex items-center gap-1 text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">
                                                <span>👕</span>
                                                <span>{attendee.bodySize}</span>
                                            </div>
                                        )}

                                        {attendee.attendsReception !== undefined && (
                                            <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                                                attendee.attendsReception
                                                    ? 'text-green-400 bg-green-400/10'
                                                    : 'text-gray-400 bg-gray-400/10'
                                            }`}>
                                                <span>🍽️</span>
                                                <span>
                                                    {attendee.attendsReception ? '懇親会参加' : '懇親会不参加'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    {attendee.checkedIn ? (
                                        <button
                                            onClick={() => handleCancelCheckIn(attendee.id, attendee.name)}
                                            disabled={cancelingCheckIn === attendee.id}
                                            className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition
                                                       bg-green-600/20 border border-green-600/50 text-green-400
                                                       hover:bg-red-600/20 hover:border-red-600/50 hover:text-red-400
                                                       active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <UserCheck size={24} />
                                            <span className="text-xs font-medium">
                                                {cancelingCheckIn === attendee.id ? 'Canceling...' : 'Checked In'}
                                            </span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleCheckIn(attendee)}
                                            disabled={checkingIn === attendee.id}
                                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg
                                                       transition disabled:opacity-50 disabled:cursor-not-allowed text-sm
                                                       active:scale-95"
                                        >
                                            {checkingIn === attendee.id ? 'Checking...' : 'Check In'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Confirmation Modal */}
            {confirmModalData && (
                <ConfirmationModal
                    attendee={confirmModalData}
                    onConfirm={confirmCheckIn}
                    onCancel={() => setConfirmModalData(null)}
                    isLoading={checkingIn === confirmModalData.id}
                />
            )}
        </div>
    );
}
