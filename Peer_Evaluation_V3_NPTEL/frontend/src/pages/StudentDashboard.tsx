import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    FiMenu, FiHome, FiUsers, FiCheckCircle, FiUploadCloud, FiUser, FiSun, FiMoon, FiLogOut,
} from 'react-icons/fi';
import { motion } from "framer-motion";
import axios from 'axios';

import ProfileSection from "../components/student/ProfileSection";
import ViewMarks from "../components/student/ViewMarks";
import DashboardOverview from "../components/student/DashboardOverview";
import PeerEvaluationsPending from "../components/student/PeerEvaluationsPending";
import EnrollmentSection from "../components/student/EnrollmentSection";
import CourseExams from "../components/student/CourseExams";

const PORT = import.meta.env.VITE_BACKEND_PORT || 5000;

const lightPalette = {
    'bg-primary': '#FFFBF6', 'bg-secondary': '#FFFAF2',
    'accent-bright-yellow': '#FFD700', 'accent-light-yellow': '#FFECB3', 'accent-pink': '#FF8DA1',
    'accent-lilac': '#C8A2C8', 'accent-purple': '#800080', 'accent-light-purple': '#DDA0DD',
    'sidebar-bg': '#E6E6FA', 'text-dark': '#4B0082', 'text-muted': '#A9A9A9',
    'text-sidebar-dark': '#4B0082', 'border-soft': '#F0E6EF',
    'shadow-light': 'rgba(128, 0, 128, 0.04)', 'shadow-medium': 'rgba(128, 0, 128, 0.08)', 'shadow-strong': 'rgba(128, 0, 128, 0.15)',
    'white': '#FFFFFF'
};

const darkPalette = {
    'bg-primary': '#1A1A2E', 'bg-secondary': '#16213E',
    'accent-bright-yellow': '#FFEB3B', 'accent-light-yellow': '#FFEE58', 'accent-pink': '#EC407A',
    'accent-lilac': '#9C27B0', 'accent-purple': '#6A1B9A', 'accent-light-purple': '#8E24AA',
    'sidebar-bg': '#0F3460', 'text-dark': '#E0E0E0', 'text-muted': '#B0BEC5',
    'text-sidebar-dark': '#E0E0E0', 'border-soft': '#3F51B5',
    'shadow-light': 'rgba(0, 0, 0, 0.2)', 'shadow-medium': 'rgba(0, 0, 0, 0.4)', 'shadow-strong': 'rgba(0, 0, 0, 0.6)',
    'white': '#FFFFFF'
};

const getColors = (isDarkMode: boolean) => isDarkMode ? darkPalette : lightPalette;

const StudentDashboard = () => {
    const [activeMenu, setActiveMenu] = useState('dashboard');
    const [darkMode, setDarkMode] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);
    const [showProfilePopup, setShowProfilePopup] = useState(false);
    const [profileData, setProfileData] = useState({ name: "", email: "", role: "", isTA: false });
    const [studentCourses, setStudentCourses] = useState<{ _id: string; name: string; code: string }[]>([]);
    const [selectedExamCourseId, setSelectedExamCourseId] = useState<string>("");

    const navigate = useNavigate();
    const token = localStorage.getItem("token");
    const currentPalette = getColors(darkMode);
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("userId");
        localStorage.removeItem("userName");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("isTA");
        setShowProfilePopup(false);
        navigate("/login");
    };

    useEffect(() => {
        axios
            .get(`http://localhost:${PORT}/api/student/profile`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then(res => setProfileData(res.data))
            .catch(console.error);

        axios
            .get(`http://localhost:${PORT}/api/student/all-courses`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then(res => setStudentCourses(res.data.courses || []))
            .catch(() => setStudentCourses([]));
    }, [token]);



    const renderContent = () => {
        switch (activeMenu) {
            case 'dashboard': return <DashboardOverview darkMode={darkMode} />;
            case 'enrollment': return <EnrollmentSection darkMode={darkMode} />;
            case 'peerEvaluation': return <PeerEvaluationsPending darkMode={darkMode} />;
            case 'exams':
                return selectedExamCourseId ? (
                    <CourseExams
                        courseId={selectedExamCourseId}
                        darkMode={darkMode}
                        onBack={() => setSelectedExamCourseId("")}
                    />
                ) : (
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold">Select a Course for Exams</h2>
                        {studentCourses.length === 0 ? (
                            <p style={{ color: currentPalette['text-muted'] }}>No courses available.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {studentCourses.map((course) => (
                                    <button
                                        key={course._id}
                                        onClick={() => setSelectedExamCourseId(course._id)}
                                        className="text-left p-4 rounded-xl border shadow hover:shadow-md"
                                        style={{
                                            backgroundColor: darkMode ? "#1f2937" : "#ffffff",
                                            borderColor: darkMode ? "#374151" : "#e5e7eb",
                                        }}
                                    >
                                        <p className="font-semibold">{course.name}</p>
                                        <p className="text-sm" style={{ color: currentPalette['text-muted'] }}>{course.code}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                );
            case 'viewMarks': return <ViewMarks darkMode={darkMode} />;
            case 'profile': return <ProfileSection darkMode={darkMode} />;
            default: return <p className="text-center" style={{ color: currentPalette['text-muted'] }}>Select a menu</p>;
        }
    };

    return (
        <div className="flex h-screen overflow-hidden" style={{ backgroundColor: currentPalette['bg-primary'] }}>
            {/* Sidebar */}
            <motion.div className={`flex flex-col justify-between py-6 px-4 rounded-r-3xl shadow-xl z-20 overflow-hidden ${showSidebar ? 'w-64' : 'w-20'}`} style={{ backgroundColor: currentPalette['sidebar-bg'] }}>
                <button onClick={() => setShowSidebar(!showSidebar)} className="self-start mb-6 p-2 rounded-full border-2" style={{ borderColor: currentPalette['accent-lilac'] }}>
                    <FiMenu className="text-2xl" style={{ color: currentPalette['text-sidebar-dark'] }} />
                </button>
                <div className="flex-1 flex flex-col items-center">
                    <h2 className={`font-bold mb-10 mt-4 ${showSidebar ? 'text-2xl' : 'text-lg'}`} style={{ color: currentPalette['text-sidebar-dark'] }}>
                        {showSidebar ? 'Student Panel' : 'SP'}
                    </h2>
                    <ul className="space-y-3 w-full">
                        {/* ...existing code... */}
                        {[
                            { key: 'dashboard', icon: FiHome, label: 'Dashboard' },
                            { key: 'enrollment', icon: FiUploadCloud, label: 'Enrollment' },
                            { key: 'exams', icon: FiCheckCircle, label: 'Exams' },
                            { key: 'peerEvaluation', icon: FiUsers, label: 'Peer Evaluation' },
                            { key: 'viewMarks', icon: FiCheckCircle, label: 'View Marks' },
                            { key: 'profile', icon: FiUser, label: 'Profile' },
                        ].map(({ key, icon: Icon, label }) => (
                            <li key={key} onClick={() => { setActiveMenu(key); }}
                                className="cursor-pointer flex items-center px-4 py-2 rounded-lg transition-all duration-200"
                                style={{ color: currentPalette['text-sidebar-dark'] }}>
                                <Icon className={`${showSidebar ? 'mr-3 text-xl' : 'text-3xl'}`} />
                                {showSidebar && <span className="font-medium whitespace-nowrap">{label}</span>}
                            </li>
                        ))}
                    </ul>
                </div>
            </motion.div>

            {/* Main Content + Top Bar */}
            <div className="flex-1 overflow-y-auto p-6 relative">
                {/* Top Right Profile Icon and TA Dashboard Button */}
                <div className="absolute top-6 right-6 flex items-center gap-4 z-40">
                    {/* Profile Icon */}
                    <div className="relative">
                        <button
                            onClick={() => setShowProfilePopup((p: boolean) => !p)}
                            className="h-12 w-12 rounded-full flex items-center justify-center shadow-md border-2"
                            style={{ backgroundColor: currentPalette['accent-lilac'], color: currentPalette.white, borderColor: currentPalette['accent-purple'] }}
                            title="Profile"
                        >
                            <FiUser className="w-6 h-6" />
                        </button>
                        {showProfilePopup && (
                            <div
                                className="absolute right-0 mt-3 w-80 p-4 rounded-b-3xl shadow-lg z-50"
                                style={{
                                    backgroundColor: currentPalette['bg-secondary'],
                                    borderTopLeftRadius: 0,
                                    borderTopRightRadius: 0,
                                    boxShadow: `0 4px 14px ${currentPalette['shadow-medium']}`,
                                    color: currentPalette['text-dark'],
                                }}
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <h2 className="text-xl font-bold">Profile Info</h2>
                                    <button
                                        onClick={() => setShowProfilePopup(false)}
                                        className="text-xl px-2 py-1 rounded-full"
                                        style={{ backgroundColor: currentPalette['accent-pink'], color: currentPalette.white }}
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="space-y-2 mb-4">
                                    <p><strong>Name:</strong> {profileData.name}</p>
                                    <p><strong>Email:</strong> {profileData.email}</p>
                                    <p><strong>Role:</strong> {profileData.role}</p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => { setActiveMenu('profile'); setShowProfilePopup(false); }}
                                        className="px-4 py-2 rounded-lg font-semibold shadow-md"
                                        style={{ backgroundColor: currentPalette['accent-lilac'], color: currentPalette['accent-purple'] }}
                                    >
                                        Go to Profile
                                    </button>
                                    {profileData.isTA && (
                                        <button
                                            onClick={() => { navigate('/ta'); setShowProfilePopup(false); }}
                                            className="px-4 py-2 rounded-lg font-semibold shadow-md"
                                            style={{ backgroundColor: currentPalette['accent-purple'], color: currentPalette.white }}
                                        >
                                            Go to TA Dashboard
                                        </button>
                                    )}
                                    <button
                                        onClick={handleLogout}
                                        className="px-4 py-2 rounded-lg font-semibold shadow-md flex items-center justify-center gap-2"
                                        style={{ backgroundColor: currentPalette['accent-pink'], color: currentPalette.white }}
                                    >
                                        <FiLogOut />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="w-full max-w-7xl mx-auto">
                    {renderContent()}
                </div>
            </div>



            {/* Dark Mode Toggle */}
            <div className="fixed bottom-6 right-6 z-50">
                <button onClick={() => setDarkMode(!darkMode)} className="h-12 w-12 rounded-full flex items-center justify-center shadow-md"
                    style={{ backgroundColor: darkMode ? currentPalette['accent-purple'] : currentPalette['accent-lilac'], color: 'white' }}>
                    {darkMode ? <FiMoon className="w-6 h-6" /> : <FiSun className="w-6 h-6" />}
                </button>
            </div>
        </div>
    );
};

export default StudentDashboard;
