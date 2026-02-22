import React, { useEffect, useState } from 'react';
import { dbService } from '../dbService';
import { RegistrationRecord, Student, RegistrationStatus, Course } from '../types';
import { Check, X, Clock, User, Book, ShieldCheck, Users, ClipboardCheck, Plus, Eye, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export const AdminDashboard: React.FC<{ userRole: string }> = ({ userRole }) => {
  const [pendingRegs, setPendingRegs] = useState<RegistrationRecord[]>([]);
  const [pendingUsers, setPendingUsers] = useState<Student[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'registrations' | 'users' | 'courses'>(userRole === 'admin' ? 'users' : 'registrations');
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [selectedRegForDetails, setSelectedRegForDetails] = useState<RegistrationRecord | null>(null);
  const [newPrereqs, setNewPrereqs] = useState<string>('');
  const [newCourse, setNewCourse] = useState<Omit<Course, 'id'>>({
    code: '',
    title: '',
    description: '',
    credits: 3,
    level: '100',
    type: 'core',
    instructor: 'TBA',
    schedule: {
      days: ['M', 'W'],
      startTime: '09:00',
      endTime: '11:00'
    },
    prerequisites: [],
    semester: 'First',
    enrolled: 0,
    capacity: 100
  });

  const handleAddCourse = async () => {
    try {
      if (!newCourse.code || !newCourse.title) {
        toast.error("Code and Title are required");
        return;
      }
      await dbService.addCourse(newCourse);
      toast.success("Course added successfully");
      setIsAddingCourse(false);
      setNewCourse({
        code: '',
        title: '',
        description: '',
        credits: 3,
        level: '100',
        type: 'core',
        instructor: 'TBA',
        schedule: {
          days: ['M', 'W'],
          startTime: '09:00',
          endTime: '11:00'
        },
        prerequisites: [],
        semester: 'First',
        enrolled: 0,
        capacity: 100
      });
      fetchData();
    } catch (error) {
      toast.error("Failed to add course");
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!window.confirm("Are you sure you want to delete this course? This action cannot be undone.")) return;
    try {
      await dbService.deleteCourse(courseId);
      toast.success("Course deleted successfully");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete course");
    }
  };

  const handleUpdatePrereqs = async () => {
    if (!editingCourse) return;
    try {
      const prereqArray = newPrereqs.split(',').map(p => p.trim()).filter(p => p !== '');
      await dbService.updateCoursePrereqs(editingCourse.id, prereqArray);
      toast.success("Prerequisites updated");
      setEditingCourse(null);
      fetchData();
    } catch (error) {
      toast.error("Update failed");
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [regs, users, courses] = await Promise.all([
        dbService.getPendingRegistrations(),
        userRole === 'admin' ? dbService.getPendingUsers() : Promise.resolve([]),
        dbService.getCourses()
      ]);
      setPendingRegs(regs);
      setPendingUsers(users);
      setAllCourses(courses);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userRole]);

  const handleRegAction = async (reg: RegistrationRecord, status: RegistrationStatus) => {
    try {
      await dbService.updateRegistrationStatus(reg.id, status, reg.studentId, reg.courseIds);
      toast.success(`Registration ${status}`);
      setPendingRegs(prev => prev.filter(r => r.id !== reg.id));
    } catch (error) {
      toast.error("Action failed");
    }
  };

  const handleUserAction = async (user: Student, status: 'active' | 'rejected') => {
    try {
      await dbService.updateUserStatus(user.id, status);
      toast.success(`User ${status === 'active' ? 'approved' : 'rejected'}`);
      setPendingUsers(prev => prev.filter(u => u.id !== user.id));
    } catch (error) {
      toast.error("Action failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">
          {userRole === 'admin' ? 'System Administration' : 'Coordinator Dashboard'}
        </h2>
        
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {userRole === 'admin' && (
            <button
              onClick={() => setView('users')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${view === 'users' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'}`}
            >
              <Users size={14} /> User Approvals ({pendingUsers.length})
            </button>
          )}
          <button
            onClick={() => setView('registrations')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${view === 'registrations' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'}`}
          >
            <ClipboardCheck size={14} /> Course Registrations ({pendingRegs.length})
          </button>
          {userRole === 'admin' && (
            <button
              onClick={() => setView('courses')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${view === 'courses' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'}`}
            >
              <Book size={14} /> Course Catalog
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        </div>
      ) : view === 'users' ? (
        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {pendingUsers.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                <Users className="mx-auto text-slate-200 mb-4" size={48} />
                <p className="text-slate-500 font-medium">No pending user approvals</p>
              </div>
            ) : (
              pendingUsers.map((user) => (
                <motion.div
                  key={user.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center font-bold">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{user.name}</h4>
                      <p className="text-xs text-slate-500">{user.email} • <span className="capitalize">{user.role}</span></p>
                      <p className="text-[10px] text-brand-600 font-bold uppercase mt-1">{user.major}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUserAction(user, 'rejected')}
                      className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <X size={20} />
                    </button>
                    <button
                      onClick={() => handleUserAction(user, 'active')}
                      className="bg-brand-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-700 transition-all flex items-center gap-2"
                    >
                      <Check size={20} /> Approve User
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      ) : view === 'courses' ? (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-900">Manage Course Catalog</h3>
            <button 
              onClick={() => setIsAddingCourse(true)}
              className="bg-brand-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-brand-700 transition-all flex items-center gap-2"
            >
              <Plus size={14} /> Add New Course
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                  <th className="px-6 py-4">Code</th>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Prerequisites</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allCourses.map((course) => (
                  <tr key={course.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-brand-600 text-sm">{course.code}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{course.title}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {course.prerequisites.length > 0 ? (
                          course.prerequisites.map(p => (
                            <span key={p} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">{p}</span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        {course.enrolled}/{course.capacity} Full
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          onClick={() => {
                            setEditingCourse(course);
                            setNewPrereqs(course.prerequisites.join(', '));
                          }}
                          className="text-brand-600 hover:text-brand-700 text-xs font-bold underline underline-offset-4"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteCourse(course.id)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete Course"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence mode="popLayout">
            {pendingRegs.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                <ShieldCheck className="mx-auto text-slate-200 mb-4" size={48} />
                <p className="text-slate-500 font-medium">No pending registrations</p>
              </div>
            ) : (
              pendingRegs.map((reg) => (
                <motion.div
                  key={reg.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-brand-300 transition-all"
                >
                  <div className="flex items-center gap-6">
                    <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                      <User size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{reg.studentName}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-2">
                        <Book size={12} /> {reg.courseIds.length} Courses • {reg.totalCredits} Units • Submitted {new Date(reg.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedRegForDetails(reg)}
                      className="p-3 text-slate-400 hover:bg-slate-50 hover:text-brand-600 rounded-xl transition-all"
                      title="View Details"
                    >
                      <Eye size={20} />
                    </button>
                    <button
                      onClick={() => handleRegAction(reg, 'rejected')}
                      className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      title="Reject"
                    >
                      <X size={20} />
                    </button>
                    <button
                      onClick={() => handleRegAction(reg, 'approved')}
                      className="bg-brand-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-700 shadow-lg shadow-brand-100 transition-all flex items-center gap-2"
                    >
                      <Check size={20} /> Approve
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Prerequisite Edit Modal */}
      <AnimatePresence>
        {editingCourse && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingCourse(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-6"
            >
              <div>
                <h3 className="text-xl font-bold text-slate-900">Edit Prerequisites</h3>
                <p className="text-sm text-slate-500">{editingCourse.code}: {editingCourse.title}</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-400">Prerequisite Codes (Comma separated)</label>
                <input 
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  value={newPrereqs}
                  onChange={(e) => setNewPrereqs(e.target.value)}
                  placeholder="e.g. CS101, MATH101"
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setEditingCourse(null)}
                  className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdatePrereqs}
                  className="flex-1 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-100 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Course Modal */}
      <AnimatePresence>
        {isAddingCourse && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingCourse(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div>
                <h3 className="text-xl font-bold text-slate-900">Add New Course</h3>
                <p className="text-sm text-slate-500">Enter course details to add to catalog</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Course Code</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                    value={newCourse.code}
                    onChange={(e) => setNewCourse({...newCourse, code: e.target.value.toUpperCase()})}
                    placeholder="e.g. CS101"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Credits</label>
                  <input 
                    type="number"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                    value={newCourse.credits}
                    onChange={(e) => setNewCourse({...newCourse, credits: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-400">Course Title</label>
                <input 
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  value={newCourse.title}
                  onChange={(e) => setNewCourse({...newCourse, title: e.target.value})}
                  placeholder="e.g. Introduction to Computer Science"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Level</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                    value={newCourse.level}
                    onChange={(e) => setNewCourse({...newCourse, level: e.target.value})}
                  >
                    <option value="100">100 Level</option>
                    <option value="200">200 Level</option>
                    <option value="300">300 Level</option>
                    <option value="400">400 Level</option>
                    <option value="500">500 Level</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Type</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                    value={newCourse.type}
                    onChange={(e) => setNewCourse({...newCourse, type: e.target.value as any})}
                  >
                    <option value="core">Core</option>
                    <option value="elective">Elective</option>
                    <option value="general">General</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-400">Capacity</label>
                <input 
                  type="number"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                  value={newCourse.capacity}
                  onChange={(e) => setNewCourse({...newCourse, capacity: parseInt(e.target.value)})}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setIsAddingCourse(false)}
                  className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddCourse}
                  className="flex-1 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 shadow-lg shadow-brand-100 transition-all"
                >
                  Create Course
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Registration Details Modal */}
      <AnimatePresence>
        {selectedRegForDetails && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRegForDetails(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">Registration Details</h3>
                    <p className="text-slate-500 font-medium">{selectedRegForDetails.studentName} • {selectedRegForDetails.session}</p>
                  </div>
                  <button 
                    onClick={() => setSelectedRegForDetails(null)}
                    className="p-2 hover:bg-white rounded-full transition-colors text-slate-400"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div className="space-y-6">
                  <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <span>Selected Courses</span>
                    <span>{selectedRegForDetails.totalCredits} Units Total</span>
                  </div>
                  
                  <div className="space-y-3">
                    {selectedRegForDetails.courseIds.map(id => {
                      const course = allCourses.find(c => c.id === id);
                      return course ? (
                        <div key={id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div>
                            <span className="text-xs font-bold text-brand-600 block">{course.code}</span>
                            <span className="text-sm font-semibold text-slate-900">{course.title}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-500 block">{course.credits} Units</span>
                            <span className="text-[10px] text-slate-400 uppercase font-bold">{course.type}</span>
                          </div>
                        </div>
                      ) : (
                        <div key={id} className="p-4 bg-red-50 text-red-500 text-xs rounded-xl">
                          Course ID {id} not found in catalog
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4">
                <button
                  onClick={() => {
                    handleRegAction(selectedRegForDetails, 'rejected');
                    setSelectedRegForDetails(null);
                  }}
                  className="flex-1 py-4 text-red-600 font-bold hover:bg-red-50 rounded-2xl transition-all border border-red-100"
                >
                  Reject Registration
                </button>
                <button
                  onClick={() => {
                    handleRegAction(selectedRegForDetails, 'approved');
                    setSelectedRegForDetails(null);
                  }}
                  className="flex-2 py-4 bg-brand-600 text-white font-bold rounded-2xl hover:bg-brand-700 shadow-xl shadow-brand-100 transition-all flex items-center justify-center gap-2"
                >
                  <Check size={20} /> Approve Registration
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
