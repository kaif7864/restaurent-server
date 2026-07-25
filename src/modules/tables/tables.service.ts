import prisma from '../../config/prisma';

export const getTables = async (restaurantId: string) => {
  return await prisma.restaurantTable.findMany({
    where: { 
      restaurantId,
      status: { not: 'deleted' } 
    },
    orderBy: { name: 'asc' },
  });
};

export const createTable = async (restaurantId: string, data: any) => {
  const existingTable = await prisma.restaurantTable.findFirst({
    where: { restaurantId, name: data.name },
  });
  if (existingTable) {
    throw new Error('A table with this name already exists');
  }
  
  return await prisma.restaurantTable.create({
    data: {
      ...data,
      restaurantId,
    },
  });
};

export const updateTable = async (tableId: string, restaurantId: string, data: any) => {
  if (data.name) {
    const existingTable = await prisma.restaurantTable.findFirst({
      where: { 
        restaurantId, 
        name: data.name,
        id: { not: tableId }
      },
    });
    if (existingTable) {
      throw new Error('A table with this name already exists');
    }
  }

  if (data.status === 'available') {
    const activeSession = await prisma.tableSession.findFirst({
      where: {
        tableId,
        status: 'active'
      }
    });
    if (activeSession) {
      throw new Error('Cannot set table to available. There is an active order/session on this table. Please checkout the order first.');
    }
  }

  return await prisma.restaurantTable.update({
    where: { id: tableId, restaurantId },
    data,
  });
};

export const deleteTable = async (tableId: string, restaurantId: string) => {
  try {
    return await prisma.restaurantTable.delete({
      where: { id: tableId, restaurantId },
    });
  } catch (error: any) {
    if (error.code === 'P2003' || (error.message && error.message.includes('violates RESTRICT setting of foreign key constraint'))) {
      // If it has history, perform a soft delete and append a timestamp to the name to free up the original name
      const table = await prisma.restaurantTable.findUnique({ where: { id: tableId } });
      if (table) {
        return await prisma.restaurantTable.update({
          where: { id: tableId, restaurantId },
          data: { 
            status: 'deleted', 
            name: `${table.name}_deleted_${Date.now()}` 
          }
        });
      }
    }
    throw error;
  }
};
