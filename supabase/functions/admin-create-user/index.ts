import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  role: 'coach' | 'player';
  branch: 'tunis' | 'sousse';
  phoneNumber?: string;
  fideId?: string;
  level?: 'beginner' | 'intermediate' | 'advanced';
  createdBy?: string;
  parentName?: string;
  address?: string;
  memo?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header to verify the caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Client to verify the caller's identity
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client with service role to create users
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the caller is authenticated and get their profile
    const { data: { user: caller }, error: callerError } = await supabaseAuth.auth.getUser();
    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if the caller is an admin or coach
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', caller.id)
      .single();

    if (profileError || !callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Could not verify caller permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: CreateUserRequest = await req.json();
    const { 
      email, 
      password, 
      fullName, 
      role, 
      branch, 
      phoneNumber, 
      fideId, 
      level, 
      createdBy,
      parentName,
      address,
      memo
    } = body;

    // Validate required fields
    if (!email || !password || !fullName || !role || !branch) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, fullName, role, branch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Authorization checks
    if (callerProfile.role === 'coach') {
      // Coaches can only create players
      if (role !== 'player') {
        return new Response(
          JSON.stringify({ error: 'Coaches can only create player accounts' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (callerProfile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admins and coaches can create accounts' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the auth user using the admin API (doesn't affect current session)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the profile entry with all fields including new ones
    const profileData: Record<string, any> = {
      user_id: authData.user.id,
      email,
      full_name: fullName,
      role,
      branch,
      phone_number: phoneNumber || null,
      fide_id: fideId || null,
      level: level || null,
      created_by: createdBy || caller.id,
    };

    // Add player-specific fields
    if (role === 'player') {
      profileData.parent_name = parentName || null;
      profileData.address = address || null;
      profileData.memo = memo || null;
    }

    const { error: insertError } = await supabaseAdmin.from('profiles').insert(profileData);

    if (insertError) {
      console.error('Error creating profile:', insertError);
      // Try to clean up the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: `Failed to create profile: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully`,
        userId: authData.user.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});