import prisma from '../../config/prisma';

export const getTables = async (restaurantId: string) => {
  return await prisma.restaurantTable.findMany({
    where: { restaurantId },
    orderBy: { name: 'asc' },
  });
};

export const createTable = async (restaurantId: string, data: any) => {
  return await prisma.restaurantTable.create({
    data: {
      ...data,
      restaurantId,
    },
  });
};

export const updateTable = async (tableId: string, restaurantId: string, data: any) => {
  return await prisma.restaurantTable.update({
    where: { id: tableId, restaurantId },
    data,
  });
};

export const deleteTable = async (tableId: string, restaurantId: string) => {
  return await prisma.restaurantTable.delete({
    where: { id: tableId, restaurantId },
  });
};
