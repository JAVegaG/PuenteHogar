/**
 * Seed script — initializes catalog data required for the platform to function.
 *
 * Run from src/backend/:
 *   npm run db:seed
 *
 * Also executed automatically at container startup via PrismaService.
 * All operations use upserts — safe to run repeatedly (idempotent).
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma-generated/client';
import { PrismaPg } from "@prisma/adapter-pg";


const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
});

async function main() {
  console.log('🌱 Starting seed...');

  // ── Document Types ──────────────────────────────────────────────────────────
  const documentTypes = [
    { code: 'CC', description: 'Cédula de Ciudadanía' },
    { code: 'NIT', description: 'Número de Identificación Tributaria' },
    { code: 'CE', description: 'Cédula de Extranjería' },
    { code: 'PP', description: 'Pasaporte' },
    { code: 'TI', description: 'Tarjeta de Identidad' },
  ];

  for (const dt of documentTypes) {
    await prisma.documentType.upsert({
      where: { code: dt.code },
      update: { description: dt.description, is_active: true },
      create: { code: dt.code, description: dt.description, is_active: true },
    });
  }
  console.log('✅ Document types seeded');

  // ── Property Types ──────────────────────────────────────────────────────────
  const propertyTypes = [
    { code: 'APARTAMENTO', description: 'Apartamento' },
    { code: 'CASA', description: 'Casa' },
    { code: 'LOCAL', description: 'Local comercial' },
    { code: 'OFICINA', description: 'Oficina' },
    { code: 'BODEGA', description: 'Bodega' },
    { code: 'LOTE', description: 'Lote' },
    { code: 'FINCA', description: 'Finca' },
    { code: 'HABITACION', description: 'Habitación' },
    { code: 'ESTUDIO', description: 'Estudio' },
  ];

  for (const pt of propertyTypes) {
    await prisma.propertyType.upsert({
      where: { code: pt.code },
      update: { description: pt.description, is_active: true },
      create: { code: pt.code, description: pt.description, is_active: true },
    });
  }
  console.log('✅ Property types seeded');

  // ── Departments & Cities (DANE CSV) ────────────────────────────────────────
  // In production, the compiled seed runs from dist/db/seeds/ but the CSV lives at db/seeds/.
  // Try the source location first (relative to project root), then fall back to __dirname.
  const csvCandidates = [
    path.join(process.cwd(), 'db', 'seeds', 'states_citys_colombia.seed.csv'),
    path.join(__dirname, 'states_citys_colombia.seed.csv'),
  ];
  const csvPath = csvCandidates.find((p) => fs.existsSync(p));
  if (!csvPath) {
    console.error('⚠️  CSV file not found at any expected location, skipping departments/cities seed');
  } else {
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter((line) => line.trim().length > 0);

    // Parse header — trim whitespace from each column name
    const headers = lines[0].split(';').map((h) => h.trim());
    const codeDeptIdx = headers.indexOf('Código_Departamento');
    const nameDeptIdx = headers.indexOf('Nombre_Departamento');
    const codeMunIdx = headers.indexOf('Código_Municipio');
    const nameMunIdx = headers.indexOf('Nombre_Municipio');

    // Extract unique departments
    const departmentMap = new Map<string, string>(); // code → name
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(';').map((c) => c.trim());
      const deptCode = cols[codeDeptIdx];
      const deptName = cols[nameDeptIdx];
      if (deptCode && deptName && !departmentMap.has(deptCode)) {
        departmentMap.set(deptCode, deptName);
      }
    }

    // Upsert departments
    for (const [code, name] of departmentMap) {
      await prisma.department.upsert({
        where: { code },
        update: { name, is_active: true },
        create: { code, name, is_active: true },
      });
    }
    console.log(`✅ Departments seeded: ${departmentMap.size}`);

    // Upsert cities
    let cityCount = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(';').map((c) => c.trim());
      const cityCode = cols[codeMunIdx];
      const cityName = cols[nameMunIdx];
      const deptCode = cols[codeDeptIdx];
      if (cityCode && cityName && deptCode) {
        await prisma.city.upsert({
          where: { code: cityCode },
          update: { name: cityName, department_code: deptCode, is_active: true },
          create: { code: cityCode, name: cityName, department_code: deptCode, is_active: true },
        });
        cityCount++;
      }
    }
    console.log(`✅ Cities seeded: ${cityCount}`);
  }

  // ── Roles ────────────────────────────────────────────────────────────────────
  const roles = [
    { name: 'LANDLORD', description: 'Arrendador — gestiona inmuebles y contratos' },
    { name: 'TENANT', description: 'Arrendatario — busca y arrienda inmuebles' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: { name: role.name, description: role.description },
    });
  }
  console.log('✅ Roles seeded');

  // ── Permissions ──────────────────────────────────────────────────────────────
  const permissionDefs = [
    { effect: 'ALLOW', action: 'CREATE', resource: 'portfolio_unit' },
    { effect: 'ALLOW', action: 'READ', resource: 'portfolio_unit' },
    { effect: 'ALLOW', action: 'UPDATE', resource: 'portfolio_unit' },
    { effect: 'ALLOW', action: 'CREATE', resource: 'listing' },
    { effect: 'ALLOW', action: 'UPDATE', resource: 'listing' },
    { effect: 'ALLOW', action: 'DELETE', resource: 'listing' },
    { effect: 'ALLOW', action: 'CREATE', resource: 'contract' },
    { effect: 'ALLOW', action: 'READ', resource: 'contract' },
    { effect: 'ALLOW', action: 'READ', resource: 'accounting_report' },
    { effect: 'ALLOW', action: 'READ', resource: 'payment_history' },
    { effect: 'ALLOW', action: 'CREATE', resource: 'contact_event' },
    { effect: 'ALLOW', action: 'CREATE', resource: 'payment' },
  ];

  const createdPermissions: Array<{ id: string; action: string; resource: string }> = [];
  for (const perm of permissionDefs) {
    const existing = await prisma.permission.findFirst({
      where: { effect: perm.effect, action: perm.action, resource: perm.resource },
    });
    if (!existing) {
      const created = await prisma.permission.create({ data: perm });
      createdPermissions.push(created);
    } else {
      createdPermissions.push(existing);
    }
  }
  console.log('✅ Permissions seeded');

  // ── Role-Permission assignments ──────────────────────────────────────────────
  const landlordRole = await prisma.role.findUnique({ where: { name: 'LANDLORD' } });
  const tenantRole = await prisma.role.findUnique({ where: { name: 'TENANT' } });

  const landlordResources = ['portfolio_unit', 'listing', 'contract', 'accounting_report', 'payment_history'];
  const tenantResources = ['listing', 'contact_event', 'contract', 'payment', 'payment_history'];

  if (landlordRole) {
    for (const perm of createdPermissions.filter((p) => landlordResources.includes(p.resource))) {
      await prisma.rolePermission.upsert({
        where: { role_id_permission_id: { role_id: landlordRole.id, permission_id: perm.id } },
        update: {},
        create: { role_id: landlordRole.id, permission_id: perm.id },
      });
    }
  }

  if (tenantRole) {
    for (const perm of createdPermissions.filter((p) => tenantResources.includes(p.resource))) {
      await prisma.rolePermission.upsert({
        where: { role_id_permission_id: { role_id: tenantRole.id, permission_id: perm.id } },
        update: {},
        create: { role_id: tenantRole.id, permission_id: perm.id },
      });
    }
  }
  console.log('✅ Role-permission assignments seeded');

  // ── Lease Statuses ───────────────────────────────────────────────────────────
  const leaseStatuses = [
    { name: 'PUBLISHED', description: 'Inmueble publicado, disponible para contacto' },
    { name: 'CONTACT_INITIATED', description: 'Arrendatario ha contactado al arrendador' },
    { name: 'CONTRACT_UPLOADED', description: 'Contrato cargado, pendiente de firma' },
    { name: 'CONTRACT_SIGNED', description: 'Contrato firmado por ambas partes' },
    { name: 'PAYMENT_RECEIVED', description: 'Primer pago recibido, arriendo activo' },
  ];

  for (const status of leaseStatuses) {
    await prisma.leaseStatus.upsert({
      where: { name: status.name },
      update: { description: status.description },
      create: { name: status.name, description: status.description },
    });
  }
  console.log('✅ Lease statuses seeded');

  // ── Listing Statuses ─────────────────────────────────────────────────────────
  const listingStatuses = [
    { name: 'PUBLISHED', description: 'Publicación activa y visible' },
    { name: 'UNPUBLISHED', description: 'Publicación desactivada por el arrendador' },
    { name: 'RENTED', description: 'Inmueble arrendado, publicación cerrada' },
  ];

  for (const status of listingStatuses) {
    await prisma.listingStatus.upsert({
      where: { name: status.name },
      update: { description: status.description },
      create: { name: status.name, description: status.description },
    });
  }
  console.log('✅ Listing statuses seeded');

  // ── Contract Statuses ────────────────────────────────────────────────────────
  const contractStatuses = [
    { name: 'PENDING', description: 'Contrato cargado, pendiente de inicio de firma' },
    { name: 'SIGNATURE_PENDING', description: 'Proceso de firma iniciado, esperando confirmación' },
    { name: 'SIGNED', description: 'Contrato firmado por todas las partes' },
  ];

  for (const status of contractStatuses) {
    await prisma.contractStatus.upsert({
      where: { name: status.name },
      update: { description: status.description },
      create: { name: status.name, description: status.description },
    });
  }
  console.log('✅ Contract statuses seeded');

  // ── Payment Statuses ─────────────────────────────────────────────────────────
  const paymentStatuses = [
    { name: 'PENDING', description: 'Pago programado, aún no iniciado' },
    { name: 'PROCESSING', description: 'Pago en proceso, esperando confirmación de la pasarela' },
    { name: 'PAID', description: 'Pago confirmado exitosamente' },
    { name: 'REJECTED', description: 'Pago rechazado por la pasarela' },
    { name: 'APPROVED', description: 'Pago aprobado por la pasarela' },
  ];

  for (const status of paymentStatuses) {
    await prisma.paymentStatus.upsert({
      where: { name: status.name },
      update: { description: status.description },
      create: { name: status.name, description: status.description },
    });
  }
  console.log('✅ Payment statuses seeded');

  // ── Signing Statuses ─────────────────────────────────────────────────────────
  const signingStatuses = [
    { name: 'PENDING', description: 'Firma pendiente' },
    { name: 'SIGNED', description: 'Firmado exitosamente' },
    { name: 'FAILED', description: 'Firma fallida' },
  ];

  for (const status of signingStatuses) {
    await prisma.signingStatus.upsert({
      where: { name: status.name },
      update: { description: status.description },
      create: { name: status.name, description: status.description },
    });
  }
  console.log('✅ Signing statuses seeded');

  // ── File Types ───────────────────────────────────────────────────────────────
  const fileTypes = [
    { name: 'CONTRACT_PDF', description: 'Contrato de arrendamiento en formato PDF' },
    { name: 'PAYMENT_RECEIPT', description: 'Comprobante de pago' },
  ];

  for (const ft of fileTypes) {
    await prisma.fileType.upsert({
      where: { name: ft.name },
      update: { description: ft.description },
      create: { name: ft.name, description: ft.description },
    });
  }

  // ── File Statuses ────────────────────────────────────────────────────────────
  const fileStatuses = [
    { name: 'ACTIVE', description: 'Archivo activo y accesible' },
    { name: 'ARCHIVED', description: 'Archivo archivado' },
  ];

  for (const fst of fileStatuses) {
    await prisma.fileStatus.upsert({
      where: { name: fst.name },
      update: { description: fst.description },
      create: { name: fst.name, description: fst.description },
    });
  }
  console.log('✅ File types and statuses seeded');

  // ── Notification Types ───────────────────────────────────────────────────────
  const notificationTypes = [
    { name: 'NEW_INTEREST', description: 'Nuevo arrendatario interesado en un inmueble' },
    { name: 'CONTRACT_SIGNED', description: 'Contrato firmado por todas las partes' },
    { name: 'CONTRACT_UPLOADED', description: 'Contrato cargado por el arrendador' },
    { name: 'PAYMENT_RECEIVED', description: 'Pago del canon recibido exitosamente' },
    { name: 'PAYMENT_DUE', description: 'Recordatorio de pago próximo a vencer' },
    { name: 'LEASE_CREATED', description: 'Arriendo creado para un arrendatario' },
    { name: 'LEASE_CANCELLED', description: 'Arriendo cancelado por el arrendador' },
  ];

  for (const nt of notificationTypes) {
    await prisma.notificationType.upsert({
      where: { name: nt.name },
      update: { description: nt.description },
      create: { name: nt.name, description: nt.description },
    });
  }
  console.log('✅ Notification types seeded');

  console.log('🎉 Seed completed successfully');
}

main()
  .catch((e: unknown) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
