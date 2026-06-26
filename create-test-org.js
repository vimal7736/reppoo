const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase URL or Service Role Key in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createTestOrg() {
  const email = 'test@greentrack.ai';
  const password = 'TestPassword123!';
  const orgName = 'Test Eco Solutions';
  const slug = 'test-eco-solutions';

  console.log(`\n🚀 Setting up test user: ${email} with organisation: ${orgName}`);

  // 1. Check if user already exists
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("❌ Error listing users:", listError.message);
    return;
  }

  let user = usersData.users.find(u => u.email === email);

  if (!user) {
    console.log("➕ User not found. Creating test user...");
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Test Administrator' }
    });

    if (createError) {
      console.error("❌ Error creating user:", createError.message);
      return;
    }
    user = createData.user;
    console.log(`✅ User created with ID: ${user.id}`);
    // Wait for Supabase trigger to insert profile row
    await new Promise(resolve => setTimeout(resolve, 2000));
  } else {
    console.log(`ℹ️ User already exists with ID: ${user.id}`);
    // Reset password
    const { error: updatePassError } = await supabase.auth.admin.updateUserById(user.id, { password });
    if (updatePassError) {
      console.warn("⚠️ Could not update password:", updatePassError.message);
    } else {
      console.log("✅ Password updated successfully.");
    }
  }

  // 2. Create or find the organisation
  console.log(`🔍 Checking if organisation '${orgName}' exists...`);
  const { data: existingOrgs, error: orgFetchError } = await supabase
    .from('organisations')
    .select('id')
    .eq('name', orgName)
    .limit(1);

  if (orgFetchError) {
    console.error("❌ Error fetching organisation:", orgFetchError.message);
    return;
  }

  let orgId = existingOrgs?.[0]?.id;

  if (!orgId) {
    console.log(`➕ Organisation not found. Creating '${orgName}'...`);
    const { data: newOrg, error: orgInsertError } = await supabase
      .from('organisations')
      .insert({
        name: orgName,
        slug,
        tier: 'free', // Free tier for testing subscription upgrades!
        seats_limit: 3
      })
      .select()
      .single();

    if (orgInsertError) {
      console.error("❌ Error creating organisation:", orgInsertError.message);
      return;
    }
    orgId = newOrg.id;
    console.log(`✅ Organisation created with ID: ${orgId}`);
  } else {
    console.log(`ℹ️ Organisation already exists with ID: ${orgId}`);
  }

  // 3. Link user profile to the organisation and ensure role is admin
  console.log("👤 Syncing profile and setting 'admin' role linked to the test organisation...");
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    console.error("❌ Error checking profile:", profileError.message);
  }

  if (!profile) {
    console.log("➕ Profile row not found. Creating one...");
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email,
        role: 'admin',
        full_name: 'Test Administrator',
        org_id: orgId
      });

    if (insertError) {
      console.error("❌ Error inserting profile:", insertError.message);
    } else {
      console.log("✅ Profile created.");
    }
  } else {
    console.log("🆙 Updating profile row with new role and organisation...");
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        role: 'admin',
        org_id: orgId
      })
      .eq('id', user.id);

    if (updateError) {
      console.error("❌ Error updating profile:", updateError.message);
    } else {
      console.log("✅ Profile updated successfully.");
    }
  }

  console.log("\n✨ === TEST ORGANISATION SETUP COMPLETE === ✨");
  console.log(`📧 Email:        ${email}`);
  console.log(`🔑 Password:     ${password}`);
  console.log(`🏢 Organisation: ${orgName}`);
  console.log(`⭐ Tier:         free`);
  console.log("============================================\n");
}

createTestOrg().catch(err => {
  console.error("💥 Fatal Error during test org setup:", err);
  process.exit(1);
});
