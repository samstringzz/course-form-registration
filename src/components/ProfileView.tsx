import React, { useState } from 'react';
import { Student } from '../types';
import { dbService } from '../dbService';
import { toast } from 'sonner';
import { User, Mail, GraduationCap, School, Calendar, Save, Hash, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface ProfileViewProps {
  student: Student;
  onUpdate: (updatedStudent: Student) => void;
  onBack?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ student, onUpdate, onBack }) => {
  const [formData, setFormData] = useState({
    name: student.name,
    major: student.major,
    faculty: student.faculty,
    level: student.level,
    session: student.session,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updatedStudent = { ...student, ...formData };
      await dbService.createStudent(updatedStudent); // setDoc handles updates
      onUpdate(updatedStudent);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <button 
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-slate-500 hover:text-brand-600 font-bold text-sm transition-colors group"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        Back to Dashboard
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
      >
        <div className="bg-slate-900 p-8 text-white">
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 bg-brand-600 rounded-2xl flex items-center justify-center text-3xl font-bold border-4 border-white/10">
              {student.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{student.name}</h2>
              <p className="text-slate-400 text-sm">{student.email}</p>
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-wider">
                Matric: {student.id.slice(-8).toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 ml-1 flex items-center gap-1">
                <User size={12} /> Full Name
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 ml-1 flex items-center gap-1">
                <Mail size={12} /> Email Address
              </label>
              <input
                type="email"
                disabled
                className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                value={student.email}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 ml-1 flex items-center gap-1">
                <School size={12} /> Faculty
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                value={formData.faculty}
                onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 ml-1 flex items-center gap-1">
                <GraduationCap size={12} /> Major / Programme
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                value={formData.major}
                onChange={(e) => setFormData({ ...formData, major: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 ml-1 flex items-center gap-1">
                <Hash size={12} /> Level
              </label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
              >
                <option value="100">100 Level</option>
                <option value="200">200 Level</option>
                <option value="300">300 Level</option>
                <option value="400">400 Level</option>
                <option value="500">500 Level</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 ml-1 flex items-center gap-1">
                <Calendar size={12} /> Academic Session
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 2025/2026"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                value={formData.session}
                onChange={(e) => setFormData({ ...formData, session: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-brand-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-brand-700 shadow-lg shadow-brand-100 transition-all flex items-center gap-2"
            >
              {loading ? 'Saving...' : 'Save Profile Changes'}
              {!loading && <Save size={18} />}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
