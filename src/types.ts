export interface AttendanceRecord {
  id: string;
  timestamp: string;
  type: 'ENTRADA' | 'SALIDA';
  name: string;
  nominaNumber: string;
  locationDescription: string;
  delegacion?: string;
  photo?: string | null;
  location?: {
    latitude: number;
    longitude: number;
  } | null;
  employeeId?: string;
  userId?: string;
}

export interface Employee {
  id: string;
  name: string;
  nominaNumber: string;
  schedule: string;
  location: string;
  fechaIngreso?: string;
  rfc?: string;
  userId?: string;
}
