import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Finding restaurant...');
  const restaurant = await prisma.restaurant.findFirst();
  
  if (!restaurant) {
    console.log('No restaurant found in DB. Please create an account first.');
    return;
  }
  
  const restaurantId = restaurant.id;
  console.log(`Seeding expanded menu for restaurant: ${restaurant.name}`);

  // Fetch or create categories
  let starters = await prisma.menuCategory.findFirst({ where: { name: 'Starters', restaurantId } });
  if (!starters) starters = await prisma.menuCategory.create({ data: { name: 'Starters', description: 'Delicious appetizers', sortOrder: 1, restaurantId } });

  let mainCourse = await prisma.menuCategory.findFirst({ where: { name: 'Main Course', restaurantId } });
  if (!mainCourse) mainCourse = await prisma.menuCategory.create({ data: { name: 'Main Course', description: 'Hearty dishes', sortOrder: 2, restaurantId } });

  let beverages = await prisma.menuCategory.findFirst({ where: { name: 'Beverages', restaurantId } });
  if (!beverages) beverages = await prisma.menuCategory.create({ data: { name: 'Beverages', description: 'Refreshing drinks', sortOrder: 3, restaurantId } });

  let desserts = await prisma.menuCategory.findFirst({ where: { name: 'Desserts', restaurantId } });
  if (!desserts) desserts = await prisma.menuCategory.create({ data: { name: 'Desserts', description: 'Sweet treats', sortOrder: 4, restaurantId } });

  console.log('Adding more Starters...');
  await prisma.menuItem.createMany({
    data: [
      { restaurantId, categoryId: starters.id, name: 'Hara Bhara Kebab', description: 'Spinach and green peas patties', price: 220, imageUrl: 'https://images.unsplash.com/photo-1541529086526-db283c563270?w=500&auto=format&fit=crop', metadata: { type: 'veg' }, isAvailable: true },
      { restaurantId, categoryId: starters.id, name: 'Spring Rolls', description: 'Crispy rolls stuffed with vegetables', price: 180, imageUrl: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&auto=format&fit=crop', metadata: { type: 'vegan' }, isAvailable: true },
      { restaurantId, categoryId: starters.id, name: 'Chili Chicken', description: 'Spicy and tangy Chinese style chicken', price: 290, imageUrl: 'https://images.unsplash.com/photo-1599487405702-3e33fc2a7c46?w=500&auto=format&fit=crop', metadata: { type: 'non-veg' }, isAvailable: true },
    ]
  });

  console.log('Adding more Main Course...');
  await prisma.menuItem.createMany({
    data: [
      { restaurantId, categoryId: mainCourse.id, name: 'Kadai Paneer', description: 'Paneer cooked in a spicy wok', price: 300, imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&auto=format&fit=crop', metadata: { type: 'veg' }, isAvailable: true },
      { restaurantId, categoryId: mainCourse.id, name: 'Mutton Rogan Josh', description: 'Kashmiri style slow-cooked lamb', price: 550, imageUrl: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&auto=format&fit=crop', metadata: { type: 'non-veg' }, isAvailable: true },
      { restaurantId, categoryId: mainCourse.id, name: 'Vegetable Biryani', description: 'Aromatic basmati rice cooked with veggies', price: 250, imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop', metadata: { type: 'veg' }, isAvailable: true },
    ]
  });

  console.log('Adding more Beverages...');
  await prisma.menuItem.createMany({
    data: [
      { restaurantId, categoryId: beverages.id, name: 'Fresh Lime Soda', description: 'Sweet and salty lime drink', price: 90, imageUrl: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=500&auto=format&fit=crop', metadata: { type: 'vegan' }, isAvailable: true },
      { restaurantId, categoryId: beverages.id, name: 'Cold Coffee', description: 'Blended iced coffee with ice cream', price: 160, imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop', metadata: { type: 'veg' }, isAvailable: true },
      { restaurantId, categoryId: beverages.id, name: 'Masala Chai', description: 'Traditional Indian spiced tea', price: 50, imageUrl: 'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=500&auto=format&fit=crop', metadata: { type: 'veg' }, isAvailable: true },
      { restaurantId, categoryId: beverages.id, name: 'Oreo Shake', description: 'Thick shake blended with Oreo cookies', price: 180, imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75bf699?w=500&auto=format&fit=crop', metadata: { type: 'veg' }, isAvailable: true },
    ]
  });

  console.log('Adding more Desserts...');
  await prisma.menuItem.createMany({
    data: [
      { restaurantId, categoryId: desserts.id, name: 'Rasmalai', description: 'Soft cheese patties in sweet milk', price: 140, imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop', metadata: { type: 'veg' }, isAvailable: true },
      { restaurantId, categoryId: desserts.id, name: 'Chocolate Brownie', description: 'Served sizzling with vanilla ice cream', price: 220, imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop', metadata: { type: 'veg' }, isAvailable: true },
      { restaurantId, categoryId: desserts.id, name: 'Tiramisu', description: 'Classic Italian coffee-flavored dessert', price: 280, imageUrl: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=500&auto=format&fit=crop', metadata: { type: 'egg' }, isAvailable: true },
      { restaurantId, categoryId: desserts.id, name: 'Gajar Ka Halwa', description: 'Warm carrot pudding with dry fruits', price: 160, imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop', metadata: { type: 'veg' }, isAvailable: true },
      { restaurantId, categoryId: desserts.id, name: 'Vanilla Ice Cream', description: 'Two scoops of classic vanilla', price: 90, imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c8a9e9cb?w=500&auto=format&fit=crop', metadata: { type: 'veg' }, isAvailable: true },
    ]
  });

  console.log('✅ More items added successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
