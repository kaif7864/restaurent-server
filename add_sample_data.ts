import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get the demo user's restaurant
  const user = await prisma.user.findFirst({
    where: { email: { contains: 'demo' } }
  });
  
  if (!user || !user.restaurantId) {
    console.log("No demo user or restaurant found.");
    return;
  }
  const restaurantId = user.restaurantId;

  // Create some categories
  const categoriesData = [
    { name: 'Gourmet Pizzas', description: 'Wood-fired oven pizzas', sortOrder: 1 },
    { name: 'Signature Burgers', description: 'Juicy, hand-crafted burgers', sortOrder: 2 },
    { name: 'Beverages', description: 'Refreshing drinks and shakes', sortOrder: 3 },
  ];

  const createdCategories = [];
  for (const cat of categoriesData) {
    const created = await prisma.menuCategory.create({
      data: {
        ...cat,
        restaurantId: restaurantId,
      }
    });
    createdCategories.push(created);
  }

  const [pizzaCat, burgerCat, bevCat] = createdCategories;

  // Add items with Modifiers & Dietary Tags & Availability
  const itemsData = [
    {
      categoryId: pizzaCat.id,
      name: 'Margherita Supremo',
      description: 'Classic delight with 100% real mozzarella cheese',
      price: 299,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&q=80&w=500',
      metadata: {
        type: 'veg',
        modifiers: [
          {
            name: 'Size',
            options: [
              { name: 'Regular (7")', price: 0 },
              { name: 'Medium (10")', price: 150 },
              { name: 'Large (13")', price: 300 }
            ]
          },
          {
            name: 'Add-ons',
            options: [
              { name: 'Extra Cheese', price: 50 },
              { name: 'Jalapenos', price: 30 },
              { name: 'Paneer Tikka', price: 70 }
            ]
          }
        ]
      }
    },
    {
      categoryId: pizzaCat.id,
      name: 'Chicken Pepperoni',
      description: 'A classic American taste with spicy chicken pepperoni',
      price: 399,
      isAvailable: false, // Testing Out of stock
      imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&q=80&w=500',
      metadata: {
        type: 'non-veg',
        modifiers: [
          {
            name: 'Size',
            options: [
              { name: 'Regular (7")', price: 0 },
              { name: 'Medium (10")', price: 200 }
            ]
          }
        ]
      }
    },
    {
      categoryId: burgerCat.id,
      name: 'Double Decker Veg Burger',
      description: 'Two crispy veg patties with lettuce, onion, and cheese',
      price: 199,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&q=80&w=500',
      metadata: {
        type: 'veg',
        modifiers: [
          {
            name: 'Combo Options',
            options: [
              { name: 'Burger Only', price: 0 },
              { name: 'Add Fries & Coke', price: 120 }
            ]
          }
        ]
      }
    },
    {
      categoryId: burgerCat.id,
      name: 'Spicy Chicken Zinger',
      description: 'Crispy fried chicken thigh with spicy mayo',
      price: 249,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=500',
      metadata: {
        type: 'non-veg',
        modifiers: [
          {
            name: 'Spicy Level',
            options: [
              { name: 'Normal', price: 0 },
              { name: 'Extra Spicy', price: 20 },
              { name: 'Ghost Pepper', price: 50 }
            ]
          }
        ]
      }
    },
    {
      categoryId: bevCat.id,
      name: 'Oreo Thick Shake',
      description: 'Rich chocolate and oreo blended to perfection',
      price: 149,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75bf699?auto=format&fit=crop&q=80&w=500',
      metadata: {
        type: 'egg', // just using another tag to test
        modifiers: [
          {
            name: 'Size',
            options: [
              { name: 'Regular', price: 0 },
              { name: 'Large', price: 50 }
            ]
          }
        ]
      }
    },
    {
      categoryId: bevCat.id,
      name: 'Fresh Lime Soda',
      description: 'Sweet, Salt, or Mixed',
      price: 89,
      isAvailable: true,
      imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=500',
      metadata: {
        type: 'vegan',
        modifiers: [
          {
            name: 'Flavour',
            options: [
              { name: 'Sweet', price: 0 },
              { name: 'Salted', price: 0 },
              { name: 'Mixed', price: 0 }
            ]
          }
        ]
      }
    }
  ];

  for (const item of itemsData) {
    await prisma.menuItem.create({
      data: {
        ...item,
        restaurantId: restaurantId,
      }
    });
  }

  console.log('Successfully seeded items with modifiers and out-of-stock variations!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
