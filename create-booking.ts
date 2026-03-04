// supabase/functions/create-booking/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  const { room_id, start_at, end_at, guests, amenities = [] } = await req.json();
  const user = await getUserFromHeader(req.headers); // your auth logic

  // Check overlap
  const { data: conflicts } = await supabase
    .from('bookings')
    .select('id')
    .eq('room_id', room_id)
    .overlaps('tsrange', `[${start_at},${end_at}]`);

  if (conflicts?.length > 0) {
    return new Response(JSON.stringify({ error: 'Room not available' }), { status: 409 });
  }

  // Insert booking
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      user_id: user.id,
      room_id,
      start_at,
      end_at,
      guests,
      status: 'pending'
    })
    .select()
    .single();

  if (error) return new Response(JSON.stringify(error), { status: 500 });

  // Add amenities if selected
  if (amenities.length > 0) {
    await supabase.from('booking_amenities').insert(
      amenities.map((a: number) => ({ booking_id: data.id, amenity_id: a }))
    );
  }

  return new Response(JSON.stringify(data), { status: 201 });
});