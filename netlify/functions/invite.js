// ============================================================
// What's Up Dog? — Supabase Staff Invite Proxy
// Netlify Serverless Function
//
// Uses the Supabase service role key to send email invites
// to new staff members. The service role key must never
// appear in the HTML or GitHub repo.
//
// Environment variables required:
//   SUPABASE_URL              — your Supabase project URL
//   SUPABASE_SERVICE_ROLE_KEY — the secret service role key
// ============================================================

const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const supabaseUrl     = process.env.SUPABASE_URL;
  const serviceRoleKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Supabase environment variables not configured.' }),
    };
  }

  try {
    const { email, name, role } = JSON.parse(event.body);

    if (!email) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Email is required.' }),
      };
    }

    // Use service role client — bypasses RLS, required for admin operations
    const sb = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Send the invite email — Supabase handles the email delivery
    const { data, error } = await sb.auth.admin.inviteUserByEmail(email, {
      data: { name: name || '', role: role || 'staff' },
      redirectTo: `${process.env.URL || 'https://whatsupdogdaycareupdates.netlify.app'}/login.html`,
    });

    if (error) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message }),
      };
    }

    // Create the profile row for this user
    // (Supabase invite creates the auth.users row — we create the matching profile)
    const { error: profileError } = await sb
      .from('profiles')
      .upsert({ id: data.user.id, role: role || 'staff', name: name || '' });

    if (profileError) {
      console.error('Profile creation failed:', profileError.message);
      // Don't fail the whole invite — profile can be created manually if needed
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: `Invite sent to ${email}` }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
