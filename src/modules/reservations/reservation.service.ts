import prisma from '../../config/prisma';

export class ReservationService {
  static async getReservations(restaurantId: string) {
    return prisma.reservation.findMany({
      where: { restaurantId },
      orderBy: [
        { date: 'asc' },
        { time: 'asc' }
      ],
      include: {
        table: true
      }
    });
  }

  static async getReservationById(id: string, restaurantId: string) {
    return prisma.reservation.findFirst({
      where: { id, restaurantId },
      include: {
        table: true
      }
    });
  }

  static async createReservation(restaurantId: string, data: any) {
    // If tableId is empty string, make it undefined
    const tableId = data.tableId === '' ? undefined : data.tableId;
    
    if (tableId) {
      const existing = await prisma.reservation.findFirst({
        where: {
          tableId,
          date: new Date(data.date),
          time: data.time,
          status: { notIn: ['cancelled', 'completed', 'no_show'] }
        }
      });
      if (existing) {
        throw new Error('Table is already reserved for this time.');
      }
    }

    const reservation = await prisma.reservation.create({
      data: {
        restaurantId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        date: new Date(data.date),
        time: data.time,
        guestCount: data.guestCount,
        specialRequests: data.specialRequests,
        tableId
      },
      include: {
        table: true
      }
    });

    if (tableId) {
      await prisma.restaurantTable.update({
        where: { id: tableId },
        data: { status: 'reserved' }
      });
    }

    return reservation;
  }

  static async updateReservation(id: string, restaurantId: string, data: any) {
    if (data.tableId === '') {
      data.tableId = null;
    }
    
    if (data.date) {
      data.date = new Date(data.date);
    }

    // Check double booking on update
    if (data.tableId && data.date && data.time) {
      const existing = await prisma.reservation.findFirst({
        where: {
          id: { not: id },
          tableId: data.tableId,
          date: data.date,
          time: data.time,
          status: { notIn: ['cancelled', 'completed', 'no_show'] }
        }
      });
      if (existing) {
        throw new Error('Table is already reserved for this time.');
      }
    }

    const reservation = await prisma.reservation.update({
      where: { id },
      data,
      include: {
        table: true
      }
    });

    // If a table is assigned and status is pending or confirmed, reserve the table.
    // If cancelled, completed, or no_show, free the table.
    if (reservation.tableId) {
      let tableStatus = 'reserved';
      if (['cancelled', 'completed', 'no_show'].includes(reservation.status)) {
        tableStatus = 'available';
      }
      
      await prisma.restaurantTable.update({
        where: { id: reservation.tableId },
        data: { status: tableStatus }
      });
    }

    return reservation;
  }

  static async deleteReservation(id: string) {
    return prisma.reservation.delete({
      where: { id }
    });
  }
}
