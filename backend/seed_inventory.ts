import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.labAsset.createMany({
    data: [
      { name: 'PC-01', location: 'Lab 402', status: 'Online' },
      { name: 'PC-02', location: 'Lab 402', status: 'Online' },
      { name: 'Server Rack B', location: 'Server Room', status: 'Fault' }
    ]
  });

  await prisma.inventoryItem.createMany({
    data: [
      { name: 'HDMI Cables', inStock: 14, out: 2, status: 'Good' },
      { name: 'USB-C Adapters', inStock: 1, out: 8, status: 'Low' },
      { name: 'Remotes', inStock: 5, out: 0, status: 'Good' }
    ]
  });
  console.log('Seeded inventory');
}

main()
  .then(async () => await prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
