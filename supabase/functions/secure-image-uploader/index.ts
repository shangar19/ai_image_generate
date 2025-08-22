import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the user's authorization
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get the user from the session
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    // Get the image URL from the request body
    const { imageUrl } = await req.json();
    if (!imageUrl) {
      throw new Error('Missing imageUrl in request body');
    }

    // Fetch the image from the public URL (server-to-server, no CORS)
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image from source. Status: ${imageResponse.status}`);
    }
    const imageBlob = await imageResponse.blob();

    // Generate a unique file path for the image
    const fileName = `${crypto.randomUUID()}.png`;
    const filePath = `${user.id}/${fileName}`;

    // Upload the image to the private Supabase Storage bucket
    const { error: uploadError } = await supabaseClient.storage
      .from('generated_images')
      .upload(filePath, imageBlob, {
        contentType: imageResponse.headers.get('content-type') ?? 'image/png',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Return the secure path of the uploaded image
    return new Response(JSON.stringify({ path: filePath }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
