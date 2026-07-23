import prisma from '../../config/prisma';
import { hashPassword, comparePassword } from '../../utils/password.util';
import { generateToken } from '../../utils/jwt.util';
import crypto from 'crypto';
import { sendEmail } from '../../utils/email.util';

export const registerRestaurant = async (data: any) => {
  // Check if email exists
  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingUser) {
    throw new Error('Email is already registered');
  }

  // Create restaurant & owner in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const restaurant = await tx.restaurant.create({
      data: {
        name: data.restaurantName,
        email: data.email,
        phone: data.phone,
      },
    });

    const hashedPassword = await hashPassword(data.password);

    const user = await tx.user.create({
      data: {
        restaurantId: restaurant.id,
        name: data.ownerName,
        email: data.email,
        passwordHash: hashedPassword,
        role: 'owner',
      },
    });

    return { restaurant, user };
  });

  const token = generateToken({
    userId: result.user.id,
    restaurantId: result.restaurant.id,
    role: result.user.role,
  });

  return { user: result.user, token };
};

export const loginUser = async (data: any) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    include: { restaurant: true },
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isMatch = await comparePassword(data.password, user.passwordHash);
  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }

  const token = generateToken({
    userId: user.id,
    restaurantId: user.restaurantId,
    role: user.role,
  });

  return { user, token };
};

export const forgotPassword = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('User not found');
  }

  // Generate a random token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  
  // Set expiry to 15 mins from now
  const expiry = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.user.update({
    where: { email },
    data: {
      resetToken: hashedToken,
      resetTokenExpiry: expiry
    }
  });

  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
  const message = `You requested a password reset. Please go to this link to reset your password:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`;

  try {
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      text: message,
    });
  } catch (error) {
    // Revert token if email fails
    await prisma.user.update({
      where: { email },
      data: { resetToken: null, resetTokenExpiry: null }
    });
    throw new Error('There was an error sending the email. Try again later.');
  }

  return { message: 'Token sent to email' };
};

export const resetPassword = async (token: string, newPassword: string) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await prisma.user.findFirst({
    where: {
      resetToken: hashedToken,
      resetTokenExpiry: { gt: new Date() } // Token must not be expired
    }
  });

  if (!user) {
    throw new Error('Token is invalid or has expired');
  }

  const newPasswordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newPasswordHash,
      resetToken: null,
      resetTokenExpiry: null
    }
  });

  return { message: 'Password has been reset successfully' };
};
