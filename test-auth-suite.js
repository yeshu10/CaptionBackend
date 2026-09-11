const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('./src/server');
const User = require('./src/models/User');

let server;
let baseUrl;
let mongod;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      url,
      {
        method,
        headers
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      }
    );

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== RUNNING AUTHENTICATION TEST SUITE ===');

  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  console.log('✓ Connected to MongoMemoryServer');

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`✓ Test server running on ephemeral port ${port}`);

  let passed = 0;
  let total = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`  ✓ PASSED: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: ${testName}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // 1. Missing fields in register
  const res1 = await request('POST', '/api/auth/register', { email: 'bad@test.com' });
  assert(res1.status === 400 && res1.body.success === false, 'POST /api/auth/register rejects missing fields (400)');

  // 2. Invalid email format
  const res2 = await request('POST', '/api/auth/register', { name: 'Alex', email: 'invalid-email', password: 'password123' });
  assert(res2.status === 400 && res2.body.message.includes('valid email'), 'POST /api/auth/register rejects invalid email (400)');

  // 3. Short password (<6 chars)
  const res3 = await request('POST', '/api/auth/register', { name: 'Alex', email: 'alex@example.com', password: '123' });
  assert(res3.status === 400 && res3.body.message.includes('at least 6 characters'), 'POST /api/auth/register rejects password < 6 chars (400)');

  // 4. Successful registration
  const res4 = await request('POST', '/api/auth/register', {
    name: 'Alex Creator',
    email: 'alex@example.com',
    password: 'securePassword123!'
  });
  assert(res4.status === 201 && res4.body.success === true, 'POST /api/auth/register creates user (201)');
  assert(typeof res4.body.data.token === 'string' && res4.body.data.token.length > 20, 'Returns valid JWT token');
  assert(res4.body.data.user.name === 'Alex Creator', 'Returns user name');
  assert(res4.body.data.user.email === 'alex@example.com', 'Returns user email');
  assert(res4.body.data.user.createdAt && res4.body.data.user.updatedAt, 'Returns createdAt and updatedAt');
  assert(!res4.body.data.user.password, 'Does NOT return password in register response');

  // 5. Database check: Password is encrypted with bcrypt and not plain-text
  const dbUser = await User.findOne({ email: 'alex@example.com' }).select('+password');
  assert(dbUser.password !== 'securePassword123!', 'Plain-text password is never saved in database');
  assert(dbUser.password.startsWith('$2'), 'Password is saved as bcrypt hash');

  // 6. Duplicate email registration rejected
  const res6 = await request('POST', '/api/auth/register', {
    name: 'Alex Impostor',
    email: 'alex@example.com',
    password: 'securePassword123!'
  });
  assert(res6.status === 400 && res6.body.message.includes('already exists'), 'Duplicate email registration is rejected with 400');

  // 7. Login with missing fields
  const res7 = await request('POST', '/api/auth/login', {});
  assert(res7.status === 400, 'POST /api/auth/login rejects empty body (400)');

  // 8. Login with wrong email
  const res8 = await request('POST', '/api/auth/login', { email: 'wrong@example.com', password: 'securePassword123!' });
  assert(res8.status === 401 && res8.body.message.includes('Invalid credentials'), 'POST /api/auth/login rejects non-existent email (401)');

  // 9. Login with wrong password
  const res9 = await request('POST', '/api/auth/login', { email: 'alex@example.com', password: 'wrongpassword' });
  assert(res9.status === 401 && res9.body.message.includes('Invalid credentials'), 'POST /api/auth/login rejects incorrect password (401)');

  // 10. Login with correct credentials
  const res10 = await request('POST', '/api/auth/login', { email: 'alex@example.com', password: 'securePassword123!' });
  assert(res10.status === 200 && res10.body.success === true, 'POST /api/auth/login succeeds with correct credentials (200)');
  assert(!res10.body.data.user.password, 'Does NOT return password in login response');
  const userToken = res10.body.data.token;

  // 11. GET /api/auth/me without token
  const res11 = await request('GET', '/api/auth/me');
  assert(res11.status === 401, 'GET /api/auth/me rejects unauthenticated request (401)');

  // 12. GET /api/auth/me with invalid token
  const res12 = await request('GET', '/api/auth/me', null, 'invalid.jwt.token');
  assert(res12.status === 401, 'GET /api/auth/me rejects invalid token (401)');

  // 13. GET /api/auth/me with valid token
  const res13 = await request('GET', '/api/auth/me', null, userToken);
  assert(res13.status === 200 && res13.body.data.user.email === 'alex@example.com', 'GET /api/auth/me returns user profile (200)');
  assert(!res13.body.data.user.password, 'Does NOT return password in getMe response');

  // 14. Protected routes check (e.g. GET /api/captions)
  const res14 = await request('GET', '/api/captions');
  assert(res14.status === 401, 'Unauthenticated access to protected endpoint is rejected (401)');

  const res15 = await request('GET', '/api/captions', null, userToken);
  assert(res15.status === 200, 'Authenticated access to protected endpoint succeeds (200)');

  // 15. PUT /api/auth/profile without token
  const res16 = await request('PUT', '/api/auth/profile', { name: 'New Name' });
  assert(res16.status === 401, 'PUT /api/auth/profile rejects unauthenticated request (401)');

  // 16. PUT /api/auth/profile with empty name
  const res17 = await request('PUT', '/api/auth/profile', { name: '   ' }, userToken);
  assert(res17.status === 400 && res17.body.message.includes('Name cannot be empty'), 'PUT /api/auth/profile rejects empty name (400)');

  // 17. PUT /api/auth/profile attempting email modification
  const res18 = await request('PUT', '/api/auth/profile', { email: 'hacked@example.com' }, userToken);
  assert(res18.status === 400 && res18.body.message.includes('Email address cannot be changed'), 'PUT /api/auth/profile prevents direct email changes (400)');

  // 18. PUT /api/auth/profile with valid updates
  const res19 = await request('PUT', '/api/auth/profile', {
    name: 'Alex Updated',
    profileImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb'
  }, userToken);
  assert(res19.status === 200 && res19.body.success === true, 'PUT /api/auth/profile succeeds with valid updates (200)');
  assert(res19.body.data.user.name === 'Alex Updated', 'Returns updated user name');
  assert(res19.body.data.user.profileImage === 'https://images.unsplash.com/photo-1534528741775-53994a69daeb', 'Returns updated profile image');
  assert(res19.body.data.user.email === 'alex@example.com', 'Preserves original email');
  assert(!res19.body.data.user.password, 'Does NOT return password in profile response');

  console.log(`\n=== ALL ${passed}/${total} BACKEND AUTH TESTS PASSED ===\n`);
}

runTests()
  .catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    if (server) server.close();
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });
