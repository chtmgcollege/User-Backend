// app/my-bookings/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation'; // for redirect if not logged in

export default function MyBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // 1. Get current user + protect route (redirect if not logged in)
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        setError('Please log in to view your bookings.');
        router.push('/login');
        return;
      }

      setUser(user);
      setLoading(false);
    };

    checkUser();

    // Listen for auth changes (logout, session refresh, etc.)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  // 2. Fetch initial bookings + setup Realtime (only when user exists)
  useEffect(() => {
    if (!user) return;

    let channel: any;

    const setupRealtime = async () => {
      // Initial fetch
      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError('Failed to load bookings. Please try again.');
        console.error(fetchError);
        return;
      }

      setBookings(data || []);

      // Realtime subscription – only for this user's bookings
      channel = supabase
        .channel(`user-bookings:${user.id}`) // unique channel name per user
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT, UPDATE, DELETE for full coverage
            schema: 'public',
            table: 'bookings',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Realtime booking change:', payload);

            if (payload.eventType === 'INSERT') {
              setBookings((prev) => [payload.new, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setBookings((prev) =>
                prev.map((b) =>
                  b.id === payload.new.id ? { ...b, ...payload.new } : b
                )
              );
            } else if (payload.eventType === 'DELETE') {
              setBookings((prev) =>
                prev.filter((b) => b.id !== payload.old.id)
              );
            }
          }
        )
        .on('error', (err) => {
          console.error('Realtime error:', err);
          setError('Live updates failed. Changes may not appear in real time.');
        })
        .subscribe((status) => {
          console.log('Realtime channel status:', status);
        });
    };

    setupRealtime();

    // Cleanup: remove channel when component unmounts or user changes
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-lg">Loading your bookings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">
        <h2 className="text-xl font-bold mb-2">Error</h2>
        <p>{error}</p>
        <button
          onClick={() => router.refresh()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">My Bookings</h1>

      {bookings.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 text-lg">You don't have any bookings yet.</p>
          <button
            onClick={() => router.push('/booking')}
            className="mt-4 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Book a Room Now
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="border rounded-lg p-5 bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-lg">
                    Room {booking.room_id}
                  </p>
                  <p className="text-sm text-gray-600">
                    Check-in: {new Date(booking.start_at).toLocaleDateString('en-PH', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-gray-600">
                    Check-out: {new Date(booking.end_at).toLocaleDateString('en-PH', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    booking.status === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : booking.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {booking.status.toUpperCase()}
                </span>
              </div>

              {booking.message && (
                <p className="mt-3 text-sm text-gray-700 italic">
                  Note: {booking.message}
                </p>
              )}

              <p className="mt-2 text-sm text-gray-500">
                Booked on: {new Date(booking.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}