import prisma from '../config/database';
import notificationService from './notification.service';

export class StaffService {
  /**
   * Fetch all staff profiles and their assignments
   */
  async getStaffRoster() {
    return prisma.staffProfile.findMany({
      include: {
        assignments: {
          orderBy: { startTime: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Dispatch staff member to assignment point
   */
  async createAssignment(data: {
    staffId: string;
    taskDescription: string;
    location: string;
    startTime: Date;
    endTime: Date;
  }) {
    const staff = await prisma.staffProfile.findUnique({
      where: { id: data.staffId },
    });

    if (!staff) {
      throw new Error('Staff profile not found');
    }

    // Create the assignment
    const assignment = await prisma.staffAssignment.create({
      data: {
        staffId: data.staffId,
        taskDescription: data.taskDescription,
        location: data.location,
        startTime: data.startTime,
        endTime: data.endTime,
        status: 'Assigned',
      },
    });

    // Update staff profile status
    await prisma.staffProfile.update({
      where: { id: data.staffId },
      data: { status: 'Assigned' },
    });

    // Check if there is an active matching User account to send notification
    const user = await prisma.user.findUnique({
      where: { email: staff.email },
    });

    if (user) {
      // Send WebSocket/In-App Notification
      await notificationService.enqueueNotification(
        user.id,
        'staff_assignment_change',
        'in_app',
        staff.email,
        {
          assignmentId: assignment.id,
          taskDescription: data.taskDescription,
          location: data.location,
          startTime: data.startTime,
          endTime: data.endTime,
        }
      );
    }

    return assignment;
  }

  /**
   * Update staff profile availability state
   */
  async updateStaffStatus(staffId: string, status: string) {
    const validStatuses = ['Available', 'Assigned', 'Break'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    return prisma.staffProfile.update({
      where: { id: staffId },
      data: { status },
    });
  }

  /**
   * Retrieve assignments for a specific email
   */
  async getAssignmentsByEmail(email: string) {
    const staff = await prisma.staffProfile.findUnique({
      where: { email },
      include: {
        assignments: {
          orderBy: { startTime: 'asc' },
        },
      },
    });

    return staff ? staff.assignments : [];
  }
}

export default new StaffService();
