import React, { useState, useMemo } from 'react';
import { Course, Student, RegistrationStatus, RegistrationRecord } from '../types';
import { 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Save, 
  Send, 
  Trash2,
  BookOpen,
  ChevronRight,
  Clock,
  Printer,
  FileText,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { validateRegistration } from '../validationService';
import { dbService } from '../dbService';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface RegistrationViewProps {
  student: Student;
  courses: Course[];
  onUpdateStudent: (student: Student) => void;
}

export const RegistrationView: React.FC<RegistrationViewProps> = ({ student, courses, onUpdateStudent }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeRegistration, setActiveRegistration] = useState<RegistrationRecord | null>(null);
  const [fetchingReg, setFetchingReg] = useState(true);
  const formRef = React.useRef<HTMLDivElement>(null);

  const isProfileIncomplete = !student.faculty || !student.session || student.faculty === 'General Studies';

  const fetchCurrentRegistration = async () => {
    try {
      setFetchingReg(true);
      const reg = await dbService.getStudentRegistration(student.id);
      setActiveRegistration(reg);
      if (reg && reg.status === 'draft') {
        setSelectedIds(reg.courseIds);
      }
    } catch (error) {
      console.error("Failed to fetch registration:", error);
    } finally {
      setFetchingReg(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!formRef.current) return;
    
    setLoading(true);
    const toastId = toast.loading("Generating PDF Course Form...");
    
    try {
      // Ensure images and fonts are loaded
      await document.fonts.ready;
      
      const canvas = await html2canvas(formRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: formRef.current.scrollWidth,
        windowHeight: formRef.current.scrollHeight,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('course-form-print');
          if (el) {
            el.style.height = 'auto';
            el.style.width = '800px';
            
            // Fix for html2canvas not supporting modern color functions (oklch, oklab)
            // We traverse all elements in the clone and convert their computed colors (which the browser
            // resolves to rgb/rgba) into inline styles that html2canvas can safely parse.
            const allElements = el.getElementsByTagName('*');
            for (let i = 0; i < allElements.length; i++) {
              const element = allElements[i] as HTMLElement;
              const style = window.getComputedStyle(element);
              
              // Force the resolved (computed) color onto the inline style.
              // Browsers resolve oklch/oklab to rgb/rgba in computed styles.
              // We only apply if it's not already an oklch/oklab string (safety check)
              let resolvedColor = style.color;
              let resolvedBg = style.backgroundColor;
              let resolvedBorder = style.borderColor;

              // If the browser still returns oklch/oklab in computed styles, 
              // we force a fallback to prevent html2canvas from crashing.
              if (resolvedColor.includes('okl')) resolvedColor = '#0f172a';
              if (resolvedBg.includes('okl')) resolvedBg = '#ffffff';
              if (resolvedBorder.includes('okl')) resolvedBorder = '#e2e8f0';

              element.style.color = resolvedColor;
              if (resolvedBg !== 'transparent' && resolvedBg !== 'rgba(0, 0, 0, 0)') {
                element.style.backgroundColor = resolvedBg;
              }
              element.style.borderColor = resolvedBorder;
              
              // Force standard hex/rgb for common Tailwind variables if they still exist
              element.style.setProperty('--color-brand-600', '#4f46e5');
              element.style.setProperty('--color-emerald-600', '#059669');
              element.style.setProperty('--color-slate-900', '#0f172a');
            }

            // Add a global style override as a secondary safety measure
            const styleTag = clonedDoc.createElement('style');
            styleTag.innerHTML = `
              * {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              :root {
                --color-brand-50: #eef2ff !important;
                --color-brand-100: #e0e7ff !important;
                --color-brand-200: #c7d2fe !important;
                --color-brand-300: #a5b4fc !important;
                --color-brand-400: #818cf8 !important;
                --color-brand-500: #6366f1 !important;
                --color-brand-600: #4f46e5 !important;
                --color-brand-700: #4338ca !important;
                --color-brand-800: #3730a3 !important;
                --color-brand-900: #312e81 !important;
                --color-emerald-50: #ecfdf5 !important;
                --color-emerald-100: #d1fae5 !important;
                --color-emerald-200: #a7f3d0 !important;
                --color-emerald-300: #6ee7b7 !important;
                --color-emerald-400: #34d399 !important;
                --color-emerald-500: #10b981 !important;
                --color-emerald-600: #059669 !important;
                --color-emerald-700: #047857 !important;
                --color-emerald-800: #065f46 !important;
                --color-emerald-900: #064e3b !important;
                --color-slate-50: #f8fafc !important;
                --color-slate-100: #f1f5f9 !important;
                --color-slate-200: #e2e8f0 !important;
                --color-slate-300: #cbd5e1 !important;
                --color-slate-400: #94a3b8 !important;
                --color-slate-500: #64748b !important;
                --color-slate-600: #475569 !important;
                --color-slate-700: #334155 !important;
                --color-slate-800: #1e293b !important;
                --color-slate-900: #0f172a !important;
              }
              /* Force standard colors on common classes to avoid oklab/oklch parsing */
              .text-brand-600 { color: #4f46e5 !important; }
              .bg-brand-50 { background-color: #eef2ff !important; }
              .bg-brand-100 { background-color: #e0e7ff !important; }
              .bg-emerald-50 { background-color: #ecfdf5 !important; }
              .text-emerald-600 { color: #059669 !important; }
              .bg-slate-50 { background-color: #f8fafc !important; }
              .border-slate-100 { border-color: #f1f5f9 !important; }
              .border-slate-200 { border-color: #e2e8f0 !important; }
              .text-slate-900 { color: #0f172a !important; }
              .text-slate-500 { color: #64748b !important; }
            `;
            clonedDoc.head.appendChild(styleTag);
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      
      const finalWidth = imgWidth * ratio;
      const finalHeight = imgHeight * ratio;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, finalWidth, finalHeight, undefined, 'FAST');
      pdf.save(`Course_Form_${student.name.replace(/\s+/g, '_')}_${activeRegistration?.session.replace(/\//g, '-')}.pdf`);
      toast.success("Course form downloaded successfully", { id: toastId });
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("Failed to generate PDF. Try again or use the Print option.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchCurrentRegistration();
  }, [student.id]);

  const selectedCourses = useMemo(() => 
    courses.filter(c => selectedIds.includes(c.id)),
  [courses, selectedIds]);

  const totalCredits = useMemo(() => 
    selectedCourses.reduce((acc, c) => acc + c.credits, 0),
  [selectedCourses]);

  const validation = useMemo(() => 
    validateRegistration(student, selectedCourses, courses),
  [student, selectedCourses, courses]);

  if (fetchingReg) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (activeRegistration && (activeRegistration.status === 'pending' || activeRegistration.status === 'approved')) {
    const isApproved = activeRegistration.status === 'approved';
    const regCourses = courses.filter(c => activeRegistration.courseIds.includes(c.id));

    return (
      <div className="space-y-8">
        {/* Registration Status Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-8 rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-6 ${
            isApproved ? 'bg-emerald-50 border-emerald-200' : 'bg-brand-50 border-brand-200'
          }`}
        >
          <div className="flex items-center gap-6">
            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${
              isApproved ? 'bg-emerald-100 text-emerald-600' : 'bg-brand-100 text-brand-600'
            }`}>
              {isApproved ? <CheckCircle2 size={32} /> : <Clock size={32} />}
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${isApproved ? 'text-emerald-900' : 'text-brand-900'}`}>
                {isApproved ? 'Registration Approved' : 'Registration Pending'}
              </h2>
              <p className={isApproved ? 'text-emerald-700' : 'text-brand-700'}>
                {isApproved 
                  ? 'Your course registration for this semester has been finalized.' 
                  : 'Your registration has been submitted and is awaiting coordinator approval.'}
              </p>
            </div>
          </div>
          {isApproved && (
            <div className="flex gap-3">
              <button 
                onClick={() => window.print()}
                className="bg-white/10 text-white px-4 py-3 rounded-xl font-bold hover:bg-white/20 transition-all flex items-center gap-2 border border-white/10"
              >
                <Printer size={18} /> Print
              </button>
              <button 
                onClick={handleDownloadPDF}
                disabled={loading}
                className="bg-white text-emerald-600 px-6 py-3 rounded-xl font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2 border border-emerald-100 disabled:opacity-50"
              >
                <Download size={18} /> Download PDF
              </button>
            </div>
          )}
        </motion.div>

        {/* Registration Details (Course Form Style) */}
        <section 
          ref={formRef} 
          id="course-form-print"
          className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Official Course Form</h3>
              <p className="text-sm text-slate-500">Session: {activeRegistration.session} • Semester: {activeRegistration.semester}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-400">Total Units Approved</p>
              <p className="text-2xl font-bold text-brand-600">{activeRegistration.totalCredits}</p>
            </div>
          </div>

          <div className="p-0">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 bg-slate-50/30">
                  <th className="px-8 py-4 w-16">S/N</th>
                  <th className="px-8 py-4">Course Code</th>
                  <th className="px-8 py-4">Course Title</th>
                  <th className="px-8 py-4">Units</th>
                  <th className="px-8 py-4 text-right">Type</th>
                </tr>
              </thead>
              <tbody>
                {regCourses.map((course, index) => (
                  <tr key={course.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-4 text-sm text-slate-500">{index + 1}</td>
                    <td className="px-8 py-4 font-bold text-brand-600 text-sm">{course.code}</td>
                    <td className="px-8 py-4 text-sm font-medium text-slate-900">{course.title}</td>
                    <td className="px-8 py-4 text-sm font-bold text-slate-900">{course.credits}</td>
                    <td className="px-8 py-4 text-right">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        course.type === 'core' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {course.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-white rounded-full border border-slate-200 flex items-center justify-center text-slate-400">
                <FileText size={20} />
              </div>
              <p className="text-xs text-slate-500 italic">
                This is an electronically generated document. No signature required.
              </p>
            </div>
            {!isApproved && (
              <p className="text-xs font-bold text-brand-600 animate-pulse">
                Awaiting Coordinator Signature...
              </p>
            )}
          </div>
        </section>
      </div>
    );
  }

  const toggleCourse = (courseId: string) => {
    setSelectedIds(prev => 
      prev.includes(courseId) 
        ? prev.filter(id => id !== courseId) 
        : [...prev, courseId]
    );
  };

  const handleAction = async (status: RegistrationStatus) => {
    if (selectedIds.length === 0) {
      toast.error("Please select at least one course");
      return;
    }

    if (status === 'pending' && !validation.isValid) {
      validation.errors.forEach(err => toast.error(err));
      return;
    }

    setLoading(true);
    try {
      await dbService.submitRegistration(student, selectedIds, totalCredits, status);
      toast.success(status === 'draft' ? "Draft saved successfully" : "Registration submitted for approval");
      await fetchCurrentRegistration();
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Action failed. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {isProfileIncomplete && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <Info size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">Incomplete Academic Profile</p>
              <p className="text-xs text-amber-700">Please update your Faculty and Session details before submitting registration.</p>
            </div>
          </div>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('switchTab', { detail: 'profile' }))}
            className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 transition-all"
          >
            Update Profile
          </button>
        </motion.div>
      )}

      {/* Student Info Card */}
      <section className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center text-3xl font-bold">
              {student.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{student.name}</h2>
              <p className="text-slate-500 font-medium">{student.major} • Level {student.level}</p>
              <div className="flex gap-2 mt-2">
                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {student.faculty}
                </span>
                <span className="px-3 py-1 bg-brand-50 text-brand-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  Session: {student.session}
                </span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-8 px-8 border-l border-slate-100">
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Current GPA</p>
              <p className="text-2xl font-bold text-slate-900">{student.gpa.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Matric No.</p>
              <p className="text-sm font-bold text-slate-900">{student.id.slice(-8).toUpperCase()}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Course Selection Table */}
      <section className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <BookOpen size={20} className="text-brand-600" />
            Available Courses
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="w-3 h-3 rounded-full bg-brand-500" /> Core
              <span className="w-3 h-3 rounded-full bg-slate-300" /> Elective
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                <th className="px-6 py-4 w-16 text-center">Select</th>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Course Title</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Units</th>
                <th className="px-6 py-4">Schedule</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => {
                const isSelected = selectedIds.includes(course.id);
                const isCore = course.type === 'core';
                
                return (
                  <tr 
                    key={course.id}
                    onClick={() => toggleCourse(course.id)}
                    className={`group cursor-pointer transition-colors ${isSelected ? 'bg-brand-50/50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-6 py-4 text-center">
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-brand-600 border-brand-600 text-white' : 'border-slate-200 group-hover:border-brand-300'}`}>
                        {isSelected && <CheckCircle2 size={14} />}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-brand-600 text-sm">{course.code}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 text-sm">{course.title}</p>
                      <p className="text-[10px] text-slate-500">{course.instructor}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${isCore ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'}`}>
                        {course.type || 'Elective'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 text-sm">{course.credits}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {course.schedule.days.join('')} • {course.schedule.startTime}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer Controls */}
      <section className="sticky bottom-6 bg-slate-900 rounded-3xl p-6 shadow-2xl text-white flex flex-col md:flex-row items-center justify-between gap-6 border border-white/10">
        <div className="flex items-center gap-8">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-slate-400">Total Units</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${totalCredits > student.maxCredits ? 'text-red-400' : 'text-white'}`}>
                {totalCredits}
              </span>
              <span className="text-slate-500 text-sm">/ {student.maxCredits} Max</span>
            </div>
          </div>
          
          <div className="h-10 w-px bg-white/10 hidden md:block" />

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {validation.isValid ? (
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 size={14} /> Ready to Submit
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
                  <AlertCircle size={14} /> {validation.errors.length} Issues Found
                </div>
              )}
            </div>
            {validation.warnings.length > 0 && (
              <p className="text-[10px] text-slate-400 italic">
                {validation.warnings[0]}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => handleAction('draft')}
            disabled={loading || selectedIds.length === 0}
            className="flex-1 md:flex-none px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            <Save size={18} /> Save Draft
          </button>
          <button 
            onClick={() => handleAction('pending')}
            disabled={loading || selectedIds.length === 0}
            className="flex-1 md:flex-none px-8 py-3 bg-brand-600 hover:bg-brand-700 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-900/50"
          >
            {loading ? 'Submitting...' : 'Submit Registration'}
            {!loading && <Send size={18} />}
          </button>
        </div>
      </section>

      {/* Validation Messages Overlay */}
      <AnimatePresence>
        {!validation.isValid && selectedIds.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3"
          >
            <AlertCircle className="text-red-500 shrink-0" size={20} />
            <div className="space-y-1">
              <p className="text-sm font-bold text-red-900">Validation Errors</p>
              <ul className="text-xs text-red-700 list-disc list-inside space-y-1">
                {validation.errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
