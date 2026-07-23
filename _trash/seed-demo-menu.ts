/**
 * Seeds menu categories and items for the DEMO restaurant.
 * Run: npx ts-node _trash/seed-demo-menu.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_RESTAURANT_EMAIL = 'demo@savory.app';

const MENU_DATA = [
  {
    category: { name: 'Starters', description: 'Delicious appetizers', sortOrder: 1 },
    items: [
      { name: 'Hara Bhara Kebab', description: 'Spinach and green peas patties', price: 220, imageUrl: 'https://images.unsplash.com/photo-1541529086526-db283c563270?w=500&auto=format&fit=crop', metadata: { type: 'veg' } },
      { name: 'Spring Rolls', description: 'Crispy rolls stuffed with vegetables', price: 180, imageUrl: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&auto=format&fit=crop', metadata: { type: 'vegan' } },
      { name: 'Chili Chicken', description: 'Spicy and tangy Chinese style chicken', price: 290, imageUrl: 'https://images.unsplash.com/photo-1599487405702-3e33fc2a7c46?w=500&auto=format&fit=crop', metadata: { type: 'non-veg' } },
      { name: 'Paneer Tikka', description: 'Marinated cottage cheese grilled to perfection', price: 260, imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&auto=format&fit=crop', metadata: { type: 'veg' } },
    ],
  },
  {
    category: { name: 'Main Course', description: 'Hearty dishes', sortOrder: 2 },
    items: [
      { name: 'Kadai Paneer', description: 'Paneer cooked in a spicy wok', price: 300, imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&auto=format&fit=crop', metadata: { type: 'veg' } },
      { name: 'Mutton Rogan Josh', description: 'Kashmiri style slow-cooked lamb', price: 550, imageUrl: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&auto=format&fit=crop', metadata: { type: 'non-veg' } },
      { name: 'Vegetable Biryani', description: 'Aromatic basmati rice cooked with veggies', price: 250, imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop', metadata: { type: 'veg' } },
      { name: 'Butter Chicken', description: 'Creamy tomato-based chicken curry', price: 380, imageUrl: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop', metadata: { type: 'non-veg' } },
      { name: 'Dal Makhani', description: 'Black lentils slow cooked overnight', price: 220, imageUrl: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=500&auto=format&fit=crop', metadata: { type: 'veg' } },
    ],
  },
  {
    category: { name: 'Beverages', description: 'Refreshing drinks', sortOrder: 3 },
    items: [
      { name: 'Fresh Lime Soda', description: 'Sweet and salty lime drink', price: 90, imageUrl: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=500&auto=format&fit=crop', metadata: { type: 'vegan' } },
      { name: 'Cold Coffee', description: 'Blended iced coffee with ice cream', price: 160, imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop', metadata: { type: 'veg' } },
      { name: 'Masala Chai', description: 'Traditional Indian spiced tea', price: 50, imageUrl: 'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=500&auto=format&fit=crop', metadata: { type: 'veg' } },
      { name: 'Mango Lassi', description: 'Chilled yogurt drink with fresh mango', price: 130, imageUrl: 'https://images.unsplash.com/photo-1527960669566-f882ba85a4c6?w=500&auto=format&fit=crop', metadata: { type: 'veg' } },
    ],
  },
  {
    category: { name: 'Desserts', description: 'Sweet treats', sortOrder: 4 },
    items: [
      { name: 'Gulab Jamun', description: 'Soft milk-solid dumplings in sugar syrup', price: 120, imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop', metadata: { type: 'veg' } },
      { name: 'Chocolate Brownie', description: 'Served sizzling with vanilla ice cream', price: 220, imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop', metadata: { type: 'veg' } },
      { name: 'Rasmalai', description: 'Soft cheese patties in sweet milk', price: 140, imageUrl: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=500&auto=format&fit=crop', metadata: { type: 'veg' } },
      { name: 'Vanilla Ice Cream', description: 'Two scoops of classic vanilla', price: 90, imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c8a9e9cb?w=500&auto=format&fit=crop', metadata: { type: 'veg' } },
    ],
  },
];

async function main() {
  console.log('🌱 Seeding demo restaurant menu...\n');

  const restaurant = await prisma.restaurant.findFirst({
    where: { email: DEMO_RESTAURANT_EMAIL },
  });

  if (!restaurant) {
    console.error('❌ Demo restaurant not found! Run seed-demo-users.ts first.');
    return;
  }

  console.log(`✅ Restaurant found: ${restaurant.name} (${restaurant.id})\n`);

  for (const section of MENU_DATA) {
    // Create or reuse category
    let cat = await prisma.menuCategory.findFirst({
      where: { name: section.category.name, restaurantId: restaurant.id },
    });

    if (!cat) {
      cat = await prisma.menuCategory.create({
        data: { ...section.category, restaurantId: restaurant.id },
      });
      console.log(`📁 Created category: ${cat.name}`);
    } else {
      console.log(`♻️  Reusing category: ${cat.name}`);
    }

    // Create items (skip if already exist)
    for (const item of section.items) {
      const existing = await prisma.menuItem.findFirst({
        where: { name: item.name, restaurantId: restaurant.id },
      });

      if (!existing) {
        await prisma.menuItem.create({
          data: {
            ...item,
            restaurantId: restaurant.id,
            categoryId: cat.id,
            isAvailable: true,
          },
        });
        console.log(`  ✅ Added item: ${item.name} (₹${item.price})`);
      } else {
        console.log(`  ♻️  Skipped (exists): ${item.name}`);
      }
    }
  }

  console.log('\n🎉 Menu seeded successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
