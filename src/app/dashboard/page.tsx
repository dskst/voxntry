'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Attendee } from '@/types';
import { Search, UserCheck, RefreshCw, LogOut, X, CheckCircle2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { filterAttendees, SearchableField } from '@/utils/search';
import { api } from '@/lib/api-client';

// 検索対象フィールドを定数として定義（コンポーネント外）
const SEARCH_FIELDS: SearchableField[] = ['name', 'nameKana', 'affiliation', 'affiliationKana'];

// Focus ring utility for keyboard accessibility
const FOCUS_RING = 'focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-gray-900';

// Helper to parse comma-separated string into array (for novelties)
function parseCommaSeparated(value: string | undefined): string[] {
    if (!value || value.trim() === '') return [];
    const normalized = value.replace(/、/g, ',');
    return normalized.split(',').map(item => item.trim()).filter(item => item !== '');
}

// Get attribute badge color class
function getAttributeColorClass(attribute: string | undefined): string {
    if (!attribute) return 'bg-gray-600 text-white';
    const attr = attribute.toLowerCase();
    if (attr.includes('speaker') || attr.includes('登壇')) return 'bg-purple-600 text-white';
    if (attr.includes('sponsor') || attr.includes('スポンサー')) return 'bg-yellow-600 text-white';
    if (attr.includes('staff') || attr.includes('スタッフ')) return 'bg-blue-600 text-white';
    if (attr.includes('press') || attr.includes('報道')) return 'bg-pink-600 text-white';
    if (attr.includes('vip')) return 'bg-red-600 text-white';
    return 'bg-gray-600 text-white';
}

// Toast notification type
interface ToastData {
    id: number;
    message: string;
    type: 'success' | 'error';
}

// Toast notification component
function ToastNotification({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: number) => void }) {
    useEffect(() => {
        const timer = setTimeout(() => onDismiss(toast.id), 4000);
        return () => clearTimeout(timer);
    }, [toast.id, onDismiss]);

    return (
        <div
            className={`flex items-center justify-between gap-3 rounded-xl p-4 shadow-2xl backdrop-blur font-medium
                ${toast.type === 'error' ? 'bg-red-600/90 text-white' : 'bg-emerald-600/90 text-white'}`}
            role="alert"
        >
            <span>{toast.message}</span>
            <button
                onClick={() => onDismiss(toast.id)}
                className={`p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-white/20 rounded-lg transition ${FOCUS_RING}`}
                aria-label="Dismiss notification"
            >
                <X size={16} />
            </button>
        </div>
    );
}

// Confirmation Modal Component (extracted outside Dashboard for performance)
function ConfirmationModal({
    attendee,
    noveltiesArray,
    onConfirm,
    onCancel,
    isLoading,
}: {
    attendee: Attendee;
    noveltiesArray: string[];
    onConfirm: () => void;
    onCancel: () => void;
    isLoading: boolean;
}) {
    const modalRef = useRef<HTMLDivElement>(null);

    // H2: Escape key handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isLoading) onCancel();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onCancel, isLoading]);

    // H3: Focus trap
    useEffect(() => {
        const modal = modalRef.current;
        if (!modal) return;
        const focusable = modal.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        first.focus();
        const trap = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        };
        modal.addEventListener('keydown', trap);
        return () => modal.removeEventListener('keydown', trap);
    }, []);

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onCancel}
        >
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="checkin-modal-title"
                className="bg-gray-800 border border-gray-700 rounded-2xl max-w-lg w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-700">
                    <h2 id="checkin-modal-title" className="text-xl font-bold text-white">Check-In Confirmation</h2>
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className={`text-gray-400 hover:text-white transition p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-gray-700 ${FOCUS_RING}`}
                        aria-label="Close dialog"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Name - HERO element */}
                    <div className="text-center">
                        <p className="text-3xl font-extrabold text-white">{attendee.name}</p>
                        {attendee.nameKana && (
                            <p className="text-sm text-gray-400 mt-1">{attendee.nameKana}</p>
                        )}
                    </div>

                    {/* Affiliation */}
                    <p className="text-lg text-gray-300 text-center">{attendee.affiliation}</p>

                    {/* Attribute Badges */}
                    {attendee.attributes && attendee.attributes.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-2">
                            {attendee.attributes.map((attr, idx) => (
                                <span key={idx} className={`text-xs font-bold px-3 py-1 rounded-full ${getAttributeColorClass(attr)}`}>
                                    {attr}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="border-t border-gray-700" />

                    {/* Items to Hand Out */}
                    {attendee.items.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Items to Hand Out</p>
                            <div className="flex flex-wrap gap-2">
                                {attendee.items.map((item, idx) => (
                                    <span
                                        key={idx}
                                        className="text-sm text-yellow-400 bg-yellow-500/20 px-3 py-1.5 rounded-lg
                                                   border border-yellow-500/30 font-medium"
                                    >
                                        📂 {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Novelties */}
                    {noveltiesArray.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Additional Novelties</p>
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

                    {/* Memo */}
                    {attendee.memo && (
                        <div className="bg-amber-500/20 border border-amber-500/40 rounded-lg p-3">
                            <p className="text-xs text-amber-300 mb-1 font-semibold">⚠️ Important Note</p>
                            <p className="text-sm text-white">{attendee.memo}</p>
                        </div>
                    )}

                    {/* Additional Info Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {attendee.bodySize && (
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                                <p className="text-xs text-blue-400 mb-1">Size</p>
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
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-4 p-6 border-t border-gray-700">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className={`flex-1 py-3 px-6 bg-gray-700 hover:bg-gray-600 text-white text-base
                                   rounded-xl font-medium transition active:scale-95 disabled:opacity-50 ${FOCUS_RING}`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 py-4 px-6 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white
                                   rounded-xl text-lg font-bold transition active:scale-95
                                   flex items-center justify-center gap-2 disabled:opacity-50 ${FOCUS_RING}`}
                    >
                        <CheckCircle2 size={20} />
                        {isLoading ? 'Checking In...' : 'Confirm Check-In'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Cancel Confirmation Modal (replaces native confirm() dialog)
function CancelConfirmModal({
    attendeeName,
    onConfirm,
    onCancel,
    isLoading,
}: {
    attendeeName: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading: boolean;
}) {
    const modalRef = useRef<HTMLDivElement>(null);

    // H2: Escape key handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isLoading) onCancel();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onCancel, isLoading]);

    // H3: Focus trap
    useEffect(() => {
        const modal = modalRef.current;
        if (!modal) return;
        const focusable = modal.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        first.focus();
        const trap = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        };
        modal.addEventListener('keydown', trap);
        return () => modal.removeEventListener('keydown', trap);
    }, []);

    return (
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onCancel}
        >
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="cancel-modal-title"
                className="bg-gray-800 border border-gray-700 rounded-2xl max-w-sm w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 text-center space-y-4">
                    <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                        <X size={28} className="text-red-400" />
                    </div>
                    <h2 id="cancel-modal-title" className="text-xl font-bold text-white">Cancel Check-In</h2>
                    <p className="text-gray-300">
                        Cancel check-in for <span className="font-bold text-white">{attendeeName}</span>?
                    </p>
                </div>
                <div className="flex gap-4 p-6 border-t border-gray-700">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className={`flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white
                                   rounded-xl font-medium transition active:scale-95 disabled:opacity-50 ${FOCUS_RING}`}
                    >
                        Keep
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white
                                   rounded-xl font-bold transition active:scale-95 disabled:opacity-50
                                   flex items-center justify-center gap-2
                                   focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-900"
                    >
                        {isLoading ? 'Canceling...' : 'Cancel Check-In'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const router = useRouter();
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [checkingIn, setCheckingIn] = useState<string | null>(null);
    const [cancelingCheckIn, setCancelingCheckIn] = useState<string | null>(null);
    const [confirmModalData, setConfirmModalData] = useState<Attendee | null>(null);
    const [cancelModalData, setCancelModalData] = useState<{ id: string; name: string } | null>(null);
    const [toasts, setToasts] = useState<ToastData[]>([]);
    const [recentlyCheckedIn, setRecentlyCheckedIn] = useState<string | null>(null);

    // Toast helpers
    const addToast = useCallback((message: string, type: 'success' | 'error') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const dismissToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const fetchAttendees = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/attendees');
            if (res.status === 401) {
                router.push('/');
                return;
            }
            const data = await res.json();
            if (data.attendees) {
                setAttendees(data.attendees);
            }
        } catch (error) {
            console.error('Error fetching attendees:', error);
            addToast('Failed to load attendees', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300);

        return () => {
            clearTimeout(handler);
        };
    }, [query]);

    const filteredAttendees = useMemo(() => {
        try {
            return filterAttendees(attendees, debouncedQuery, {
                fields: SEARCH_FIELDS,
                normalize: true,
            });
        } catch (error) {
            console.error('Search filtering error:', error);
            return attendees;
        }
    }, [attendees, debouncedQuery]);

    // Memoize novelties computation per attendee
    const noveltiesMap = useMemo(() => {
        const map = new Map<string, string[]>();
        for (const a of attendees) {
            map.set(a.id, parseCommaSeparated(a.novelties));
        }
        return map;
    }, [attendees]);

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
                const checkedInId = confirmModalData.id;
                // Optimistic update
                setAttendees((prev) =>
                    prev.map((a) =>
                        a.id === checkedInId
                            ? { ...a, checkedIn: true, checkedInAt: new Date().toISOString() }
                            : a
                    )
                );
                setConfirmModalData(null);
                // Success feedback
                addToast(`${confirmModalData.name} チェックイン完了`, 'success');
                setRecentlyCheckedIn(checkedInId);
                setTimeout(() => setRecentlyCheckedIn(null), 1500);
            } else if (res.status === 403) {
                addToast('セッションが更新されました。もう一度お試しください', 'error');
                window.location.reload();
            } else {
                addToast('Check-in failed. Please try again.', 'error');
            }
        } catch {
            addToast('Error during check-in. Please try again.', 'error');
        } finally {
            setCheckingIn(null);
        }
    };

    // Open cancel confirmation modal (replaces native confirm())
    const handleCancelCheckIn = (id: string, name: string) => {
        setCancelModalData({ id, name });
    };

    // Perform actual cancel after confirmation
    const confirmCancelCheckIn = async () => {
        if (!cancelModalData) return;

        const { id } = cancelModalData;
        setCancelingCheckIn(id);
        try {
            const res = await api.post('/api/attendees/checkout', { rowId: id });

            if (res.ok) {
                setAttendees((prev) =>
                    prev.map((a) =>
                        a.id === id ? { ...a, checkedIn: false, checkedInAt: undefined } : a
                    )
                );
                setCancelModalData(null);
            } else if (res.status === 403) {
                addToast('セッションが更新されました。もう一度お試しください', 'error');
                window.location.reload();
            } else {
                addToast('Cancel check-in failed. Please try again.', 'error');
            }
        } catch {
            addToast('Error during cancel check-in. Please try again.', 'error');
        } finally {
            setCancelingCheckIn(null);
        }
    };

    const stats = useMemo(() => {
        const total = attendees.length;
        const checkedIn = attendees.filter((a) => a.checkedIn).length;
        return { total, checkedIn };
    }, [attendees]);

    const isDebouncing = query !== debouncedQuery;

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-4 pb-20">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-gray-900/95 backdrop-blur z-10 py-5 border-b border-gray-800 shadow-lg shadow-gray-900/50">
                <div>
                    <h1 className="text-2xl font-extrabold text-white">VOXNTRY Dashboard</h1>
                    <div role="status" aria-live="polite">
                        <p className="text-sm text-gray-300">
                            <span className="text-emerald-400 font-bold text-base">{stats.checkedIn}</span>
                            <span className="text-gray-400"> / </span>
                            <span className="font-medium">{stats.total}</span>
                            <span className="text-gray-400 ml-1">checked in</span>
                        </p>
                        {stats.total > 0 && (
                            <div className="mt-1 w-32 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                    style={{ width: `${(stats.checkedIn / stats.total) * 100}%` }}
                                />
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchAttendees}
                        className={`p-2.5 min-h-[44px] min-w-[44px] bg-gray-800 rounded-xl hover:bg-gray-700 transition flex items-center justify-center ${FOCUS_RING}`}
                        aria-label="Refresh attendee list"
                        title="Refresh"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => router.push('/login')}
                        className={`p-2.5 min-h-[44px] min-w-[44px] bg-gray-800 rounded-xl hover:bg-red-900/50 transition text-red-400 flex items-center justify-center ${FOCUS_RING}`}
                        aria-label="Logout"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 space-y-4">
                <div className="relative">
                    {isDebouncing ? (
                        <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 animate-spin" size={20} />
                    ) : (
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    )}
                    <input
                        type="text"
                        placeholder="名前・かな・所属で検索..."
                        className={`w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-10 pr-12 text-lg text-white
                                   transition ${FOCUS_RING} focus:border-emerald-500`}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        aria-label="Search attendees by name, kana, or affiliation"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => {
                                setQuery('');
                                setDebouncedQuery('');
                            }}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2.5 min-h-[44px] min-w-[44px]
                                       flex items-center justify-center text-gray-400 hover:text-white transition
                                       rounded-lg hover:bg-gray-700 ${FOCUS_RING}`}
                            aria-label="検索をクリア"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
                {debouncedQuery && (
                    <div className="text-sm text-gray-400" aria-live="polite">
                        検索結果: <span className="text-emerald-400 font-semibold">{filteredAttendees.length}</span>件
                        {filteredAttendees.length !== attendees.length && (
                            <span className="text-gray-400"> / 全{attendees.length}件</span>
                        )}
                    </div>
                )}
            </div>

            {/* List */}
            <div className="space-y-2">
                {loading ? (
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="animate-pulse bg-gray-800 rounded-lg p-4 border border-gray-700 flex justify-between items-center">
                                <div className="flex-1">
                                    <div className="h-3 bg-gray-700 rounded w-20 mb-2" />
                                    <div className="h-5 bg-gray-700 rounded w-40 mb-1" />
                                    <div className="h-3 bg-gray-700 rounded w-28" />
                                </div>
                                <div className="h-10 w-20 bg-gray-700 rounded-xl" />
                            </div>
                        ))}
                    </div>
                ) : filteredAttendees.length === 0 ? (
                    <div className="text-center py-16 space-y-3">
                        <Search size={48} className="text-gray-600 mx-auto" />
                        <p className="text-lg text-gray-400">No attendees found.</p>
                        {debouncedQuery && (
                            <>
                                <p className="text-sm text-gray-400">Try a different search term</p>
                                <button
                                    onClick={() => {
                                        setQuery('');
                                        setDebouncedQuery('');
                                    }}
                                    className={`mt-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300
                                               rounded-lg transition text-sm ${FOCUS_RING}`}
                                >
                                    Clear search
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    filteredAttendees.map((attendee) => {
                        const noveltiesArray = noveltiesMap.get(attendee.id) || [];

                        return (
                            <div
                                key={attendee.id}
                                className={`p-4 rounded-lg border border-l-4 transition-all duration-300
                                    ${attendee.checkedIn
                                        ? 'bg-emerald-950/30 border-emerald-700/40 border-l-emerald-500'
                                        : 'bg-gray-800 border-gray-700 border-l-transparent'
                                    }
                                    ${recentlyCheckedIn === attendee.id
                                        ? 'ring-2 ring-emerald-400 scale-[1.01]'
                                        : ''
                                    }
                                    flex justify-between items-center`}
                            >
                                <div className="flex-1 min-w-0">
                                    {/* Attribute Badges */}
                                    {attendee.attributes && attendee.attributes.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-1">
                                            {attendee.attributes.map((attr, idx) => (
                                                <span key={idx} className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${getAttributeColorClass(attr)}`}>
                                                    {attr}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Name (PRIMARY - above affiliation for quick scanning) */}
                                    <h3 className="text-lg font-bold text-white leading-tight line-clamp-2">
                                        {attendee.name}
                                    </h3>

                                    {/* Affiliation (SECONDARY) */}
                                    <p className="text-xs text-gray-300 mb-1 truncate">
                                        {attendee.affiliation}
                                    </p>

                                    {/* Name Kana */}
                                    {attendee.nameKana && (
                                        <p className="text-xs text-gray-400 mb-2">
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

                                <div className="ml-3 flex-shrink-0">
                                    {attendee.checkedIn ? (
                                        <button
                                            onClick={() => handleCancelCheckIn(attendee.id, attendee.name)}
                                            disabled={cancelingCheckIn === attendee.id}
                                            className={`flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl transition min-h-[48px]
                                                       bg-emerald-600/20 border border-emerald-600/50 text-emerald-400
                                                       hover:bg-red-600/20 hover:border-red-600/50 hover:text-red-400
                                                       active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${FOCUS_RING}`}
                                            aria-label={`Cancel check-in for ${attendee.name}`}
                                        >
                                            <UserCheck size={24} />
                                            <span className="text-xs font-medium">
                                                {cancelingCheckIn === attendee.id ? 'Canceling...' : 'Checked In'}
                                            </span>
                                            <span className="text-[10px] text-gray-400 mt-0.5">tap to cancel</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleCheckIn(attendee)}
                                            disabled={checkingIn === attendee.id}
                                            className={`bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white
                                                       font-bold py-3 px-5 rounded-xl min-h-[48px] text-sm
                                                       transition disabled:opacity-50 disabled:cursor-not-allowed
                                                       active:scale-95 ${FOCUS_RING}`}
                                            aria-label={`Check in ${attendee.name}`}
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

            {/* Check-in Confirmation Modal */}
            {confirmModalData && (
                <ConfirmationModal
                    attendee={confirmModalData}
                    noveltiesArray={noveltiesMap.get(confirmModalData.id) || []}
                    onConfirm={confirmCheckIn}
                    onCancel={() => setConfirmModalData(null)}
                    isLoading={checkingIn === confirmModalData.id}
                />
            )}

            {/* Cancel Check-in Confirmation Modal */}
            {cancelModalData && (
                <CancelConfirmModal
                    attendeeName={cancelModalData.name}
                    onConfirm={confirmCancelCheckIn}
                    onCancel={() => setCancelModalData(null)}
                    isLoading={cancelingCheckIn === cancelModalData.id}
                />
            )}

            {/* Toast Notifications */}
            {toasts.length > 0 && (
                <div className="fixed bottom-20 left-4 right-4 z-50 space-y-2">
                    {toasts.map((toast) => (
                        <ToastNotification key={toast.id} toast={toast} onDismiss={dismissToast} />
                    ))}
                </div>
            )}
        </div>
    );
}
