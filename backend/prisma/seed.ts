import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing database records
  await prisma.staffAssignment.deleteMany({});
  await prisma.staffProfile.deleteMany({});
  await prisma.transportRequest.deleteMany({});
  await prisma.vehicleSchedule.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.waitlistEntry.deleteMany({});
  await prisma.equipmentCheckout.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.resourceImage.deleteMany({});
  await prisma.resource.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.systemConfig.deleteMany({});
  
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

  // Create Vehicles
  const vehicle1 = await prisma.vehicle.create({
    data: {
      name: 'Main Campus Shuttle 1',
      type: 'Shuttle',
      capacity: 25,
      status: 'Active',
      driverName: 'Robert Driver',
      licensePlate: 'CAMPUS-SH-01',
    },
  });

  const vehicle2 = await prisma.vehicle.create({
    data: {
      name: 'Executive Sedan',
      type: 'Sedan',
      capacity: 4,
      status: 'Active',
      driverName: 'Alice Chauffeur',
      licensePlate: 'CAMPUS-EXEC-02',
    },
  });

  // Create Vehicle Schedules
  const scheduleStart1 = new Date();
  scheduleStart1.setHours(8, 0, 0, 0);
  const scheduleEnd1 = new Date();
  scheduleEnd1.setHours(17, 0, 0, 0);

  await prisma.vehicleSchedule.create({
    data: {
      vehicleId: vehicle1.id,
      route: JSON.stringify(['Engineering Hall', 'Science Block', 'Central Library', 'Main Gate']),
      startTime: scheduleStart1,
      endTime: scheduleEnd1,
    },
  });

  // Create Staff Profiles
  const staff1 = await prisma.staffProfile.create({
    data: {
      name: 'David Support',
      email: 'david@campus.edu',
      role: 'IT_Support',
      status: 'Available',
    },
  });

  const staff2 = await prisma.staffProfile.create({
    data: {
      name: 'Elena Assistant',
      email: 'elena@campus.edu',
      role: 'Lab_Assistant',
      status: 'Available',
    },
  });

  // Create Staff Assignment
  const assignmentStart = new Date();
  assignmentStart.setHours(assignmentStart.getHours() + 1);
  const assignmentEnd = new Date(assignmentStart);
  assignmentEnd.setHours(assignmentStart.getHours() + 2);

  await prisma.staffAssignment.create({
    data: {
      staffId: staff1.id,
      taskDescription: 'Configure projector setup in Engineering Hall Room 101',
      location: 'Engineering Hall Room 101',
      startTime: assignmentStart,
      endTime: assignmentEnd,
      status: 'Assigned',
    },
  });

  console.log('Created vehicles, vehicle schedules, staff profiles, and assignments');
  
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
