import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where,
  addDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Student, Course, RegistrationRecord, RegistrationStatus } from './types';

export const dbService = {
  // Student Profile
  async getStudent(uid: string): Promise<Student | null> {
    const docRef = doc(db, 'students', uid);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    
    const data = docSnap.data();
    // Ensure all fields exist for older profiles
    return {
      id: uid,
      name: data.name || 'Unknown',
      email: data.email || '',
      major: data.major || 'Undeclared',
      faculty: data.faculty || 'General Studies',
      level: data.level || '100',
      session: data.session || '2025/2026',
      gpa: data.gpa || 0.0,
      completedCourses: data.completedCourses || [],
      currentRegistrations: data.currentRegistrations || [],
      maxCredits: data.maxCredits || 24,
      minCredits: data.minCredits || 15,
      role: data.role || 'student',
      status: data.status || 'active'
    } as Student;
  },

  async createStudent(student: Student) {
    await setDoc(doc(db, 'students', student.id), student);
  },

  // Courses
  async getCourses(): Promise<Course[]> {
    const querySnapshot = await getDocs(collection(db, 'courses'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
  },

  async updateCoursePrereqs(courseId: string, prereqs: string[]) {
    const courseRef = doc(db, 'courses', courseId);
    await updateDoc(courseRef, { prerequisites: prereqs });
  },

  async addCourse(course: Omit<Course, 'id'>) {
    return await addDoc(collection(db, 'courses'), course);
  },

  async deleteCourse(courseId: string) {
    const courseRef = doc(db, 'courses', courseId);
    await deleteDoc(courseRef);
  },

  // Registrations
  async submitRegistration(student: Student, selectedCourseIds: string[], totalCredits: number, status: RegistrationStatus = 'pending') {
    const registration: Omit<RegistrationRecord, 'id'> = {
      studentId: student.id,
      studentName: student.name,
      courseIds: selectedCourseIds,
      status,
      timestamp: Date.now(),
      totalCredits,
      semester: 'First', // Default or dynamic
      session: student.session
    };
    return await addDoc(collection(db, 'registrations'), registration);
  },

  async getStudentRegistration(studentId: string): Promise<RegistrationRecord | null> {
    const q = query(
      collection(db, 'registrations'), 
      where('studentId', '==', studentId),
      where('status', 'in', ['draft', 'pending', 'approved'])
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    // Get the most recent one
    const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RegistrationRecord));
    return docs.sort((a, b) => b.timestamp - a.timestamp)[0];
  },

  async getPendingRegistrations(): Promise<RegistrationRecord[]> {
    const q = query(collection(db, 'registrations'), where('status', '==', 'pending'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RegistrationRecord));
  },

  async updateRegistrationStatus(regId: string, status: RegistrationStatus, studentId: string, courseIds: string[]) {
    const regRef = doc(db, 'registrations', regId);
    await updateDoc(regRef, { status });

    if (status === 'approved') {
      const studentRef = doc(db, 'students', studentId);
      await updateDoc(studentRef, {
        currentRegistrations: courseIds
      });

      // Update course enrollment counts
      for (const courseId of courseIds) {
        const courseRef = doc(db, 'courses', courseId);
        await updateDoc(courseRef, {
          enrolled: increment(1)
        });
      }
    }
  },

  async bulkApproveRegistrations(registrations: RegistrationRecord[]) {
    const batch = writeBatch(db);
    
    for (const reg of registrations) {
      const regRef = doc(db, 'registrations', reg.id);
      batch.update(regRef, { status: 'approved' });

      const studentRef = doc(db, 'students', reg.studentId);
      batch.update(studentRef, {
        currentRegistrations: reg.courseIds
      });

      for (const courseId of reg.courseIds) {
        const courseRef = doc(db, 'courses', courseId);
        batch.update(courseRef, {
          enrolled: increment(1)
        });
      }
    }

    await batch.commit();
  },

  async getPendingUsers(): Promise<Student[]> {
    const q = query(collection(db, 'students'), where('status', '==', 'pending_approval'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
  },

  async updateUserStatus(uid: string, status: 'active' | 'rejected') {
    const userRef = doc(db, 'students', uid);
    await updateDoc(userRef, { status });
  }
};
