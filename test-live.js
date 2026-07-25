// removed require

async function testLogin() {
  try {
    const res = await fetch('https://restaurent-server-qpp3.onrender.com/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@savory.demo', password: 'demo1234' })
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}
testLogin();
