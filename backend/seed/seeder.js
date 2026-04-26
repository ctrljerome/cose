const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Election = require('../models/Election');
const Candidate = require('../models/Candidate');
const logger = require('../utils/logger');

// ─── SEED DATA ────────────────────────────────────────────────────
// Admin password — change this before going to production
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD || 'Admin@CHCCI2025!';

// Students: password = their own student ID (e.g. "10012023")
const students = [
  // 2021 Enrollees — Year 4
  { studentId: '10042021', fullName: 'Gabriel Flores',      email: 'gabriel.flores@chcci.edu.ph',      department: 'Nursing',                yearLevel: 4, enrollmentYear: 2021 },
  { studentId: '10052021', fullName: 'Patricia Bautista',   email: 'patricia.bautista@chcci.edu.ph',   department: 'Education',               yearLevel: 4, enrollmentYear: 2021 },
  { studentId: '10082021', fullName: 'Patrick Castillo',    email: 'patrick.castillo@chcci.edu.ph',    department: 'Psychology',              yearLevel: 4, enrollmentYear: 2021 },
  { studentId: '10142021', fullName: 'Gabriel Lopez',       email: 'gabriel.lopez@chcci.edu.ph',       department: 'Nursing',                yearLevel: 4, enrollmentYear: 2021 },
  { studentId: '10172021', fullName: 'Elena Ramos',         email: 'elena.ramos@chcci.edu.ph',         department: 'Law',                    yearLevel: 4, enrollmentYear: 2021 },
  { studentId: '10202021', fullName: 'Carlo Flores',        email: 'carlo.flores@chcci.edu.ph',        department: 'Accountancy',            yearLevel: 4, enrollmentYear: 2021 },
  { studentId: '10382021', fullName: 'Maricel Go',          email: 'maricel.go@chcci.edu.ph',          department: 'Psychology',              yearLevel: 4, enrollmentYear: 2021 },
  { studentId: '10412021', fullName: 'Ben Castillo',        email: 'ben.castillo@chcci.edu.ph',        department: 'Computer Science',        yearLevel: 4, enrollmentYear: 2021 },
  { studentId: '10432021', fullName: 'Vincent Villanueva',  email: 'vincent.villanueva@chcci.edu.ph',  department: 'Engineering',             yearLevel: 4, enrollmentYear: 2021 },
  { studentId: '10442021', fullName: 'Stephanie Bautista',  email: 'stephanie.bautista@chcci.edu.ph',  department: 'Nursing',                yearLevel: 4, enrollmentYear: 2021 },
  { studentId: '10482021', fullName: 'Ben Chua',            email: 'ben.chua@chcci.edu.ph',            department: 'Psychology',              yearLevel: 4, enrollmentYear: 2021 },
  { studentId: '10492021', fullName: 'Maricel Cruz',        email: 'maricel.cruz@chcci.edu.ph',        department: 'Mass Communication',      yearLevel: 4, enrollmentYear: 2021 },
  // 2022 Enrollees — Year 3
  { studentId: '10022022', fullName: 'Roberto Cruz',        email: 'roberto.cruz@chcci.edu.ph',        department: 'Business Administration', yearLevel: 3, enrollmentYear: 2022 },
  { studentId: '10032022', fullName: 'Diane Fernandez',     email: 'diane.fernandez@chcci.edu.ph',     department: 'Engineering',             yearLevel: 3, enrollmentYear: 2022 },
  { studentId: '10102022', fullName: 'Liza Martinez',       email: 'liza.martinez@chcci.edu.ph',       department: 'Accountancy',            yearLevel: 3, enrollmentYear: 2022 },
  { studentId: '10122022', fullName: 'Mark Go',             email: 'mark.go@chcci.edu.ph',             department: 'Business Administration', yearLevel: 3, enrollmentYear: 2022 },
  { studentId: '10132022', fullName: 'Isabella Uy',         email: 'isabella.uy@chcci.edu.ph',         department: 'Engineering',             yearLevel: 3, enrollmentYear: 2022 },
  { studentId: '10182022', fullName: 'Isabella Morales',    email: 'isabella.morales@chcci.edu.ph',    department: 'Psychology',              yearLevel: 3, enrollmentYear: 2022 },
  { studentId: '10222022', fullName: 'Vincent Ortiz',       email: 'vincent.ortiz@chcci.edu.ph',       department: 'Business Administration', yearLevel: 3, enrollmentYear: 2022 },
  { studentId: '10282022', fullName: 'Camille Lim',         email: 'camille.lim@chcci.edu.ph',         department: 'Psychology',              yearLevel: 3, enrollmentYear: 2022 },
  { studentId: '10292022', fullName: 'Rachel Diaz',         email: 'rachel.diaz@chcci.edu.ph',         department: 'Mass Communication',      yearLevel: 3, enrollmentYear: 2022 },
  { studentId: '10352022', fullName: 'Christian Gonzalez',  email: 'christian.gonzalez@chcci.edu.ph',  department: 'Education',               yearLevel: 3, enrollmentYear: 2022 },
  { studentId: '10452022', fullName: 'Angela Gonzalez',     email: 'angela.gonzalez@chcci.edu.ph',     department: 'Education',               yearLevel: 3, enrollmentYear: 2022 },
  { studentId: '10462022', fullName: 'Abigail Go',          email: 'abigail.go@chcci.edu.ph',          department: 'Architecture',            yearLevel: 3, enrollmentYear: 2022 },
  { studentId: '10472022', fullName: 'Patricia Castillo',   email: 'patricia.castillo@chcci.edu.ph',   department: 'Law',                    yearLevel: 3, enrollmentYear: 2022 },
  // 2023 Enrollees — Year 2
  { studentId: '10012023', fullName: 'Vincent Garcia',      email: 'vincent.garcia@chcci.edu.ph',      department: 'Computer Science',        yearLevel: 2, enrollmentYear: 2023 },
  { studentId: '10072023', fullName: 'Carlo Reyes',         email: 'carlo.reyes@chcci.edu.ph',         department: 'Law',                    yearLevel: 2, enrollmentYear: 2023 },
  { studentId: '10092023', fullName: 'Rachel Fernandez',    email: 'rachel.fernandez@chcci.edu.ph',    department: 'Mass Communication',      yearLevel: 2, enrollmentYear: 2023 },
  { studentId: '10112023', fullName: 'Luis Martinez',       email: 'luis.martinez@chcci.edu.ph',       department: 'Computer Science',        yearLevel: 2, enrollmentYear: 2023 },
  { studentId: '10192023', fullName: 'Camille Rivera',      email: 'camille.rivera@chcci.edu.ph',      department: 'Mass Communication',      yearLevel: 2, enrollmentYear: 2023 },
  { studentId: '10232023', fullName: 'Sofia Torres',        email: 'sofia.torres@chcci.edu.ph',        department: 'Engineering',             yearLevel: 2, enrollmentYear: 2023 },
  { studentId: '10262023', fullName: 'Gabriel Morales',     email: 'gabriel.morales@chcci.edu.ph',     department: 'Architecture',            yearLevel: 2, enrollmentYear: 2023 },
  { studentId: '10272023', fullName: 'Diane Castillo',      email: 'diane.castillo@chcci.edu.ph',      department: 'Law',                    yearLevel: 2, enrollmentYear: 2023 },
  { studentId: '10322023', fullName: 'Antonio Go',          email: 'antonio.go@chcci.edu.ph',          department: 'Business Administration', yearLevel: 2, enrollmentYear: 2023 },
  { studentId: '10332023', fullName: 'Isabella Cruz',       email: 'isabella.cruz@chcci.edu.ph',       department: 'Engineering',             yearLevel: 2, enrollmentYear: 2023 },
  { studentId: '10392023', fullName: 'Natalia Uy',          email: 'natalia.uy@chcci.edu.ph',          department: 'Mass Communication',      yearLevel: 2, enrollmentYear: 2023 },
  { studentId: '10402023', fullName: 'Grace Villanueva',    email: 'grace.villanueva@chcci.edu.ph',    department: 'Accountancy',            yearLevel: 2, enrollmentYear: 2023 },
  { studentId: '10422023', fullName: 'Stephanie Co',        email: 'stephanie.co@chcci.edu.ph',        department: 'Business Administration', yearLevel: 2, enrollmentYear: 2023 },
  // 2024 Enrollees — Year 1
  { studentId: '10062024', fullName: 'Ramon Morales',       email: 'ramon.morales@chcci.edu.ph',       department: 'Architecture',            yearLevel: 1, enrollmentYear: 2024 },
  { studentId: '10152024', fullName: 'Patricia Torres',     email: 'patricia.torres@chcci.edu.ph',     department: 'Education',               yearLevel: 1, enrollmentYear: 2024 },
  { studentId: '10162024', fullName: 'Patricia Tan',        email: 'patricia.tan@chcci.edu.ph',        department: 'Architecture',            yearLevel: 1, enrollmentYear: 2024 },
  { studentId: '10212024', fullName: 'Gabriel Torres',      email: 'gabriel.torres@chcci.edu.ph',      department: 'Computer Science',        yearLevel: 1, enrollmentYear: 2024 },
  { studentId: '10242024', fullName: 'Jasmine Go',          email: 'jasmine.go@chcci.edu.ph',          department: 'Nursing',                yearLevel: 1, enrollmentYear: 2024 },
  { studentId: '10252024', fullName: 'Isabella Hernandez',  email: 'isabella.hernandez@chcci.edu.ph',  department: 'Education',               yearLevel: 1, enrollmentYear: 2024 },
  { studentId: '10302024', fullName: 'Ana Castillo',        email: 'ana.castillo@chcci.edu.ph',        department: 'Accountancy',            yearLevel: 1, enrollmentYear: 2024 },
  { studentId: '10312024', fullName: 'Pedro Perez',         email: 'pedro.perez@chcci.edu.ph',         department: 'Computer Science',        yearLevel: 1, enrollmentYear: 2024 },
  { studentId: '10342024', fullName: 'Elena Hernandez',     email: 'elena.hernandez@chcci.edu.ph',     department: 'Nursing',                yearLevel: 1, enrollmentYear: 2024 },
  { studentId: '10362024', fullName: 'Felicia Lim',         email: 'felicia.lim@chcci.edu.ph',         department: 'Architecture',            yearLevel: 1, enrollmentYear: 2024 },
  { studentId: '10372024', fullName: 'Elena Rivera',        email: 'elena.rivera@chcci.edu.ph',        department: 'Law',                    yearLevel: 1, enrollmentYear: 2024 },
  { studentId: '10502024', fullName: 'Kevin Reyes',         email: 'kevin.reyes@chcci.edu.ph',         department: 'Accountancy',            yearLevel: 1, enrollmentYear: 2024 },
];

const admins = [
  { email: 'admin@chcci.edu.ph',      fullName: 'Election Administrator', role: 'admin',      studentId: 'ADMIN-001', department: 'OSA' },
  { email: 'superadmin@chcci.edu.ph', fullName: 'Super Administrator',    role: 'superadmin', studentId: 'ADMIN-000', department: 'OSA' },
];

// ─── MAIN SEEDER ──────────────────────────────────────────────────
const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    await User.deleteMany({});
    await Election.deleteMany({});
    await Candidate.deleteMany({});
    console.log('🧹 Cleared existing data');

    // ── Admins ────────────────────────────────────────────────────
    for (const admin of admins) {
      await User.create({
        ...admin,
        password: ADMIN_PASSWORD,
        mustChangePassword: false,
        isEmailVerified: true,
      });
    }
    console.log(`✅ Seeded ${admins.length} admin accounts`);

    // ── Students (password = their own studentId) ─────────────────
    for (const student of students) {
      await User.create({
        ...student,
        role: 'student',
        password: student.studentId,   // e.g. "10012023"
        mustChangePassword: true,
        isEmailVerified: true,
      });
    }
    console.log(`✅ Seeded ${students.length} student accounts`);

    // ── Election ──────────────────────────────────────────────────
    const adminUser = await User.findOne({ role: 'admin' });
    const now = new Date();

    const election = await Election.create({
      title: 'Student Government Association Elections 2025',
      description: 'Annual election for SSG officers of CHCCI. Your voice matters — cast your vote.',
      academicYear: '2024-2025',
      semester: '2nd',
      status: 'scheduled',
      startDate: new Date(now.getTime() + 1 * 60 * 60 * 1000),       // 1 hour from now
      endDate:   new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),  // 7 days from now
      createdBy: adminUser._id,
      positions: [
        { title: 'President',      description: 'Chief executive officer of the SSG',             maxVotesPerVoter: 1, order: 1 },
        { title: 'Vice President', description: 'Assists the president and oversees committees',   maxVotesPerVoter: 1, order: 2 },
        { title: 'Secretary',      description: 'Maintains records and communications',            maxVotesPerVoter: 1, order: 3 },
        { title: 'Treasurer',      description: 'Manages SSG funds and budgeting',                 maxVotesPerVoter: 1, order: 4 },
        { title: 'Auditor',        description: 'Ensures financial accountability',                maxVotesPerVoter: 1, order: 5 },
      ],
    });
    console.log(`✅ Seeded election: "${election.title}"`);

    // ── Candidates ────────────────────────────────────────────────
    const positions = election.positions;
    const candidatesData = [
      { positionId: positions[0]._id, positionTitle: 'President',      fullName: 'Alexandra Reyes',    studentId: 'CAND-P001', department: 'Political Science',    yearLevel: 4, platform: 'Transparent governance, student welfare, and campus sustainability.' },
      { positionId: positions[0]._id, positionTitle: 'President',      fullName: 'Miguel Santos',      studentId: 'CAND-P002', department: 'Business Administration', yearLevel: 4, platform: 'Economic empowerment, alumni partnerships, and modernizing student services.' },
      { positionId: positions[1]._id, positionTitle: 'Vice President', fullName: 'Isabella Cruz',      studentId: 'CAND-V001', department: 'Psychology',           yearLevel: 3, platform: 'Mental health advocacy and inclusive campus culture.' },
      { positionId: positions[1]._id, positionTitle: 'Vice President', fullName: 'Rafael Torres',      studentId: 'CAND-V002', department: 'Engineering',          yearLevel: 3, platform: 'Technology integration and academic excellence programs.' },
      { positionId: positions[2]._id, positionTitle: 'Secretary',      fullName: 'Sofia Lim',          studentId: 'CAND-S001', department: 'Mass Communication',   yearLevel: 2, platform: 'Open communication, digital transparency, and student feedback systems.' },
      { positionId: positions[2]._id, positionTitle: 'Secretary',      fullName: 'Carlos Bautista',    studentId: 'CAND-S002', department: 'Computer Science',     yearLevel: 2, platform: 'Digitizing student government processes and improving information access.' },
      { positionId: positions[3]._id, positionTitle: 'Treasurer',      fullName: 'Daniela Flores',     studentId: 'CAND-T001', department: 'Accountancy',          yearLevel: 4, platform: 'Responsible fund management and transparent student budgeting.' },
      { positionId: positions[3]._id, positionTitle: 'Treasurer',      fullName: 'Patrick Villanueva', studentId: 'CAND-T002', department: 'Finance',              yearLevel: 3, platform: 'Maximizing student development funds and sponsorship drives.' },
      { positionId: positions[4]._id, positionTitle: 'Auditor',        fullName: 'Camille Aquino',     studentId: 'CAND-A001', department: 'Accountancy',          yearLevel: 3, platform: 'Zero-tolerance audit culture and financial integrity.' },
      { positionId: positions[4]._id, positionTitle: 'Auditor',        fullName: 'Jerome Mendez',      studentId: 'CAND-A002', department: 'Business Administration', yearLevel: 2, platform: 'Proactive reporting and student fund protection.' },
    ];

    for (const c of candidatesData) {
      await Candidate.create({ ...c, election: election._id });
    }
    console.log(`✅ Seeded ${candidatesData.length} candidates`);

    // ── Summary ───────────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 CHCCI E-VOTING SYSTEM — SEED COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('CHCCI-COSE ADMIN ACCOUNTS:');
    admins.forEach(a => console.log(`  ${a.role.padEnd(12)} ${a.email.padEnd(35)} password: ${ADMIN_PASSWORD}`));
    console.log('\nSTUDENT ACCOUNTS (password = student ID):');
    students.forEach(s => console.log(`  ${s.studentId.padEnd(12)} ${s.email.padEnd(40)} password: ${s.studentId}`));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔒 DB connection closed');
  }
};

seedDatabase();
