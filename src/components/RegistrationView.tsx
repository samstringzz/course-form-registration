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
      await document.fonts.ready;
      
      const canvas = await html2canvas(formRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('course-form-print');
          if (!el) return;

          // 1. Fix dimensions
          el.style.height = 'auto';
          el.style.width = '800px';
          el.style.margin = '0';
          el.style.padding = '40px';

          // 2. Resolve ALL colors to RGB to prevent oklch/oklab errors
          // We use a helper to convert any color string to RGB using a temporary canvas
          const colorCanvas = clonedDoc.createElement('canvas');
          colorCanvas.width = 1;
          colorCanvas.height = 1;
          const ctx = colorCanvas.getContext('2d');

          const toRgb = (color: string) => {
            if (!ctx || !color || color === 'transparent' || color.includes('rgba(0, 0, 0, 0)')) return color;
            try {
              ctx.fillStyle = color;
              ctx.fillRect(0, 0, 1, 1);
              const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
              return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
            } catch (e) {
              return color;
            }
          };

          const allElements = el.getElementsByTagName('*');
          for (let i = 0; i < allElements.length; i++) {
            const element = allElements[i] as HTMLElement;
            const style = window.getComputedStyle(element);
            
            // Capture computed styles before we strip the stylesheets
            const color = toRgb(style.color);
            const bg = toRgb(style.backgroundColor);
            const borderTop = toRgb(style.borderTopColor);
            const borderBottom = toRgb(style.borderBottomColor);
            const borderLeft = toRgb(style.borderLeftColor);
            const borderRight = toRgb(style.borderRightColor);

            // Apply as inline styles (which html2canvas prefers and understands)
            element.style.color = color;
            if (bg !== 'transparent' && !bg.includes('rgba(0, 0, 0, 0)')) {
              element.style.backgroundColor = bg;
            }
            element.style.borderTopColor = borderTop;
            element.style.borderBottomColor = borderBottom;
            element.style.borderLeftColor = borderLeft;
            element.style.borderRightColor = borderRight;
            
            // Ensure visibility
            element.style.visibility = 'visible';
            element.style.opacity = '1';
          }

          // 3. CRITICAL: Remove all style/link tags from the clone
          // This prevents html2canvas from attempting to parse the Tailwind v4 CSS 
          // which contains the oklch/oklab functions that cause the crash.
          // We also remove any style attributes that might contain oklch/oklab
          const styles = clonedDoc.getElementsByTagName('style');
          const links = clonedDoc.getElementsByTagName('link');
          while (styles[0]) styles[0].parentNode?.removeChild(styles[0]);
          while (links[0]) links[0].parentNode?.removeChild(links[0]);

          // Clean up any remaining oklch/oklab strings in inline styles
          const all = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < all.length; i++) {
            const el = all[i] as HTMLElement;
            if (el.style.cssText.includes('okl')) {
              el.style.cssText = el.style.cssText.replace(/oklch\([^)]+\)/g, '#4f46e5').replace(/oklab\([^)]+\)/g, '#4f46e5');
            }
          }

          // 4. Add a minimal, safe stylesheet for basic layout
          const safeStyle = clonedDoc.createElement('style');
          safeStyle.innerHTML = `
            #course-form-print { font-family: sans-serif !important; background: white !important; }
            table { width: 100% !important; border-collapse: collapse !important; }
            th, td { padding: 12px !important; text-align: left !important; border-bottom: 1px solid #eee !important; }
            .font-bold { font-weight: bold !important; }
            .text-sm { font-size: 14px !important; }
            .text-xs { font-size: 12px !important; }
            .text-2xl { font-size: 24px !important; }
            .text-xl { font-size: 20px !important; }
          `;
          clonedDoc.head.appendChild(safeStyle);
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
      const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
      
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width * ratio, canvas.height * ratio, undefined, 'FAST');
      pdf.save(`Course_Form_${student.name.replace(/\s+/g, '_')}_${activeRegistration?.session.replace(/\//g, '-')}.pdf`);
      toast.success("Course form downloaded successfully", { id: toastId });
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("PDF generation failed. Please use the 'Print' button and select 'Save as PDF'.", { id: toastId });
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
          <div className="flex gap-3">
            <button 
              onClick={() => window.print()}
              className={`px-4 py-3 rounded-xl font-bold transition-all flex items-center gap-2 border ${
                isApproved 
                  ? 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700' 
                  : 'bg-brand-600 text-white border-brand-500 hover:bg-brand-700'
              }`}
            >
              <Printer size={18} /> Print Form
            </button>
            <button 
              onClick={handleDownloadPDF}
              disabled={loading}
              className={`px-6 py-3 rounded-xl font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2 border disabled:opacity-50 ${
                isApproved
                  ? 'bg-white text-emerald-600 border-emerald-100'
                  : 'bg-white text-brand-600 border-brand-100'
              }`}
            >
              <Download size={18} /> {loading ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
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
                      {course.schedule?.days ? (
                        <>
                          {course.schedule.days.join('')} • {course.schedule.startTime}
                        </>
                      ) : (
                        'No schedule set'
                      )}
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
