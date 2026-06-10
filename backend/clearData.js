const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Menghapus data Presensi...');
  await prisma.attendance.deleteMany();
  
  console.log('Menghapus data Peserta (Mahasiswa)...');
  await prisma.participant.deleteMany();
  
  console.log('Menghapus data Tamu...');
  await prisma.guest.deleteMany();
  
  console.log('✅ Semua data presensi, peserta, dan tamu berhasil dikosongkan!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
