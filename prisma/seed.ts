import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Memulai proses seeding database...');

  // 1. Hash default password
  const defaultPassword = await bcrypt.hash('password123', 10);

  // 2. Buat User: Warehouse Manager
  const manager = await prisma.user.upsert({
    where: { email: 'manager@warehouse.com' },
    update: {},
    create: {
      email: 'manager@warehouse.com',
      name: 'Budi Santoso (Warehouse Manager)',
      password: defaultPassword,
      role: Role.WAREHOUSE_MANAGER,
    },
  });
  console.log(`✅ Manager seeded: ${manager.email} (${manager.role})`);

  // 3. Buat User: Warehouse Staff
  const staff = await prisma.user.upsert({
    where: { email: 'staff@warehouse.com' },
    update: {},
    create: {
      email: 'staff@warehouse.com',
      name: 'Agus Prasetyo (Warehouse Staff)',
      password: defaultPassword,
      role: Role.WAREHOUSE_STAFF,
    },
  });
  console.log(`✅ Staff seeded: ${staff.email} (${staff.role})`);

  // 4. Buat Master Produk Awal
  const sampleProducts = [
    { sku: 'PRD-INDOMIE-001', name: 'Indomie Goreng Original', currentStock: 120, unit: 'PCS' },
    { sku: 'PRD-BEARBRAND-002', name: 'Susu Bear Brand 189ml', currentStock: 85, unit: 'CAN' },
    { sku: 'PRD-KOPI-003', name: 'Kopi Kapal Api Spesial Mix 24g', currentStock: 200, unit: 'SACHET' },
    { sku: 'PRD-MINYAK-004', name: 'Minyak Goreng Bimoli 2L', currentStock: 50, unit: 'POUCH' },
    { sku: 'PRD-BERAS-005', name: 'Beras Pandan Wangi 5kg', currentStock: 30, unit: 'BAG' },
  ];

  for (const prod of sampleProducts) {
    const created = await prisma.product.upsert({
      where: { sku: prod.sku },
      update: { currentStock: prod.currentStock },
      create: prod,
    });
    console.log(`📦 Produk: [${created.sku}] ${created.name} | Stok: ${created.currentStock} ${created.unit}`);
  }

  console.log('🎉 Seeding selesai dengan sukses!');
}

main()
  .catch((e) => {
    console.error('❌ Error saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
