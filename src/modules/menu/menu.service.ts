import prisma from '../../config/prisma';

// --- Categories ---

export const getCategories = async (restaurantId: string) => {
  return await prisma.menuCategory.findMany({
    where: { restaurantId },
    orderBy: { sortOrder: 'asc' },
  });
};

export const createCategory = async (restaurantId: string, data: any) => {
  return await prisma.menuCategory.create({
    data: {
      name: data.name,
      description: data.description,
      sortOrder: data.sortOrder || data.displayOrder || 0,
      restaurantId,
    },
  });
};

export const updateCategory = async (restaurantId: string, categoryId: string, data: any) => {
  const existing = await prisma.menuCategory.findFirst({
    where: { id: categoryId, restaurantId }
  });
  if (!existing) throw new Error('Category not found');

  return await prisma.menuCategory.update({
    where: { id: categoryId },
    data: {
      name: data.name !== undefined ? data.name : existing.name,
      description: data.description !== undefined ? data.description : existing.description,
      sortOrder: data.sortOrder !== undefined ? data.sortOrder : existing.sortOrder,
    },
  });
};

export const deleteCategory = async (restaurantId: string, categoryId: string) => {
  const existing = await prisma.menuCategory.findFirst({
    where: { id: categoryId, restaurantId }
  });
  if (!existing) throw new Error('Category not found');

  // Delete all items in category first, or let cascade handle it if schema allows
  await prisma.menuItem.deleteMany({ where: { categoryId } });
  
  return await prisma.menuCategory.delete({
    where: { id: categoryId },
  });
};

// --- Items ---

export const getItems = async (restaurantId: string) => {
  return await prisma.menuItem.findMany({
    where: { restaurantId },
    include: {
      category: {
        select: { name: true }
      },
      modifierGroups: {
        include: { options: true }
      }
    },
    orderBy: { name: 'asc' }
  });
};

export const createItem = async (restaurantId: string, data: any) => {
  // Verify category belongs to this restaurant
  const category = await prisma.menuCategory.findFirst({
    where: { id: data.categoryId, restaurantId }
  });

  if (!category) {
    throw new Error('Category not found or does not belong to your restaurant');
  }

  return await prisma.menuItem.create({
    data: {
      name: data.name,
      description: data.description,
      price: data.price,
      costPrice: data.costPrice || 0,
      imageUrl: data.imageUrl,
      isAvailable: data.isAvailable,
      categoryId: data.categoryId,
      restaurantId,
      metadata: data.type ? { type: data.type } : {},
    },
  });
};

export const updateItem = async (restaurantId: string, itemId: string, data: any) => {
  // Ensure item belongs to the restaurant
  const existing = await prisma.menuItem.findFirst({
    where: { id: itemId, restaurantId }
  });

  if (!existing) {
    throw new Error('Menu item not found');
  }

  // Only pass expected fields
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.price !== undefined) updateData.price = data.price;
  if (data.costPrice !== undefined) updateData.costPrice = data.costPrice;
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
  if (data.isAvailable !== undefined) updateData.isAvailable = data.isAvailable;
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.type !== undefined) {
    const currentMetadata = existing.metadata ? (typeof existing.metadata === 'string' ? JSON.parse(existing.metadata) : existing.metadata) : {};
    updateData.metadata = { ...currentMetadata, type: data.type };
  }

  return await prisma.menuItem.update({
    where: { id: itemId },
    data: updateData,
  });
};

export const deleteItem = async (restaurantId: string, itemId: string) => {
  const existing = await prisma.menuItem.findFirst({
    where: { id: itemId, restaurantId }
  });
  if (!existing) throw new Error('Menu item not found');

  return await prisma.menuItem.delete({
    where: { id: itemId },
  });
};

// --- Modifiers ---

export const getModifiers = async (restaurantId: string, itemId: string) => {
  return await prisma.modifierGroup.findMany({
    where: { menuItemId: itemId, menuItem: { restaurantId } },
    include: { options: true }
  });
};

export const createModifierGroup = async (restaurantId: string, itemId: string, data: any) => {
  const item = await prisma.menuItem.findFirst({
    where: { id: itemId, restaurantId }
  });
  if (!item) throw new Error('Menu item not found');

  return await prisma.modifierGroup.create({
    data: {
      menuItemId: itemId,
      name: data.name,
      isRequired: data.isRequired || false,
      maxSelections: data.maxSelections || null,
      options: {
        create: data.options || []
      }
    },
    include: { options: true }
  });
};

export const updateModifierGroup = async (restaurantId: string, groupId: string, data: any) => {
  const group = await prisma.modifierGroup.findFirst({
    where: { id: groupId, menuItem: { restaurantId } }
  });
  if (!group) throw new Error('Modifier group not found');

  return await prisma.modifierGroup.update({
    where: { id: groupId },
    data: {
      name: data.name,
      isRequired: data.isRequired,
      maxSelections: data.maxSelections,
    }
  });
};

export const deleteModifierGroup = async (restaurantId: string, groupId: string) => {
  const group = await prisma.modifierGroup.findFirst({
    where: { id: groupId, menuItem: { restaurantId } }
  });
  if (!group) throw new Error('Modifier group not found');

  await prisma.modifierOption.deleteMany({ where: { modifierGroupId: groupId } });
  return await prisma.modifierGroup.delete({ where: { id: groupId } });
};

export const createModifierOption = async (restaurantId: string, groupId: string, data: any) => {
  const group = await prisma.modifierGroup.findFirst({
    where: { id: groupId, menuItem: { restaurantId } }
  });
  if (!group) throw new Error('Modifier group not found');

  return await prisma.modifierOption.create({
    data: {
      modifierGroupId: groupId,
      name: data.name,
      price: data.price || 0,
      isAvailable: data.isAvailable !== undefined ? data.isAvailable : true
    }
  });
};

export const updateModifierOption = async (restaurantId: string, optionId: string, data: any) => {
  const option = await prisma.modifierOption.findFirst({
    where: { id: optionId, modifierGroup: { menuItem: { restaurantId } } }
  });
  if (!option) throw new Error('Modifier option not found');

  return await prisma.modifierOption.update({
    where: { id: optionId },
    data: {
      name: data.name,
      price: data.price,
      isAvailable: data.isAvailable
    }
  });
};

export const deleteModifierOption = async (restaurantId: string, optionId: string) => {
  const option = await prisma.modifierOption.findFirst({
    where: { id: optionId, modifierGroup: { menuItem: { restaurantId } } }
  });
  if (!option) throw new Error('Modifier option not found');

  return await prisma.modifierOption.delete({ where: { id: optionId } });
};
