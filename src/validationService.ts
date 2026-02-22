import { Course, Student, ValidationResult } from './types';

export const validateRegistration = (
  student: Student,
  selectedCourses: Course[],
  allCourses: Course[]
): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  const totalCredits = selectedCourses.reduce((acc, c) => acc + c.credits, 0);

  // 1. Credit Load Validation
  if (totalCredits < student.minCredits) {
    errors.push(`Minimum credit load not met. Required: ${student.minCredits}, Selected: ${totalCredits}`);
  }
  if (totalCredits > student.maxCredits) {
    errors.push(`Maximum credit load exceeded. Allowed: ${student.maxCredits}, Selected: ${totalCredits}`);
  }

  // 2. Prerequisite Validation for each selected course
  selectedCourses.forEach(course => {
    const missingPrereqs = course.prerequisites.filter(
      (prereqCode) => !student.completedCourses.includes(prereqCode)
    );

    if (missingPrereqs.length > 0) {
      errors.push(`${course.code}: Missing prerequisites: ${missingPrereqs.join(', ')}`);
    }

    // 3. Capacity Validation
    if (course.enrolled >= course.capacity) {
      errors.push(`${course.code}: Course is currently full.`);
    }
  });

  // 4. Schedule Conflict Validation
  for (let i = 0; i < selectedCourses.length; i++) {
    for (let j = i + 1; j < selectedCourses.length; j++) {
      const c1 = selectedCourses[i];
      const c2 = selectedCourses[j];
      
      if (c1.schedule?.days && c2.schedule?.days) {
        const daysOverlap = c1.schedule.days.some((day) => c2.schedule.days.includes(day));
        if (daysOverlap) {
          const start1 = c1.schedule.startTime;
          const end1 = c1.schedule.endTime;
          const start2 = c2.schedule.startTime;
          const end2 = c2.schedule.endTime;

          if (start1 < end2 && start2 < end1) {
            errors.push(`Schedule conflict between ${c1.code} and ${c2.code}.`);
          }
        }
      }
    }
  }

  // 5. Core Courses Check (Optional Warning)
  const coreCourses = allCourses.filter(c => c.type === 'core');
  const missingCore = coreCourses.filter(cc => !selectedCourses.some(sc => sc.id === cc.id));
  if (missingCore.length > 0) {
    warnings.push(`You have not selected some core courses: ${missingCore.map(c => c.code).join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};
