export interface CreateBookingDTO {
  resourceId: string;
  startTime: Date | string;
  endTime: Date | string;
  purpose: string;
  recurrencePattern?: string; // None, Daily, Weekly, Custom
  recurrenceEndDate?: Date | string;
}

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictingBookings?: any[];
  alternatives?: TimeSlot[];
}

export interface BookingWithDetails {
  id: string;
  user: { id: string; name: string; email: string };
  resource: { id: string; name: string; type: string };
  startTime: Date;
  endTime: Date;
  purpose: string;
  status: string;
  createdAt: Date;
}
