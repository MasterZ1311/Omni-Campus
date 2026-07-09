import prisma from '../config/database';
import availabilityService from './availability.service';

interface ParsedIntent {
  resourceType?: string;
  capacity?: number;
  dateTime?: Date;
  location?: string;
  rawMessage: string;
}

interface ConciergeResponse {
  message: string;
  intent: string;
  suggestions: any[];
  bookingLinks: { resourceId: string; name: string; link: string }[];
}

const TYPE_KEYWORDS: Record<string, string> = {
  classroom: 'Classroom',
  class: 'Classroom',
  room: 'Classroom',
  lecture: 'Classroom',
  lab: 'Lab',
  laboratory: 'Lab',
  equipment: 'Equipment',
  projector: 'Equipment',
  laptop: 'Equipment',
  meeting: 'Meeting_Room',
  conference: 'Meeting_Room',
  sports: 'Sports_Facility',
  gym: 'Sports_Facility',
  court: 'Sports_Facility',
};

const TIME_KEYWORDS: Record<string, number> = {
  morning: 9,
  noon: 12,
  afternoon: 14,
  evening: 17,
  night: 19,
};

export class ConciergeService {
  /**
   * Parse a natural language query to extract intent signals.
   */
  private parseIntent(message: string): ParsedIntent {
    const lower = message.toLowerCase();

    // Detect resource type
    let resourceType: string | undefined;
    for (const [keyword, type] of Object.entries(TYPE_KEYWORDS)) {
      if (lower.includes(keyword)) {
        resourceType = type;
        break;
      }
    }

    // Detect capacity (e.g. "for 30 people", "30 seats")
    const capacityMatch = lower.match(/for\s+(\d+)\s*(people|persons?|students?|seats?)?/);
    const capacity = capacityMatch ? parseInt(capacityMatch[1]) : undefined;

    // Detect time (e.g. "at 2pm", "at 14:00", "this afternoon")
    let dateTime: Date | undefined;
    const timeMatch = lower.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const minute = parseInt(timeMatch[2] ?? '0');
      const period = timeMatch[3];
      const adjustedHour =
        period === 'pm' && hour < 12 ? hour + 12 :
        period === 'am' && hour === 12 ? 0 : hour;
      dateTime = new Date();
      dateTime.setHours(adjustedHour, minute, 0, 0);
      // If the time is already past, assume tomorrow
      if (dateTime < new Date()) {
        dateTime.setDate(dateTime.getDate() + 1);
      }
    } else {
      // Named time of day
      for (const [keyword, hour] of Object.entries(TIME_KEYWORDS)) {
        if (lower.includes(keyword)) {
          dateTime = new Date();
          dateTime.setHours(hour, 0, 0, 0);
          if (dateTime < new Date()) dateTime.setDate(dateTime.getDate() + 1);
          break;
        }
      }
    }

    // Detect location hints
    const locationMatch = lower.match(/(?:in|at|near)\s+(block\s+\w+|\w+\s+block|\w+\s+wing|building\s+\w+|\w+\s+building)/i);
    const location = locationMatch?.[1];

    return { resourceType, capacity, dateTime, location, rawMessage: message };
  }

  /**
   * Process a natural language query and return matching resource suggestions.
   */
  async processQuery(message: string, userId: string): Promise<ConciergeResponse> {
    const intent = this.parseIntent(message);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Build resource filter
    const where: any = {
      status: 'Available',
      deletedAt: null,
    };
    if (intent.resourceType) where.type = intent.resourceType;
    if (intent.capacity) where.capacity = { gte: intent.capacity };
    if (intent.location) {
      where.location = { contains: intent.location, mode: 'insensitive' };
    }

    // Default: return available resources
    const resources = await prisma.resource.findMany({
      where,
      take: 5,
      orderBy: { name: 'asc' },
    });

    // If a time was provided, filter by availability
    let available = resources;
    if (intent.dateTime) {
      const startTime = new Date(intent.dateTime);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1-hour window

      const checks = await Promise.all(
        resources.map(async (r) => {
          try {
            const result = await availabilityService.checkAvailability(
              r.id,
              startTime,
              endTime
            );
            return result.isAvailable ? r : null;
          } catch {
            return null;
          }
        })
      );
      available = checks.filter(Boolean) as typeof resources;
    }

    const bookingLinks = available.map((r) => ({
      resourceId: r.id,
      name: r.name,
      link: `${frontendUrl}/discovery?resource=${r.id}`,
    }));

    // Compose natural language response
    let responseMessage: string;
    if (available.length === 0) {
      responseMessage = `I couldn't find any available ${intent.resourceType?.toLowerCase() ?? 'resources'} matching your request. Try adjusting the time or capacity requirements.`;
    } else {
      const timeStr = intent.dateTime
        ? `at ${intent.dateTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
        : 'right now';
      responseMessage = `I found ${available.length} available ${intent.resourceType?.toLowerCase() ?? 'resource'}(s) ${timeStr}. Here are my top suggestions:`;
    }

    return {
      message: responseMessage,
      intent: intent.resourceType ?? 'general',
      suggestions: available.map((r) => ({
        id: r.id,
        name: r.name,
        type: r.type,
        location: r.location,
        capacity: r.capacity,
        status: r.status,
      })),
      bookingLinks,
    };
  }
}

export default new ConciergeService();
