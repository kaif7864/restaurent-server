import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export class StaffService {
  static async getStaff(restaurantId: string) {
    return prisma.user.findMany({
      where: { restaurantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      }
    });
  }

  static async createStaff(restaurantId: string, data: any) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new Error('Email already in use');

    const passwordHash = await bcrypt.hash(data.password || 'password123', 10);

    return prisma.user.create({
      data: {
        restaurantId,
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
      select: { id: true, name: true, email: true, role: true }
    });
  }

  static async updateStaff(restaurantId: string, userId: string, data: any) {
    const user = await prisma.user.findFirst({ where: { id: userId, restaurantId } });
    if (!user) throw new Error('Staff not found');

    const updateData: any = {
      name: data.name,
      role: data.role,
      isActive: data.isActive,
    };

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    return prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, isActive: true }
    });
  }

  static async deleteStaff(restaurantId: string, userId: string) {
    const user = await prisma.user.findFirst({ where: { id: userId, restaurantId } });
    if (!user) throw new Error('Staff not found');
    
    // We shouldn't delete users to keep history, maybe just deactivate them, but if user wants delete:
    return prisma.user.delete({ where: { id: userId } });
  }

  static async clockIn(restaurantId: string, userId: string) {
    // Check if already clocked in (no clockOut)
    const activeLog = await (prisma as any).timeLog.findFirst({
      where: { restaurantId, userId, clockOut: null }
    });
    if (activeLog) {
      throw new Error('Already clocked in');
    }
    return (prisma as any).timeLog.create({
      data: { restaurantId, userId }
    });
  }

  static async clockOut(restaurantId: string, userId: string) {
    const activeLog = await (prisma as any).timeLog.findFirst({
      where: { restaurantId, userId, clockOut: null }
    });
    if (!activeLog) {
      throw new Error('Not clocked in');
    }
    return (prisma as any).timeLog.update({
      where: { id: activeLog.id },
      data: { clockOut: new Date() }
    });
  }

  static async getTimeLogs(restaurantId: string, userId?: string) {
    const where: any = { restaurantId };
    if (userId) where.userId = userId;

    return (prisma as any).timeLog.findMany({
      where,
      include: {
        user: {
          select: { name: true, role: true }
        }
      },
      orderBy: { clockIn: 'desc' }
    });
  }

  static async getAuditLogs(restaurantId: string) {
    return (prisma as any).auditLog.findMany({
      where: { restaurantId },
      include: {
        user: {
          select: { name: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }
}
