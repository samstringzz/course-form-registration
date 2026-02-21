export type UserRole = 'student' | 'coordinator' | 'admin';
export type CourseType = 'core' | 'elective' | 'gst' | 'departmental';
export type RegistrationStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'overridden';

export interface Course {
  id: string;
  code: string;
  title: string;
  description: string;
  credits: number;
  type: CourseType;
  instructor: string;
  schedule: {
    days: string[];
    startTime: string;
    endTime: string;
  };
  prerequisites: string[];
  semester: string;
  capacity: number;
  enrolled: number;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  major: string;
  faculty: string;
  level: string;
  session: string;
  gpa: number;
  completedCourses: string[];
  currentRegistrations: string[];
  maxCredits: number;
  minCredits: number;
  role: UserRole;
  status: 'active' | 'pending_approval' | 'rejected';
}

export interface RegistrationRecord {
  id: string;
  studentId: string;
  studentName: string;
  courseIds: string[];
  status: RegistrationStatus;
  timestamp: number;
  totalCredits: number;
  semester: string;
  session: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
