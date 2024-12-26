import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

async function migrateUserPublicIds() {
  const prisma = new PrismaClient();

  try {
    const users = await prisma.user.findMany({
      where: {
        publicId: null,
      },
    });

    console.log(`Found ${users.length} users without publicId`);

    for (const user of users) {
      const publicId = crypto.randomBytes(8).toString('base64url');
      await prisma.user.update({
        where: { id: user.id },
        data: { publicId },
      });
      console.log(`Updated user ${user.id} with publicId: ${publicId}`);
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateUserPublicIds();
