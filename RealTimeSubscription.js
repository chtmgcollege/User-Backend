// Subscribe to own bookings changes
const channel = supabase
  .channel('bookings-changes')
  .on('postgres_changes', {
    event: '*', // or 'UPDATE' for status changes
    schema: 'public',
    table: 'bookings',
    filter: `user_id=eq.${user.id}`
  }, (payload) => {
    console.log('Booking updated:', payload);
    // Update UI: e.g. change status badge from pending → approved
  })
  .subscribe();

// For admin: listen to all pending bookings
if (isAdmin) {
  supabase
    .channel('admin-bookings')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, payload => {
      // Notify admin: new pending booking!
    })
    .subscribe();
}