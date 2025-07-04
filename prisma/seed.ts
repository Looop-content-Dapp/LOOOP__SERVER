import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Define genres
  const genres = [
    'Pop', 'Rock', 'Hip Hop', 'R&B', 'Jazz', 'Classical', 'Electronic',
    'Country', 'Folk', 'Blues', 'Metal', 'Reggae', 'Latin', 'World',
    'Alternative', 'Indie', 'Dance', 'Soul', 'Funk', 'Gospel',
    'Punk', 'Ambient', 'House', 'Techno', 'Trap', 'Drill'
  ];

  console.log('Start seeding genres...');

  // Create genres
  for (const genreName of genres) {
    await prisma.genre.upsert({
      where: { name: genreName },
      update: {},
      create: {
        name: genreName,
      },
    });
  }

  console.log('Seeding genres completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });