/**
 * DEMO USER SEED SCRIPT
 * Creates demo users for all roles under the "Savory Demo" restaurant.
 * 
 * Run: npx ts-node _trash/seed-demo-users.ts
 * OR:  Add to package.json scripts: "seed:demo": "npx ts-node _trash/seed-demo-users.ts"
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'demo1234';
const DEMO_RESTAURANT_EMAIL = 'demo@savory.app';

const DEMO_USERS = [
  { name: 'Demo Owner',   email: 'owner@savory.demo',   role: 'owner' },
  { name: 'Demo Manager', email: 'manager@savory.demo', role: 'manager' },
  { name: 'Demo Waiter',  email: 'waiter@savory.demo',  role: 'waiter' },
  { name: 'Demo Kitchen', email: 'kitchen@savory.demo', role: 'kitchen' },
  { name: 'Demo Host',    email: 'host@savory.demo',    role: 'host' },
];

async function main() {
  console.log('🌱 Seeding demo users...\n');

  // Create or reuse the demo restaurant
  let restaurant = await prisma.restaurant.findFirst({
    where: { email: DEMO_RESTAURANT_EMAIL },
  });

  if (!restaurant) {
    restaurant = await prisma.restaurant.create({
      data: {
        name: 'Savory Demo Restaurant',
        email: DEMO_RESTAURANT_EMAIL,
        phone: '+91-9999999999',
        address: '1 Demo Street, Mumbai',
      },
    });
    console.log(`✅ Created restaurant: ${restaurant.name} (${restaurant.id})`);
  } else {
    console.log(`♻️  Reusing restaurant: ${restaurant.name} (${restaurant.id})`);
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const u of DEMO_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });

    if (existing) {
      // Update password in case it changed
      await prisma.user.update({
        where: { email: u.email },
        data: { passwordHash, restaurantId: restaurant.id },
      });
      console.log(`♻️  Updated user: ${u.email}  (role: ${u.role})`);
    } else {
      await prisma.user.create({
        data: {
          restaurantId: restaurant.id,
          name: u.name,
          email: u.email,
          passwordHash,
          role: u.role,
        },
      });
      console.log(`✅ Created user: ${u.email}  (role: ${u.role})`);
    }
  }

  console.log('\n🎉 Done! Demo credentials:');
  console.log('   Password for all: demo1234');
  DEMO_USERS.forEach(u => console.log(`   ${u.role.padEnd(10)} → ${u.email}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
