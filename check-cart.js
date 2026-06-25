const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.cartItem.findMany({
    include: {
      menuItem: true,
      restaurant: true,
    }
  });
  console.log("=== CURRENT CART ITEMS IN DATABASE ===");
  console.log(JSON.stringify(items, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
