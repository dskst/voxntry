'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Attendee } from '@/types';
import { Search, UserCheck, RefreshCw, LogOut, X, CheckCircle2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { filterAttendees, SearchableField } from '@/utils/search';
import { api } from '@/lib/api-client';
import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { clearStoredTheme } from '@/components/ThemeProvider';

// 検索対象フィールドを定数として定義（コンポーネント外）
const SEARCH_FIELDS: SearchableField[] = ['name', 'nameKana', 'affiliation', 'affiliationKana'];

// Focus ring utility for keyboard accessibility (theme-aware)
const FOCUS_RING = 'focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent-ring)] focus:ring-offset-2 focus:ring-offset-[var(--theme-bg-base)]';

// Helper to parse comma-separated string into array (for novelties)
function parseCommaSeparated(value: string | undefined): string[] {
    if (!value || value.trim() === '') return [];
    const normalized = value.replace(/、/g, ',');
    return normalized.split(',').map(item => item.trim()).filter(item => item !== '');
}

// Get attribute badge color class
function getAttributeColorClass(attribute: string | undefined): string {
    if (!attribute) return 'bg-theme-bg-muted text-theme-text-heading';
    const attr = attribute.toLowerCase();
    if (attr.includes('speaker') || attr.includes('登壇')) return 'bg-purple-600 text-white';
    if (attr.includes('sponsor') || attr.includes('スポンサー')) return 'bg-yellow-600 text-white';
    if (attr.includes('staff') || attr.includes('スタッフ')) return 'bg-blue-600 text-white';
    if (attr.includes('press') || attr.includes('報道')) return 'bg-pink-600 text-white';
    if (attr.includes('vip')) return 'bg-red-600 text-white';
    return 'bg-theme-bg-muted text-theme-text-heading';
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
            className={`flex items-center justify-between gap-3 rounded-xl p-4 shadow-2xl backdrop-blur font-medium text-white
                ${toast.type === 'error' ? 'bg-[var(--theme-toast-error-bg)]' : 'bg-[var(--theme-toast-success-bg)]'}`}
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
            className="fixed inset-0 bg-[var(--theme-bg-overlay)] backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onCancel}
        >
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="checkin-modal-title"
                className="bg-theme-bg-card border border-theme-border-default rounded-2xl max-w-lg w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-theme-border-default">
                    <h2 id="checkin-modal-title" className="text-xl font-bold text-theme-text-heading">Check-In Confirmation</h2>
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className={`text-theme-text-muted hover:text-theme-text-heading transition p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-theme-bg-elevated ${FOCUS_RING}`}
                        aria-label="Close dialog"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Name - HERO element */}
                    <div className="text-center">
                        <p className="text-3xl font-extrabold text-theme-text-heading">{attendee.name}</p>
                        {attendee.nameKana && (
                            <p className="text-sm text-theme-text-muted mt-1">{attendee.nameKana}</p>
                        )}
                    </div>

                    {/* Affiliation */}
                    <p className="text-lg text-theme-text-secondary text-center">{attendee.affiliation}</p>

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

                    <div className="border-t border-theme-border-default" />

                    {/* Items to Hand Out */}
                    {attendee.items.length > 0 && (
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-theme-text-muted mb-2">Items to Hand Out</p>
                            <div className="flex flex-wrap gap-2">
                                {attendee.items.map((item, idx) => (
                                    <span
                                        key={idx}
                                        className="text-sm text-[var(--theme-badge-items-text)] bg-[var(--theme-badge-items-bg)] px-3 py-1.5 rounded-lg
                                                   border border-[var(--theme-badge-items-text)]/30 font-medium"
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
                            <p className="text-xs font-semibold uppercase tracking-wider text-theme-text-muted mb-2">Additional Novelties</p>
                            <div className="flex flex-wrap gap-2">
                                {noveltiesArray.map((item, idx) => (
                                    <span
                                        key={idx}
                                        className="text-sm text-[var(--theme-badge-novelties-text)] bg-[var(--theme-badge-novelties-bg)] px-3 py-1.5 rounded-lg
                                                   border border-[var(--theme-badge-novelties-text)]/30 font-medium"
                                    >
                                        🎁 {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Memo */}
                    {attendee.memo && (
                        <div className="bg-[var(--theme-warning-bg)] border border-[var(--theme-warning-border)] rounded-lg p-3">
                            <p className="text-xs text-[var(--theme-warning-text)] mb-1 font-semibold">⚠️ Important Note</p>
                            <p className="text-sm text-theme-text-heading">{attendee.memo}</p>
                        </div>
                    )}

                    {/* Additional Info Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {attendee.bodySize && (
                            <div className="bg-[var(--theme-badge-size-bg)] border border-[var(--theme-badge-size-text)]/30 rounded-lg p-3">
                                <p className="text-xs text-[var(--theme-badge-size-text)] mb-1">Size</p>
                                <p className="text-lg font-bold text-[var(--theme-badge-size-text)]">
                                    👕 {attendee.bodySize}
                                </p>
                            </div>
                        )}

                        {attendee.attendsReception !== undefined && (
                            <div
                                className={`rounded-lg p-3 border ${
                                    attendee.attendsReception
                                        ? 'bg-[var(--theme-badge-reception-bg)] border-[var(--theme-badge-reception-text)]/30'
                                        : 'bg-theme-bg-elevated border-theme-border-default'
                                }`}
                            >
                                <p className="text-xs text-theme-text-muted mb-1">Reception</p>
                                <p
                                    className={`text-sm font-bold ${
                                        attendee.attendsReception
                                            ? 'text-[var(--theme-badge-reception-text)]'
                                            : 'text-theme-text-secondary'
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
                <div className="flex gap-4 p-6 border-t border-theme-border-default">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className={`flex-1 py-3 px-6 bg-theme-bg-elevated hover:brightness-95 text-theme-text-heading text-base
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
            className="fixed inset-0 bg-[var(--theme-bg-overlay)] backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onCancel}
        >
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="cancel-modal-title"
                className="bg-theme-bg-card border border-theme-border-default rounded-2xl max-w-sm w-full shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 text-center space-y-4">
                    <div className="w-14 h-14 bg-[var(--theme-danger-bg)] rounded-full flex items-center justify-center mx-auto">
                        <X size={28} className="text-[var(--theme-danger-text)]" />
                    </div>
                    <h2 id="cancel-modal-title" className="text-xl font-bold text-theme-text-heading">Cancel Check-In</h2>
                    <p className="text-theme-text-secondary">
                        Cancel check-in for <span className="font-bold text-theme-text-heading">{attendeeName}</span>?
                    </p>
                </div>
                <div className="flex gap-4 p-6 border-t border-theme-border-default">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className={`flex-1 py-3 px-4 bg-theme-bg-elevated hover:brightness-95 text-theme-text-heading
                                   rounded-xl font-medium transition active:scale-95 disabled:opacity-50 ${FOCUS_RING}`}
                    >
                        Keep
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white
                                   rounded-xl font-bold transition active:scale-95 disabled:opacity-50
                                   flex items-center justify-center gap-2 ${FOCUS_RING}`}
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
        <div className="min-h-screen bg-theme-bg-base text-theme-text-primary p-4 pb-20">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-[var(--theme-bg-header)] backdrop-blur z-10 py-5 border-b border-theme-border-subtle shadow-[var(--theme-shadow-header)]">
                <div>
                    <h1 className="text-2xl font-extrabold text-theme-text-heading">VOXNTRY Dashboard</h1>
                    <div role="status" aria-live="polite">
                        <p className="text-sm text-theme-text-secondary">
                            <span className="text-theme-accent-text font-bold text-base">{stats.checkedIn}</span>
                            <span className="text-theme-text-muted"> / </span>
                            <span className="font-medium">{stats.total}</span>
                            <span className="text-theme-text-muted ml-1">checked in</span>
                        </p>
                        {stats.total > 0 && (
                            <div className="mt-1 w-32 h-1.5 bg-[var(--theme-accent-track)] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[var(--theme-accent-progress)] rounded-full transition-all duration-500"
                                    style={{ width: `${(stats.checkedIn / stats.total) * 100}%` }}
                                />
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    <button
                        onClick={fetchAttendees}
                        className={`p-2.5 min-h-[44px] min-w-[44px] bg-theme-bg-card rounded-xl hover:bg-theme-bg-elevated transition flex items-center justify-center ${FOCUS_RING}`}
                        aria-label="Refresh attendee list"
                        title="Refresh"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => {
                            clearStoredTheme();
                            router.push('/login');
                        }}
                        className={`p-2.5 min-h-[44px] min-w-[44px] bg-theme-bg-card rounded-xl hover:bg-[var(--theme-danger-hover)] transition text-[var(--theme-danger-text)] flex items-center justify-center ${FOCUS_RING}`}
                        aria-label="Logout"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                    {/* Divider */}
                    <div className="w-px h-8 bg-theme-border-default" />
                    <ThemeSwitcher />
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 space-y-4">
                <div className="relative">
                    {isDebouncing ? (
                        <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-accent-text animate-spin" size={20} />
                    ) : (
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" size={20} />
                    )}
                    <input
                        type="text"
                        placeholder="名前・かな・所属で検索..."
                        className={`w-full bg-theme-bg-card border border-theme-border-input rounded-xl py-3 pl-10 pr-12 text-lg text-theme-text-heading
                                   transition ${FOCUS_RING} focus:border-theme-accent-solid`}
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
                                       flex items-center justify-center text-theme-text-muted hover:text-theme-text-heading transition
                                       rounded-lg hover:bg-theme-bg-elevated ${FOCUS_RING}`}
                            aria-label="検索をクリア"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
                {debouncedQuery && (
                    <div className="text-sm text-theme-text-muted" aria-live="polite">
                        検索結果: <span className="text-theme-accent-text font-semibold">{filteredAttendees.length}</span>件
                        {filteredAttendees.length !== attendees.length && (
                            <span className="text-theme-text-muted"> / 全{attendees.length}件</span>
                        )}
                    </div>
                )}
            </div>

            {/* List */}
            <div className="space-y-2">
                {loading ? (
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="animate-pulse bg-theme-bg-card rounded-lg p-4 border border-theme-border-default flex justify-between items-center">
                                <div className="flex-1">
                                    <div className="h-3 bg-theme-bg-elevated rounded w-20 mb-2" />
                                    <div className="h-5 bg-theme-bg-elevated rounded w-40 mb-1" />
                                    <div className="h-3 bg-theme-bg-elevated rounded w-28" />
                                </div>
                                <div className="h-10 w-20 bg-theme-bg-elevated rounded-xl" />
                            </div>
                        ))}
                    </div>
                ) : filteredAttendees.length === 0 ? (
                    <div className="text-center py-16 space-y-3">
                        <Search size={48} className="text-theme-text-muted mx-auto" />
                        <p className="text-lg text-theme-text-muted">No attendees found.</p>
                        {debouncedQuery && (
                            <>
                                <p className="text-sm text-theme-text-muted">Try a different search term</p>
                                <button
                                    onClick={() => {
                                        setQuery('');
                                        setDebouncedQuery('');
                                    }}
                                    className={`mt-2 px-4 py-2 bg-theme-bg-card hover:bg-theme-bg-elevated text-theme-text-secondary
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
                                        ? 'bg-[var(--theme-accent-surface)] border-[var(--theme-accent-border)] border-l-[var(--theme-accent-left)]'
                                        : 'bg-theme-bg-card border-theme-border-default border-l-transparent'
                                    }
                                    ${recentlyCheckedIn === attendee.id
                                        ? 'ring-2 ring-[var(--theme-accent-ring)] scale-[1.01]'
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
                                    <h3 className="text-lg font-bold text-theme-text-heading leading-tight line-clamp-2">
                                        {attendee.name}
                                    </h3>

                                    {/* Affiliation (SECONDARY) */}
                                    <p className="text-xs text-theme-text-secondary mb-1 truncate">
                                        {attendee.affiliation}
                                    </p>

                                    {/* Name Kana */}
                                    {attendee.nameKana && (
                                        <p className="text-xs text-theme-text-muted mb-2">
                                            {attendee.nameKana}
                                        </p>
                                    )}

                                    {/* Multiple item badges */}
                                    {attendee.items.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {attendee.items.map((item, idx) => (
                                                <span
                                                    key={idx}
                                                    className="text-xs text-[var(--theme-badge-items-text)] bg-[var(--theme-badge-items-bg)] px-2 py-0.5 rounded"
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
                                                    className="text-xs text-[var(--theme-badge-novelties-text)] bg-[var(--theme-badge-novelties-bg)] px-2 py-0.5 rounded"
                                                >
                                                    🎁 {item}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Attribute information */}
                                    <div className="flex gap-3 mt-2">
                                        {attendee.bodySize && (
                                            <div className="flex items-center gap-1 text-xs text-[var(--theme-badge-size-text)] bg-[var(--theme-badge-size-bg)] px-2 py-0.5 rounded">
                                                <span>👕</span>
                                                <span>{attendee.bodySize}</span>
                                            </div>
                                        )}

                                        {attendee.attendsReception !== undefined && (
                                            <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                                                attendee.attendsReception
                                                    ? 'text-[var(--theme-badge-reception-text)] bg-[var(--theme-badge-reception-bg)]'
                                                    : 'text-theme-text-muted bg-theme-bg-elevated'
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
                                                       bg-[var(--theme-accent-surface)] border border-[var(--theme-accent-border)] text-theme-accent-text
                                                       hover:bg-[var(--theme-danger-bg)] hover:border-[var(--theme-danger-text)]/50 hover:text-[var(--theme-danger-text)]
                                                       active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${FOCUS_RING}`}
                                            aria-label={`Cancel check-in for ${attendee.name}`}
                                        >
                                            <UserCheck size={24} />
                                            <span className="text-xs font-medium">
                                                {cancelingCheckIn === attendee.id ? 'Canceling...' : 'Checked In'}
                                            </span>
                                            <span className="text-[10px] text-theme-text-muted mt-0.5">tap to cancel</span>
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
