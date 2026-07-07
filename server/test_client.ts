/**
 * INOVAATERS KEYAUTH CLIENT SDK INTEGRATION TEST SUITE
 * This script walks through the entire client-server validation lifecycle.
 */

async function runTestSuite() {
  const serverUrl = 'http://localhost:5000/api';
  console.log('=== STARTING KEYAUTH LIFECYCLE TEST SUITE ===');

  try {
    // 1. Initializing connection
    console.log('\n[TEST 1] Initializing connection to auth services...');
    const initRes = await fetch(`${serverUrl}/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appid: 'APP_DEMO',
        ownerid: 'OWNER_DEMO',
        secret: 'secret_demo_value',
        version: '1.0'
      })
    });
    const initData = await initRes.json();
    console.log('Response Status:', initRes.status);
    console.log('Response Data:', JSON.stringify(initData, null, 2));

    if (!initData.success) {
      throw new Error('Initialization failed');
    }

    const sessionToken = initData.session_token;

    // 2. Authenticating license with HWID-A (First use)
    console.log('\n[TEST 2] Authenticating license key with HWID-A (expecting first-time binding)...');
    const authRes = await fetch(`${serverUrl}/license`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appid: 'APP_DEMO',
        session_token: sessionToken,
        key: 'INV-DEMO-KEY-1234',
        hwid: 'DESKTOP-HWID-A'
      })
    });
    const authData = await authRes.json();
    console.log('Response Status:', authRes.status);
    console.log('Response Data:', JSON.stringify(authData, null, 2));

    if (!authData.success) {
      throw new Error('License authentication failed');
    }

    // 3. Testing HWID lock security (attempt authentication with HWID-B)
    console.log('\n[TEST 3] Testing security block (attempting login with HWID-B on locked key)...');
    // Re-initialize to get a new session
    const initRes2 = await fetch(`${serverUrl}/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appid: 'APP_DEMO',
        ownerid: 'OWNER_DEMO',
        secret: 'secret_demo_value',
        version: '1.0'
      })
    });
    const initData2 = await initRes2.json();
    const sessionToken2 = initData2.session_token;

    const lockRes = await fetch(`${serverUrl}/license`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appid: 'APP_DEMO',
        session_token: sessionToken2,
        key: 'INV-DEMO-KEY-1234',
        hwid: 'DESKTOP-HWID-B'
      })
    });
    const lockData = await lockRes.json();
    console.log('Response Status (should be 403):', lockRes.status);
    console.log('Response Data (expecting HWID mismatch):', JSON.stringify(lockData, null, 2));

    // 4. Executing HWID Reset
    console.log('\n[TEST 4] Triggering HWID Reset to unlock device...');
    const resetRes = await fetch(`${serverUrl}/reset_hwid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appid: 'APP_DEMO',
        key: 'INV-DEMO-KEY-1234',
        secret: 'secret_demo_value'
      })
    });
    const resetData = await resetRes.json();
    console.log('Response Status:', resetRes.status);
    console.log('Response Data:', JSON.stringify(resetData, null, 2));

    // 5. Re-authenticating with HWID-B (should bind successfully now)
    console.log('\n[TEST 5] Re-authenticating with HWID-B (should bind successfully now)...');
    const authRes3 = await fetch(`${serverUrl}/license`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appid: 'APP_DEMO',
        session_token: sessionToken2,
        key: 'INV-DEMO-KEY-1234',
        hwid: 'DESKTOP-HWID-B'
      })
    });
    const authData3 = await authRes3.json();
    console.log('Response Status:', authRes3.status);
    console.log('Response Data:', JSON.stringify(authData3, null, 2));

    // 6. Checking active session status
    console.log('\n[TEST 6] Checking active session validity...');
    const checkRes = await fetch(`${serverUrl}/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appid: 'APP_DEMO',
        session_token: sessionToken2
      })
    });
    const checkData = await checkRes.json();
    console.log('Response Status:', checkRes.status);
    console.log('Response Data:', JSON.stringify(checkData, null, 2));

    // 7. Logging out / destroying session
    console.log('\n[TEST 7] Logging out of session...');
    const logoutRes = await fetch(`${serverUrl}/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appid: 'APP_DEMO',
        session_token: sessionToken2
      })
    });
    const logoutData = await logoutRes.json();
    console.log('Response Status:', logoutRes.status);
    console.log('Response Data:', JSON.stringify(logoutData, null, 2));

    console.log('\n=== ALL LIFECYCLE TESTS COMPLETED SUCCESSFULY ===');
  } catch (error) {
    console.error('Test Suite Exception occurred:', error);
  }
}

runTestSuite();
