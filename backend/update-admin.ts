import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const oldEmail = 'admin@diesnat.com';
  const newEmail = 'admin.utama@diesnat.ac.id';
  const newPassword = 'Admin#Fastikom!2026';

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  const existingAdmin = await prisma.user.findUnique({ where: { email: oldEmail } });
  
  if (existingAdmin) {
    await prisma.user.update({
      where: { email: oldEmail },
      data: { 
        email: newEmail,
        password: hashedPassword 
      }
    });
    console.log(`Berhasil mengubah kredensial admin menjadi:`);
    console.log(`Email: ${newEmail}`);
    console.log(`Password: ${newPassword}`);
  } else {
    const newAdmin = await prisma.user.findUnique({ where: { email: newEmail } });
    if(newAdmin) {
       await prisma.user.update({
         where: { email: newEmail },
         data: { password: hashedPassword }
       });
       console.log(`Berhasil mengupdate password admin ${newEmail}`);
    } else {
       console.log('Admin tidak ditemukan!');
    }
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
