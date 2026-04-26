/**
 * E-Voting System — Backend Tests
 * Run: npm test (from /backend directory)
 * Requires: TEST_MONGODB_URI in .env (use a separate test DB)
 */

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const Vote = require('../models/Vote');
const Election = require('../models/Election');

// ─── TEST CONFIG ──────────────────────────────────────────
const TEST_DB = process.env.TEST_MONGODB_URI || process.env.MONGODB_URI;

beforeAll(async () => {
  await mongoose.connect(TEST_DB);
});

afterAll(async () => {
  // Clean test data
  await User.deleteMany({ email: /test\.evoting/i });
  await mongoose.connection.close();
});

// ─── AUTH TESTS ───────────────────────────────────────────
describe('Authentication', () => {
  const testEmail = 'test.evoting.student@chcci.edu.ph';
  const testPassword = 'TestPass1@';

  beforeEach(async () => {
    await User.deleteMany({ email: testEmail });
    await User.create({
      email: testEmail,
      password: testPassword,
      fullName: 'Test Student',
      role: 'student',
      mustChangePassword: false,
      isEmailVerified: true,
      studentId: 'TEST-001',
      department: 'Computer Science',
      yearLevel: 3,
    });
  });

  test('POST /auth/login — valid credentials sends OTP', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: testPassword });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.requiresOTP).toBe(true);
    expect(res.body.userId).toBeDefined();
  });

  test('POST /auth/login — invalid password returns 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testEmail, password: 'WrongPassword1!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('POST /auth/login — non-existent email returns 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@chcci.edu.ph', password: 'AnyPassword1!' });

    expect(res.status).toBe(401);
  });

  test('POST /auth/login — invalid email format returns 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: 'Password1!' });

    expect(res.status).toBe(400);
  });

  test('GET /auth/me — unauthenticated returns 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});

// ─── VOTE SECURITY TESTS ──────────────────────────────────
describe('Vote Security', () => {
  test('POST /votes/submit — unauthenticated returns 401', async () => {
    const res = await request(app)
      .post('/api/v1/votes/submit')
      .send({ electionId: new mongoose.Types.ObjectId(), votingToken: 'fake', ballot: [] });

    expect(res.status).toBe(401);
  });

  test('Vote.generateVoterHash — same inputs produce same hash', () => {
    const userId = 'user123';
    const electionId = 'election456';
    const salt = 'testsalt';

    const h1 = Vote.generateVoterHash(userId, electionId, salt);
    const h2 = Vote.generateVoterHash(userId, electionId, salt);

    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64); // SHA-256 hex
  });

  test('Vote.generateVoterHash — different inputs produce different hashes', () => {
    const h1 = Vote.generateVoterHash('user1', 'election1', 'salt');
    const h2 = Vote.generateVoterHash('user2', 'election1', 'salt');

    expect(h1).not.toBe(h2);
  });

  test('Vote.encryptCandidateId — produces encrypted output', () => {
    process.env.VOTE_ENCRYPTION_KEY = 'a'.repeat(64); // test key
    const candidateId = new mongoose.Types.ObjectId().toString();
    const encrypted = Vote.encryptCandidateId(candidateId);

    expect(encrypted).toContain(':');
    expect(encrypted).not.toBe(candidateId);
  });

  test('Vote.encryptCandidateId — encrypt then decrypt roundtrip', () => {
    process.env.VOTE_ENCRYPTION_KEY = 'a'.repeat(64);
    const original = new mongoose.Types.ObjectId().toString();
    const encrypted = Vote.encryptCandidateId(original);
    const decrypted = Vote.decryptCandidateId(encrypted);

    expect(decrypted).toBe(original);
  });

  test('Vote — cannot be updated after creation (immutability)', async () => {
    const voterHash = `test-${Date.now()}`;

    await Vote.create({
      election: new mongoose.Types.ObjectId(),
      voterHash,
      ballot: [],
      tokenHash: 'abc123',
      ballotHash: 'def456',
    });

    // Attempt to update should throw
    await expect(
      Vote.updateOne({ voterHash }, { $set: { isValid: false } })
    ).rejects.toThrow();
  });
});

// ─── USER MODEL TESTS ─────────────────────────────────────
describe('User Model', () => {
  test('Password is hashed before saving', async () => {
    const plain = 'MyPassword1!';
    const user = await User.create({
      email: 'hash.test.evoting@chcci.edu.ph',
      password: plain,
      fullName: 'Hash Test',
      role: 'student',
      studentId: 'HASH-001',
    });

    const saved = await User.findById(user._id).select('+password');
    expect(saved.password).not.toBe(plain);
    expect(saved.password.startsWith('$2')).toBe(true); // bcrypt
  });

  test('matchPassword — correct password returns true', async () => {
    const plain = 'MatchTest1!';
    const user = await User.create({
      email: 'match.test.evoting@chcci.edu.ph',
      password: plain,
      fullName: 'Match Test',
      studentId: 'MATCH-001',
    });

    const saved = await User.findById(user._id).select('+password');
    const result = await saved.matchPassword(plain);
    expect(result).toBe(true);
  });

  test('matchPassword — wrong password returns false', async () => {
    const user = await User.create({
      email: 'wrong.test.evoting@chcci.edu.ph',
      password: 'CorrectPass1!',
      fullName: 'Wrong Test',
      studentId: 'WRONG-001',
    });

    const saved = await User.findById(user._id).select('+password');
    const result = await saved.matchPassword('WrongPassword1!');
    expect(result).toBe(false);
  });

  test('generateOTP — produces 6-digit numeric code', async () => {
    const user = await User.findOne({ email: /test\.evoting/ });
    if (!user) return;

    const otp = user.generateOTP();
    expect(/^\d{6}$/.test(otp)).toBe(true);
  });

  test('verifyOTP — correct OTP returns true', async () => {
    const user = await User.create({
      email: 'otp.test.evoting@chcci.edu.ph',
      password: 'OtpTest1!',
      fullName: 'OTP Test',
      studentId: 'OTP-001',
    });

    const otp = user.generateOTP();
    await user.save({ validateBeforeSave: false });

    const freshUser = await User.findById(user._id).select('+otpCode +otpExpires');
    expect(freshUser.verifyOTP(otp)).toBe(true);
  });

  test('verifyOTP — wrong OTP returns false', async () => {
    const user = await User.create({
      email: 'otp2.test.evoting@chcci.edu.ph',
      password: 'OtpTest2!',
      fullName: 'OTP Test 2',
      studentId: 'OTP-002',
    });

    user.generateOTP();
    await user.save({ validateBeforeSave: false });

    const freshUser = await User.findById(user._id).select('+otpCode +otpExpires');
    expect(freshUser.verifyOTP('000000')).toBe(false);
  });
});

// ─── API SECURITY TESTS ───────────────────────────────────
describe('API Security Headers', () => {
  test('Health check responds correctly', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('Admin routes blocked for unauthenticated users', async () => {
    const res = await request(app).get('/api/v1/admin/stats');
    expect(res.status).toBe(401);
  });

  test('Audit routes blocked for unauthenticated users', async () => {
    const res = await request(app).get('/api/v1/audit/logs');
    expect(res.status).toBe(401);
  });

  test('Unknown routes return 404 or handler', async () => {
    const res = await request(app).get('/api/v1/nonexistent-route');
    expect([404, 500]).toContain(res.status);
  });
});

// ─── ELECTION MODEL TESTS ─────────────────────────────────
describe('Election Model', () => {
  test('endDate must be after startDate', async () => {
    const adminUser = await User.create({
      email: 'election.test.evoting@chcci.edu.ph',
      password: 'ElecTest1!',
      fullName: 'Election Test Admin',
      role: 'admin',
      studentId: 'ELEC-001',
    });

    const now = new Date();
    await expect(
      Election.create({
        title: 'Invalid Election',
        academicYear: '2024-2025',
        semester: '2nd',
        startDate: new Date(now.getTime() + 2 * 3600 * 1000),
        endDate: new Date(now.getTime() + 1 * 3600 * 1000), // end before start
        createdBy: adminUser._id,
        positions: [{ title: 'President', order: 1 }],
      })
    ).rejects.toThrow();
  });
});
