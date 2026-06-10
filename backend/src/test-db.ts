import prisma from './config/db';

async function test() {
  console.log('Connecting to database...');
  try {
    const userCount = await prisma.user.count();
    console.log(`Database connection successful. Total users in database: ${userCount}`);
    const users = await prisma.user.findMany({ select: { email: true, name: true, role: true } });
    console.log('Users in DB:', users);
  } catch (error: any) {
    console.error('Database connection failed!');
    console.error('Error Details:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
