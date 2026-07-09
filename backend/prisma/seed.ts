import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // Create Admin User (local auth)
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@campus.edu',
      name: 'System Administrator',
      role: 'Administrator',
      ssoProvider: 'local',
      passwordHash: adminPassword,
      preferences: JSON.stringify({ notifications: { email: true, sms: false, inApp: true } }),
    },
  });
  console.log('Created admin:', admin.email);
  
  // Create Facility Manager (OIDC)
  const facilityManager = await prisma.user.create({
    data: {
      email: 'facility@campus.edu',
      name: 'John Facility',
      role: 'Facility_Manager',
      ssoProvider: 'oidc',
      ssoId: 'oidc-facility-001',
      preferences: JSON.stringify({}),
    },
  });
  
  // Create Faculty Member
  const faculty = await prisma.user.create({
    data: {
      email: 'professor@campus.edu',
      name: 'Dr. Sarah Professor',
      role: 'Faculty',
      ssoProvider: 'oidc',
      ssoId: 'oidc-faculty-001',
      preferences: JSON.stringify({}),
    },
  });
  
  // Create Student
  const student = await prisma.user.create({
    data: {
      email: 'student@campus.edu',
      name: 'Alice Student',
      role: 'Student',
      ssoProvider: 'oidc',
      ssoId: 'oidc-student-001',
      preferences: JSON.stringify({}),
    },
  });
  console.log('Created users: facility manager, faculty, student');
  
  // Create Classrooms
  const classroom1 = await prisma.resource.create({
    data: {
      name: 'Engineering Hall Room 101',
      type: 'Classroom',
      capacity: 50,
      location: 'Engineering Building, Floor 1',
      amenities: JSON.stringify(['Projector', 'Whiteboard', 'AC', 'Wi-Fi']),
      bufferMinutes: 15,
      status: 'Available',
      managedBy: facilityManager.id,
    },
  });
  
  const classroom2 = await prisma.resource.create({
    data: {
      name: 'Science Block Room 205',
      type: 'Classroom',
      capacity: 30,
      location: 'Science Building, Floor 2',
      amenities: JSON.stringify(['Smart Board', 'AC', 'Wi-Fi']),
      bufferMinutes: 10,
      status: 'Available',
      managedBy: facilityManager.id,
    },
  });
  
  // Create Lab
  const lab1 = await prisma.resource.create({
    data: {
      name: 'Computer Lab A',
      type: 'Lab',
      capacity: 40,
      location: 'IT Building, Floor 3',
      amenities: JSON.stringify(['40 Computers', 'Projector', 'AC', 'Printer']),
      bufferMinutes: 30,
      status: 'Available',
      managedBy: facilityManager.id,
    },
  });
  
  // Create Equipment
  const equipment1 = await prisma.resource.create({
    data: {
      name: 'Laptop - Dell XPS 15',
      type: 'Equipment',
      capacity: 1,
      location: 'Equipment Room, Library',
      amenities: JSON.stringify(['16GB RAM', 'Intel i7', 'SSD 512GB']),
      bufferMinutes: 0,
      status: 'Available',
      managedBy: facilityManager.id,
    },
  });
  
  const equipment2 = await prisma.resource.create({
    data: {
      name: 'Projector - Epson EB-X41',
      type: 'Equipment',
      capacity: 1,
      location: 'Equipment Room, Library',
      amenities: JSON.stringify(['HDMI', 'VGA', 'Wireless']),
      bufferMinutes: 0,
      status: 'Available',
      managedBy: facilityManager.id,
    },
  });
  
  console.log('Created resources: 2 classrooms, 1 lab, 2 equipment');
  
  // Create Sample Bookings
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  
  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(12, 0, 0, 0);
  
  const booking1 = await prisma.booking.create({
    data: {
      userId: faculty.id,
      resourceId: classroom1.id,
      startTime: tomorrow,
      endTime: tomorrowEnd,
      purpose: 'Advanced Algorithms Lecture',
      status: 'Confirmed',
    },
  });
  
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(14, 0, 0, 0);
  
  const nextWeekEnd = new Date(nextWeek);
  nextWeekEnd.setHours(16, 0, 0, 0);
  
  const booking2 = await prisma.booking.create({
    data: {
      userId: student.id,
      resourceId: lab1.id,
      startTime: nextWeek,
      endTime: nextWeekEnd,
      purpose: 'Group Project Work',
      status: 'Confirmed',
    },
  });
  
  console.log('Created 2 sample bookings');
  
  // Create System Configuration
  await prisma.systemConfig.createMany({
    data: [
      {
        key: 'booking_window_faculty',
        value: JSON.stringify({ days: 90 }),
        description: 'Advance booking window for faculty in days',
        updatedBy: admin.id,
      },
      {
        key: 'booking_window_student',
        value: JSON.stringify({ days: 14 }),
        description: 'Advance booking window for students in days',
        updatedBy: admin.id,
      },
      {
        key: 'max_booking_duration_hours',
        value: JSON.stringify({ hours: 8 }),
        description: 'Maximum booking duration in hours',
        updatedBy: admin.id,
      },
      {
        key: 'min_booking_duration_minutes',
        value: JSON.stringify({ minutes: 30 }),
        description: 'Minimum booking duration in minutes',
        updatedBy: admin.id,
      },
      {
        key: 'equipment_checkout_limit_student',
        value: JSON.stringify({ count: 3 }),
        description: 'Maximum simultaneous equipment checkouts for students',
        updatedBy: admin.id,
      },
      {
        key: 'equipment_checkout_limit_faculty',
        value: JSON.stringify({ count: 5 }),
        description: 'Maximum simultaneous equipment checkouts for faculty',
        updatedBy: admin.id,
      },
    ],
  });
  
  console.log('Created system configuration');
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
