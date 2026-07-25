import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Total users:', users.length);
  const demoUser = await prisma.user.findUnique({ where: { email: 'owner@savory.demo' } });
  console.log('Demo user exists?', !!demoUser);
  const rest = await prisma.restaurant.findMany();
  console.log('Total restaurants:', rest.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
