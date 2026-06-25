import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.category.findMany({
    include: {
      restaurant: true,
    }
  });
  console.log("=== ALL CATEGORIES IN DATABASE ===");
  console.log(categories.map(c => ({
    id: c.id,
    name: c.name,
    status: c.status,
    restaurantName: c.restaurant?.name,
    showPublicly: c.restaurant?.showPublicly,
  })));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
