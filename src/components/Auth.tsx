import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { dbService } from '../dbService';
import { Student, UserRole } from '../types';
import { Shield, Mail, Lock, User, GraduationCap, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

interface AuthProps {
  onAuthSuccess: (student: Student) => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [major, setMajor] = useState('');
  const [faculty, setFaculty] = useState('');
  const [level, setLevel] = useState('100');
  const [role, setRole] = useState<UserRole>('student');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      let studentData = await dbService.getStudent(user.uid);

      if (!studentData) {
        // Create a new student profile for Google user
        const newStudent: Student = {
          id: user.uid,
          name: user.displayName || 'Google User',
          email: user.email || '',
          major: 'Undeclared',
          faculty: 'General Studies',
          level: '100',
          session: '2025/2026',
          gpa: 0.0,
          completedCourses: [],
          currentRegistrations: [],
          maxCredits: 24,
          minCredits: 15,
          role: 'student',
          status: 'pending_approval'
        };
        await dbService.createStudent(newStudent);
        studentData = newStudent;
        toast.success("Account created with Google!");
      } else {
        toast.success("Signed in with Google!");
      }
      onAuthSuccess(studentData);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        let studentData = await dbService.getStudent(userCredential.user.uid);
        
        // Self-healing: If auth exists but profile is missing
        if (!studentData) {
          const recoveredStudent: Student = {
            id: userCredential.user.uid,
            name: email.split('@')[0],
            email: email,
            major: 'Undeclared',
            faculty: 'General Studies',
            level: '100',
            session: '2025/2026',
            gpa: 0.0,
            completedCourses: [],
            currentRegistrations: [],
            maxCredits: 24,
            minCredits: 15,
            role: 'student',
            status: 'pending_approval'
          };
          await dbService.createStudent(recoveredStudent);
          studentData = recoveredStudent;
          toast.info("Profile recovered. Awaiting approval.");
        }
        
        onAuthSuccess(studentData);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newStudent: Student = {
          id: userCredential.user.uid,
          name,
          email,
          major,
          faculty,
          level,
          session: '2025/2026',
          gpa: 0.0, 
          completedCourses: [],
          currentRegistrations: [],
          maxCredits: 24,
          minCredits: 15,
          role,
          status: 'pending_approval'
        };
        await dbService.createStudent(newStudent);
        onAuthSuccess(newStudent);
        toast.success("Account created successfully!");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden"
      >
        <div className="bg-brand-600 p-8 text-white text-center">
          <div className="inline-flex p-3 bg-white/20 rounded-2xl mb-4">
            <Shield size={32} />
          </div>
          <h2 className="text-2xl font-bold">EduReg Portal</h2>
          <p className="text-white/70 text-sm mt-2">Secure Academic Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'}`}
            >
              Register
            </button>
          </div>

          {!isLogin && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Role</label>
                <select
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                >
                  <option value="student">Student</option>
                  <option value="coordinator">Coordinator</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Faculty</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Science"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                    value={faculty}
                    onChange={(e) => setFaculty(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Level</label>
                  <select
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                  >
                    <option value="100">100 Level</option>
                    <option value="200">200 Level</option>
                    <option value="300">300 Level</option>
                    <option value="400">400 Level</option>
                    <option value="500">500 Level</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">
                  {role === 'student' ? 'Major / Programme' : 'Department'}
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-brand-100 hover:bg-brand-700 transition-all flex items-center justify-center gap-2 mt-4"
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
            {!loading && <ArrowRight size={18} />}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-bold">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white text-slate-700 py-4 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </button>
        </form>
      </motion.div>
    </div>
  );
};
