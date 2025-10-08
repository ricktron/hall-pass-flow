import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting auto-close-passes function');

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculate the cutoff time (45 minutes ago)
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - 45);
    const cutoffTimeISO = cutoffTime.toISOString();

    console.log(`Looking for passes with timeout before: ${cutoffTimeISO}`);

    // Query for passes that need to be auto-closed
    const { data: passesToClose, error: queryError } = await supabase
      .from('bathroom_passes')
      .select('id, timeout')
      .is('timein', null)
      .lt('timeout', cutoffTimeISO);

    if (queryError) {
      console.error('Error querying passes:', queryError);
      throw queryError;
    }

    console.log(`Found ${passesToClose?.length || 0} passes to auto-close`);

    if (!passesToClose || passesToClose.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No passes to auto-close',
          closedCount: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Update each pass
    let successCount = 0;
    let errorCount = 0;

    for (const pass of passesToClose) {
      // Calculate timein as timeout + 45 minutes
      const timeoutDate = new Date(pass.timeout);
      const timeinDate = new Date(timeoutDate.getTime() + 45 * 60 * 1000);

      const { error: updateError } = await supabase
        .from('bathroom_passes')
        .update({
          timein: timeinDate.toISOString(),
          duration_min: 45,
          was_auto_closed: true,
        })
        .eq('id', pass.id);

      if (updateError) {
        console.error(`Error updating pass ${pass.id}:`, updateError);
        errorCount++;
      } else {
        console.log(`Successfully auto-closed pass ${pass.id}`);
        successCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Auto-closed ${successCount} passes`,
        closedCount: successCount,
        errorCount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in auto-close-passes function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
