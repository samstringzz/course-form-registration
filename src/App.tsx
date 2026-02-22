/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  LogOut, 
  Search, 
  Plus, 
  X, 
  Clock, 
  Calendar,
  ShieldCheck,
  GraduationCap,
  Info,
  LayoutDashboard,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebaseConfig';

import { Course, Student, ValidationResult } from './types';
import { validateRegistration } from './validationService';
import { dbService } from './dbService';
import { Auth } from './components/Auth';
import { AdminDashboard } from './components/AdminDashboard';
import { RegistrationView } from './components/RegistrationView';
import { ProfileView } from './components/ProfileView';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [student, setStudent] = useState<Student | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'catalog' | 'admin' | 'profile'>('catalog');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const studentData = await dbService.getStudent(user.uid);
        setStudent(studentData);
        // Load courses only after auth
        loadCourses();
      } else {
        setStudent(null);
      }
      setLoading(false);
    });

    const loadCourses = async () => {
      try {
        const realCourses = await dbService.getCourses();
        setCourses(realCourses);
      } catch (e) {
        console.error("Failed to load courses:", e);
        toast.error("Failed to load course catalog");
      }
    };

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleSwitchTab = (e: any) => setActiveTab(e.detail);
    window.addEventListener('switchTab', handleSwitchTab);
    return () => window.removeEventListener('switchTab', handleSwitchTab);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    toast.info("Logged out successfully");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <Auth onAuthSuccess={(s) => setStudent(s)} />
      </>
    );
  }

  if (student.status === 'pending_approval') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Toaster position="top-right" richColors />
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6">
          <div className="inline-flex p-4 bg-brand-50 text-brand-600 rounded-2xl">
            <Clock size={48} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Approval Pending</h2>
          <p className="text-slate-500">
            Your account ({student.email}) is currently awaiting approval from the system administrator. 
            Please check back later.
          </p>
          <button 
            onClick={handleLogout}
            className="w-full py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Toaster position="top-right" richColors />
      
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass-panel border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <button 
          onClick={() => setActiveTab('catalog')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="bg-brand-600 p-2 rounded-lg text-white">
            <ShieldCheck size={24} />
          </div>
          <div className="text-left">
            <h1 className="font-bold text-xl tracking-tight text-slate-900">EduReg</h1>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">Secure Academic Portal</p>
          </div>
        </button>

        <div className="flex items-center gap-6">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('catalog')}
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2",
                activeTab === 'catalog' ? "bg-white text-brand-600 shadow-sm" : "text-slate-500"
              )}
            >
              <LayoutDashboard size={14} /> {student.role === 'student' ? 'Registration' : 'Catalog'}
            </button>
            {(student.role === 'admin' || student.role === 'coordinator') && (
              <button
                onClick={() => setActiveTab('admin')}
                className={cn(
                  "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2",
                  activeTab === 'admin' ? "bg-white text-brand-600 shadow-sm" : "text-slate-500"
                )}
              >
                <ClipboardList size={14} /> {student.role === 'admin' ? 'Admin' : 'Coordinator'}
              </button>
            )}
          </div>

          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-semibold text-slate-900">{student.name}</span>
            <span className="text-xs text-slate-500">
              {student.role === 'admin' ? 'System Admin' : student.role === 'coordinator' ? 'Coordinator' : student.major} • GPA: {student.gpa}
            </span>
          </div>
          <button 
            onClick={() => setActiveTab('profile')}
            className={cn(
              "h-10 w-10 rounded-full flex items-center justify-center transition-all border",
              activeTab === 'profile' 
                ? "bg-brand-600 text-white border-brand-600 shadow-lg shadow-brand-100" 
                : "bg-slate-200 text-slate-600 border-slate-300 hover:border-brand-300"
            )}
          >
            <User size={20} />
          </button>
          <button 
            onClick={handleLogout}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
          >
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        {activeTab === 'admin' && (student.role === 'admin' || student.role === 'coordinator') ? (
          <AdminDashboard userRole={student.role} />
        ) : activeTab === 'profile' ? (
          <ProfileView 
            student={student} 
            onUpdate={(s) => setStudent(s)} 
            onBack={() => setActiveTab('catalog')}
          />
        ) : (
          <RegistrationView 
            student={student} 
            courses={courses} 
            onUpdateStudent={(s) => setStudent(s)} 
          />
        )}
      </main>

      <footer className="bg-white border-t border-slate-100 p-6 text-center">
        <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">
          &copy; 2026 University Academic Services • Secure Registration System
        </p>
      </footer>
    </div>
  );
}
