import prisma from '../config/database';
import notificationService from './notification.service';

export class EquipmentService {
  private overdueInterval: NodeJS.Timeout | null = null;

  async checkOutEquipment(
    equipmentId: string,
    userId: string,
    expectedReturnTime: Date,
    linkedBookingId?: string,
    conditionNotes?: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Enforce checkout limits (Requirement 8.7)
    const limit = user.role === 'Faculty' ? 5 : 3;
    const activeCount = await prisma.equipmentCheckout.count({
      where: {
        userId,
        actualReturnTime: null,
      },
    });

    if (activeCount >= limit) {
      throw new Error(`Checkout limit reached. ${user.role}s can check out at most ${limit} items simultaneously.`);
    }

    const equipment = await prisma.resource.findUnique({
      where: { id: equipmentId, deletedAt: null },
    });

    if (!equipment) {
      throw new Error('Equipment not found');
    }

    if (equipment.type !== 'Equipment') {
      throw new Error('Resource is not categorized as Equipment');
    }

    if (equipment.status !== 'Available') {
      throw new Error('Equipment is currently not available (busy or in maintenance)');
    }

    const result = await prisma.$transaction(async (tx) => {
      const checkout = await tx.equipmentCheckout.create({
        data: {
          equipmentId,
          userId,
          linkedBookingId: linkedBookingId || null,
          checkoutTime: new Date(),
          expectedReturnTime,
          conditionAtCheckout: conditionNotes || 'Good',
          isOverdue: false,
        },
      });

      // Prevent new bookings by updating status
      await tx.resource.update({
        where: { id: equipmentId },
        data: { status: 'Unavailable' },
      });

      return checkout;
    });

    return result;
  }

  async checkInEquipment(checkoutId: string, conditionAtReturn: string, markMaintenance = false) {
    const checkout = await prisma.equipmentCheckout.findUnique({
      where: { id: checkoutId },
    });

    if (!checkout) {
      throw new Error('Checkout record not found');
    }

    if (checkout.actualReturnTime) {
      throw new Error('Equipment has already been checked in');
    }

    await prisma.$transaction(async (tx) => {
      await tx.equipmentCheckout.update({
        where: { id: checkoutId },
        data: {
          actualReturnTime: new Date(),
          conditionAtReturn,
          isOverdue: false,
        },
      });

      // Update resource status
      await tx.resource.update({
        where: { id: checkout.equipmentId },
        data: {
          status: markMaintenance ? 'Maintenance' : 'Available',
        },
      });
      
      if (markMaintenance) {
        // Create maintenance entry (Requirement 8.6)
        await tx.maintenanceSchedule.create({
          data: {
            resourceId: checkout.equipmentId,
            startTime: new Date(),
            endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Default 2 days
            reason: `Damaged during checkout ${checkoutId}: ${conditionAtReturn}`,
            createdBy: checkout.userId,
            status: 'In_Progress',
          },
        });
      }
    });
  }

  async checkOverdue() {
    try {
      const now = new Date();
      const overdueList = await prisma.equipmentCheckout.findMany({
        where: {
          actualReturnTime: null,
          expectedReturnTime: { lte: now },
        },
        include: {
          user: { select: { id: true, email: true, name: true } },
          equipment: { select: { name: true } },
        },
      });

      for (const checkout of overdueList) {
        // Mark as overdue in database
        if (!checkout.isOverdue) {
          await prisma.equipmentCheckout.update({
            where: { id: checkout.id },
            data: { isOverdue: true },
          });
        }

        // Check if overdue by more than 3 days (escalate)
        const diffMs = now.getTime() - checkout.expectedReturnTime.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (diffDays >= 3) {
          // Escalate to administrators (Requirement 8.5)
          console.log(`⚠️ ESCALATION: Equipment checkout ${checkout.id} overdue by 3+ days!`);
          
          await prisma.auditLog.create({
            data: {
              action: 'EQUIPMENT_OVERDUE_ESCALATION',
              entityType: 'EquipmentCheckout',
              entityId: checkout.id,
              changes: JSON.stringify({
                user: checkout.user.name,
                item: checkout.equipment.name,
                daysOverdue: Math.floor(diffDays),
              }),
            },
          });
        }

        // Send notification
        await notificationService.enqueueNotification(
          checkout.userId,
          'equipment_overdue',
          'email',
          checkout.user.email,
          {
            checkoutId: checkout.id,
            equipmentName: checkout.equipment.name,
            expectedReturnTime: checkout.expectedReturnTime,
            daysOverdue: Math.floor(diffDays),
          }
        );
      }
    } catch (error) {
      console.error('Error checking overdue equipment:', error);
    }
  }

  startOverdueSweep() {
    if (!this.overdueInterval) {
      this.overdueInterval = setInterval(() => {
        this.checkOverdue();
      }, 30000); // Sweep every 30 seconds for quick testing
      console.log('🔍 Equipment overdue sweeps started');
    }
  }

  stopOverdueSweep() {
    if (this.overdueInterval) {
      clearInterval(this.overdueInterval);
      this.overdueInterval = null;
    }
  }
}

export default new EquipmentService();
