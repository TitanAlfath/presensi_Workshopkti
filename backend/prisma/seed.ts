import { PrismaClient, Role, AttendanceType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Default Super Admin
  const email = 'admin.utama@diesnat.ac.id';
  const existingAdmin = await prisma.user.findUnique({ where: { email } });
  
  let adminUser;
  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Admin#Fastikom!2026', salt);
    
    adminUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: 'Super Admin Diesnat',
        role: Role.SUPER_ADMIN
      }
    });
    console.log('Created Super Admin: admin.utama@diesnat.ac.id / Admin#Fastikom!2026');
  } else {
    adminUser = existingAdmin;
    console.log('Admin already exists.');
  }

  // 2. Create Event
  const eventDate = new Date('2026-06-11T13:00:00');
  
  const event = await prisma.event.create({
    data: {
      name: 'Workshop Karya Tulis Ilmiah',
      location: "Aula Al'ala Unsiq Kampus 1",
      date: eventDate,
      description: 'Problematika dan Solusi Cerdas KTI Mahasiswa',
      logo: null,
      banner: '/uploads/poster.jpg'
    }
  });
  console.log(`Created Event: ${event.name}`);

  // Set active event setting
  await prisma.settings.upsert({
    where: { key: 'activeEventId' },
    update: { value: event.id },
    create: { key: 'activeEventId', value: event.id }
  });

  // 3. Create Dummy Participants (Students)
  const prodis = ['Teknik Informatika', 'Sistem Informasi', 'Teknologi Informasi', 'Pendidikan Teknologi Informasi'];
  const fakultas = 'FASTIKOM';
  
  const dummyParticipants = [
    { name: 'Ahmad Fauzi', nim: '20220801001', prodi: 'Teknik Informatika', phone: '081234567890' },
    { name: 'Budi Santoso', nim: '20220801002', prodi: 'Teknik Informatika', phone: '081234567891' },
    { name: 'Citra Kirana', nim: '20220801003', prodi: 'Sistem Informasi', phone: '081234567892' },
    { name: 'Dewi Lestari', nim: '20220801004', prodi: 'Sistem Informasi', phone: '081234567893' },
    { name: 'Eko Prasetyo', nim: '20220801005', prodi: 'Teknologi Informasi', phone: '081234567894' },
    { name: 'Fitriani Hidayah', nim: '20220801006', prodi: 'Teknologi Informasi', phone: '081234567895' },
    { name: 'Gilang Ramadhan', nim: '20220801007', prodi: 'Pendidikan Teknologi Informasi', phone: '081234567896' },
    { name: 'Hendra Wijaya', nim: '20220801008', prodi: 'Teknik Informatika', phone: '081234567897' },
    { name: 'Indah Permata', nim: '20220801009', prodi: 'Sistem Informasi', phone: '081234567898' },
    { name: 'Joko Widodo', nim: '20220801010', prodi: 'Teknologi Informasi', phone: '081234567899' },
    { name: 'Kurniawan Dwi', nim: '20220801011', prodi: 'Teknik Informatika', phone: '081234567800' },
    { name: 'Larasati Putri', nim: '20220801012', prodi: 'Sistem Informasi', phone: '081234567801' },
    { name: 'Muhammad Ali', nim: '20220801013', prodi: 'Teknologi Informasi', phone: '081234567802' },
    { name: 'Nabila Syakieb', nim: '20220801014', prodi: 'Teknik Informatika', phone: '081234567803' },
    { name: 'Oki Setiana', nim: '20220801015', prodi: 'Sistem Informasi', phone: '081234567804' }
  ];

  const dbParticipants = [];
  for (const dp of dummyParticipants) {
    const p = await prisma.participant.create({
      data: {
        name: dp.name,
        nim: dp.nim,
        prodi: dp.prodi,
        fakultas,
        phone: dp.phone
      }
    });
    dbParticipants.push(p);
  }
  console.log(`Created ${dbParticipants.length} Participants.`);

  // 4. Create Dummy Guests
  const dummyGuests = [
    { name: 'Dr. Ir. Hermawan, M.T.', institution: 'Rektorat Universitas', position: 'Wakil Rektor I', phone: '081122334455' },
    { name: 'Prof. Suparman, Ph.D.', institution: 'Institut Teknologi Bandung', position: 'Dosen Tamu/Keynote', phone: '081122334466' },
    { name: 'Rian Adriansyah', institution: 'BEM Universitas', position: 'Ketua BEM', phone: '081122334477' },
    { name: 'Siti Aminah, M.Kom.', institution: 'Dinas Kominfo Provinsi', position: 'Kepala Bidang Aplikasi', phone: '081122334488' },
    { name: 'Toni Sucipto', institution: 'PT. Tech Solusindo', position: 'Senior Engineer', phone: '081122334499' }
  ];

  const dbGuests = [];
  for (const dg of dummyGuests) {
    const g = await prisma.guest.create({
      data: {
        name: dg.name,
        institution: dg.institution,
        position: dg.position,
        phone: dg.phone
      }
    });
    dbGuests.push(g);
  }
  console.log(`Created ${dbGuests.length} Guests.`);

  // 5. Create Attendance Logs (Check-in over different times today and yesterday)
  console.log('Generating attendance check-ins...');
  
  const today = new Date();
  
  // Yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(9, 30, 0, 0);

  // Yesterday checkins
  for (let i = 0; i < 5; i++) {
    const checkTime = new Date(yesterday);
    checkTime.setMinutes(checkTime.getMinutes() + i * 20); // spread checks in 20 min interval
    
    await prisma.attendance.create({
      data: {
        eventId: event.id,
        type: AttendanceType.PESERTA,
        participantId: dbParticipants[i].id,
        checkInTime: checkTime,
        createdAt: checkTime
      }
    });
  }

  // Today checkins
  today.setHours(8, 15, 0, 0);
  
  // Remaining participants checkin today
  for (let i = 5; i < dbParticipants.length; i++) {
    const checkTime = new Date(today);
    checkTime.setMinutes(checkTime.getMinutes() + (i - 5) * 15);
    
    await prisma.attendance.create({
      data: {
        eventId: event.id,
        type: AttendanceType.PESERTA,
        participantId: dbParticipants[i].id,
        checkInTime: checkTime,
        createdAt: checkTime
      }
    });
  }

  // Guests checkin today
  for (let i = 0; i < dbGuests.length; i++) {
    const checkTime = new Date(today);
    checkTime.setHours(9, 0, 0, 0);
    checkTime.setMinutes(checkTime.getMinutes() + i * 12);
    
    await prisma.attendance.create({
      data: {
        eventId: event.id,
        type: AttendanceType.TAMU,
        guestId: dbGuests[i].id,
        checkInTime: checkTime,
        createdAt: checkTime
      }
    });
  }

  console.log('Seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
