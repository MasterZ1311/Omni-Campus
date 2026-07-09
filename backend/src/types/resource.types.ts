export interface CreateResourceDTO {
  name: string;
  type: string; // Classroom, Lab, Equipment, Meeting_Room, Sports_Facility
  capacity?: number;
  location: string;
  amenities?: string[];
  bufferMinutes?: number;
  status?: string; // Available, Maintenance, Unavailable
}

export interface UpdateResourceDTO {
  name?: string;
  type?: string;
  capacity?: number;
  location?: string;
  amenities?: string[];
  bufferMinutes?: number;
  status?: string;
}

export interface ResourceFilters {
  type?: string;
  status?: string;
  minCapacity?: number;
  maxCapacity?: number;
  location?: string;
  amenities?: string[];
  search?: string;
}
