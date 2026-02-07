'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Attendee } from '@/types';
import { Search, Mic, Camera, UserCheck, RefreshCw, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
    const router = useRouter();
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [checkingIn, setCheckingIn] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessingAudio, setIsProcessingAudio] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            const audioChunks: Blob[] = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                setIsRecording(false);
                setIsProcessingAudio(true);
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const formData = new FormData();
                formData.append('audio', audioBlob);

                try {
                    const response = await fetch('/api/transcribe', {
                        method: 'POST',
                        body: formData,
                    });

                    if (response.ok) {
                        const data = await response.json();
                        setQuery(data.transcript);
                    } else {
                        console.error('Transcription failed');
                    }
                } catch (error) {
                    console.error('Error sending audio:', error);
                } finally {
                    setIsProcessingAudio(false);
                }

                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Could not access microphone');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
        }
    };

    const fetchAttendees = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/attendees');
            if (res.status === 401) {
                router.push('/login');
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
        }, 2000);

        return () => {
            clearTimeout(handler);
        };
    }, [query]);

    // Helper function to parse comma-separated items into an array
    const parseItemsToHandOut = (items: string): string[] => {
        if (!items || items.trim() === '') return [];
        // Normalize full-width comma to half-width
        const normalized = items.replace(/、/g, ',');
        return normalized.split(',').map(item => item.trim()).filter(item => item !== '');
    };

    const filteredAttendees = useMemo(() => {
        if (!debouncedQuery) return attendees;
        const lowerQuery = debouncedQuery.toLowerCase();
        return attendees.filter(
            (a) =>
                a.name.toLowerCase().includes(lowerQuery) ||
                a.company.toLowerCase().includes(lowerQuery)
        );
    }, [attendees, debouncedQuery]);

    const handleCheckIn = async (id: string, name: string) => {
        if (!confirm(`Check in ${name}?`)) return;

        setCheckingIn(id);
        try {
            const res = await fetch('/api/attendees/checkin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ rowId: id }),
            });

            if (res.ok) {
                // Optimistic update
                setAttendees((prev) =>
                    prev.map((a) =>
                        a.id === id ? { ...a, status: 'Checked In', timeStamp: new Date().toISOString() } : a
                    )
                );
            } else {
                alert('Check-in failed');
            }
        } catch (error) {
            alert('Error during check-in');
        } finally {
            setCheckingIn(null);
        }
    };

    const stats = useMemo(() => {
        const total = attendees.length;
        const checkedIn = attendees.filter((a) => a.status === 'Checked In').length;
        return { total, checkedIn };
    }, [attendees]);

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
                        placeholder="Search name or company..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={isProcessingAudio}
                        className={`flex items-center justify-center gap-2 border p-3 rounded-lg transition ${isRecording
                            ? 'bg-red-600/20 text-red-400 border-red-600/50 hover:bg-red-600/30'
                            : isProcessingAudio
                                ? 'bg-yellow-600/20 text-yellow-400 border-yellow-600/50 cursor-wait'
                                : 'bg-blue-600/20 text-blue-400 border-blue-600/50 hover:bg-blue-600/30'
                            }`}
                    >
                        <Mic size={20} className={isRecording ? 'animate-pulse' : isProcessingAudio ? 'animate-bounce' : ''} />
                        <span>
                            {isRecording
                                ? 'Stop Recording'
                                : isProcessingAudio
                                    ? 'Processing...'
                                    : 'Voice Input'}
                        </span>
                    </button>
                    <button className="flex items-center justify-center gap-2 bg-purple-600/20 text-purple-400 border border-purple-600/50 p-3 rounded-lg hover:bg-purple-600/30 transition">
                        <Camera size={20} />
                        <span>Scan Card</span>
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="text-center text-gray-500 py-10">Loading attendees...</div>
                ) : filteredAttendees.length === 0 ? (
                    <div className="text-center text-gray-500 py-10">No attendees found.</div>
                ) : (
                    filteredAttendees.map((attendee) => {
                        const itemsArray = parseItemsToHandOut(attendee.itemsToHandOut);

                        return (
                            <div
                                key={attendee.id}
                                className={`p-4 rounded-lg border ${attendee.status === 'Checked In'
                                    ? 'bg-green-900/10 border-green-900/30'
                                    : 'bg-gray-800 border-gray-700'
                                    } flex justify-between items-center transition`}
                            >
                                <div className="flex-1">
                                    <p className="text-gray-400 text-xs uppercase font-semibold mb-1">
                                        {attendee.company}
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
                                    {itemsArray.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {itemsArray.map((item, idx) => (
                                                <span
                                                    key={idx}
                                                    className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded"
                                                >
                                                    🎁 {item}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Attribute information */}
                                    <div className="flex gap-3 mt-2">
                                        {attendee.tshirtSize && (
                                            <div className="flex items-center gap-1 text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">
                                                <span>👕</span>
                                                <span>{attendee.tshirtSize}</span>
                                            </div>
                                        )}

                                        {attendee.attendsReception && (
                                            <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                                                attendee.attendsReception === 'はい' || attendee.attendsReception === 'Yes'
                                                    ? 'text-green-400 bg-green-400/10'
                                                    : 'text-gray-400 bg-gray-400/10'
                                            }`}>
                                                <span>🍽️</span>
                                                <span>
                                                    {attendee.attendsReception === 'はい' || attendee.attendsReception === 'Yes'
                                                        ? '懇親会参加'
                                                        : '懇親会不参加'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    {attendee.status === 'Checked In' ? (
                                        <div className="flex flex-col items-end text-green-500">
                                            <UserCheck size={24} />
                                            <span className="text-xs mt-1">Done</span>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleCheckIn(attendee.id, attendee.name)}
                                            disabled={checkingIn === attendee.id}
                                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:opacity-50 text-sm"
                                        >
                                            {checkingIn === attendee.id ? '...' : 'Check In'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
