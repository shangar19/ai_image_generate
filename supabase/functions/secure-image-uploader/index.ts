import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== EDGE FUNCTION START ===');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    console.log('Headers:', JSON.stringify(Object.fromEntries(req.headers.entries())));

    // Get Supabase environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Environment check:');
    console.log('- SUPABASE_URL:', supabaseUrl ? 'Present' : 'MISSING');
    console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Present' : 'MISSING');

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is not set');
    }
    if (!supabaseServiceKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
    }

    // Get request body
    const requestBody = await req.text();
    console.log('Request body:', requestBody);
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(requestBody);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Invalid JSON in request body');
    }

    // Handle test requests
    if (parsedBody.test) {
      console.log('Test request received');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Edge Function is working correctly',
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Create Supabase client with service role key
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user from the authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);

    if (!authHeader) {
      throw new Error('No Authorization header provided');
    }

    // Verify the user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    console.log('User verification:');
    console.log('- User ID:', user?.id || 'None');
    console.log('- User error:', userError?.message || 'None');
    
    if (userError || !user) {
      throw new Error(`Authentication failed: ${userError?.message || 'Invalid token'}`);
    }

    // Get and validate the image URL
    const { imageUrl } = parsedBody;
    console.log('Image URL provided:', imageUrl);
    
    if (!imageUrl) {
      throw new Error('imageUrl is required in request body');
    }

    // Validate URL format
    let validatedUrl;
    try {
      validatedUrl = new URL(imageUrl);
      console.log('URL validation passed:', validatedUrl.href);
    } catch (urlError) {
      console.error('Invalid URL:', urlError);
      throw new Error(`Invalid image URL format: ${urlError.message}`);
    }

    // Fetch the image from the public URL
    console.log('Fetching image from external URL...');
    const imageResponse = await fetch(validatedUrl.href, {
      headers: {
        'User-Agent': 'Supabase-Edge-Function/1.0',
        'Accept': 'image/*'
      }
    });
    
    console.log('Image fetch response:');
    console.log('- Status:', imageResponse.status);
    console.log('- Content-Type:', imageResponse.headers.get('content-type'));
    console.log('- Content-Length:', imageResponse.headers.get('content-length'));
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
    }

    const imageBlob = await imageResponse.blob();
    console.log('Image blob created:');
    console.log('- Size:', imageBlob.size, 'bytes');
    console.log('- Type:', imageBlob.type);

    if (imageBlob.size === 0) {
      throw new Error('Received empty image data');
    }

    // Generate unique file path
    const fileName = `${crypto.randomUUID()}.png`;
    const filePath = `${user.id}/${fileName}`;
    console.log('Generated file path:', filePath);

    // Upload to Supabase Storage
    console.log('Uploading to Supabase Storage...');
    const contentType = imageResponse.headers.get('content-type') || 'image/png';
    
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('generated_images')
      .upload(filePath, imageBlob, {
        contentType: contentType,
        cacheControl: '3600',
        upsert: false,
      });

    console.log('Upload result:');
    console.log('- Data:', uploadData);
    console.log('- Error:', uploadError);

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    console.log('=== EDGE FUNCTION SUCCESS ===');
    
    // Return success response
    return new Response(JSON.stringify({ 
      success: true,
      path: filePath,
      message: 'Image secured successfully',
      timestamp: new Date().toISOString(),
      size: imageBlob.size,
      contentType: contentType
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('=== EDGE FUNCTION ERROR ===');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString(),
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
