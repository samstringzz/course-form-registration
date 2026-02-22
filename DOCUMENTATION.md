# EduReg: Secure Academic Registration System
## Project Documentation

### 1. Overview
EduReg is a modern, secure, and intuitive academic registration platform designed to streamline the course enrollment process for students and administrators. Built with a focus on reliability and user experience, it automates validation rules and provides official documentation generation.

### 2. Core Features

#### Student Experience
- **Secure Authentication**: Integrated with Firebase Authentication for secure login and account management.
- **Profile Management**: Students can maintain their academic details (Faculty, Department, Session, Level).
- **Smart Registration**: 
  - Real-time validation of credit units (Minimum 12, Maximum 24).
  - Level-based course filtering.
  - Prerequisite checking.
- **Official Documentation**: Downloadable PDF Course Forms once registration is submitted or approved.
- **Status Tracking**: Real-time updates on registration approval status.

#### Administrator Experience
- **Centralized Dashboard**: Overview of all student registrations.
- **Approval Workflow**: One-click approval or rejection of student course selections.
- **Student Management**: View detailed student profiles and academic history.

### 3. Technical Stack
- **Framework**: React 19 with TypeScript.
- **Styling**: Tailwind CSS 4 (utilizing modern oklch color spaces).
- **Backend**: Firebase (Firestore for database, Auth for identity).
- **Animations**: Motion (formerly Framer Motion) for smooth UI transitions.
- **PDF Generation**: 
  - `jsPDF`: For PDF document structure.
  - `html2canvas`: For capturing high-fidelity UI snapshots.
- **Icons**: Lucide React.
- **Notifications**: Sonner (Toast notifications).

### 4. System Architecture
The application follows a **Serverless Single Page Application (SPA)** architecture:
- **Frontend**: Handles all UI logic, state management, and PDF generation.
- **Database (Firestore)**: Stores student profiles, course catalogs, and registration records.
- **Validation Layer**: A dedicated service (`validationService.ts`) ensures all academic rules are met before submission.

### 5. Key Technical Implementations

#### Robust PDF Generation
The system includes a custom "Style Sanitization Layer" to handle modern CSS features. Since `html2canvas` does not support `oklch` or `oklab` colors (default in Tailwind 4), the system:
1. Clones the document.
2. Resolves all computed colors to standard RGB.
3. Strips modern CSS variables.
4. Injects a safe, high-fidelity stylesheet for the PDF engine.

#### Academic Validation Logic
The `validationService.ts` handles:
- **Credit Load**: Ensures students stay within the 12-24 credit limit.
- **Level Restrictions**: Prevents students from registering for courses above their current level.
- **Duplicate Prevention**: Ensures a student cannot register for the same course twice in a session.

### 6. Setup & Configuration

#### Firebase Setup
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com).
2. Enable **Email/Password Authentication**.
3. Create a **Firestore Database**.
4. Copy your web app configuration into `src/firebaseConfig.ts`.

#### Firestore Collections
- `students`: Stores user profile data.
- `courses`: Stores the academic course catalog.
- `registrations`: Stores student enrollment records.

### 7. User Guide

#### For Students
1. **Sign Up/Login**: Create an account using your institutional email.
2. **Complete Profile**: Set your Faculty and Department.
3. **Select Courses**: Browse available courses and add them to your list. The system will track your total credits.
4. **Submit**: Once satisfied, submit for approval.
5. **Download**: Use the "Download PDF" button to get your official form.

#### For Administrators
1. **Access Dashboard**: View pending registrations.
2. **Review**: Click on a student to see their selected courses.
3. **Approve**: Use the "Approve" button to finalize the student's semester.

---
*Documentation generated on February 22, 2026.*
