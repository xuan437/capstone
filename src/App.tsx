import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";
import "./App.css";

import { User, Student, Page } from "./types";
import { ThemeProvider } from "./context/ThemeContext";

import AuthForm from "./pages/AuthForm";
import AdminSetup from "./pages/AdminSetup";
import AdminVotersList from "./pages/AdminVotersList";
import BallotPage from "./pages/BallotPage";
import ConfirmationScreen from "./pages/ConfirmationScreen";
import ResultsDashboard from "./pages/ResultsDashboard";
import StudentProfile from "./pages/StudentProfile";
import CandidateProfile from "./pages/CandidateProfile";
import DownloadResults from "./pages/DownloadResults";
import AdminRegister from "./pages/AdminRegister";
import AdminAddCandidate from "./pages/AdminAddCandidate";
import AdminEditCandidate from "./pages/AdminEditCandidate";
import AdminElectionSettings from "./pages/AdminElectionSettings";
import { AdminAuditLogs } from "./pages/AdminAuditLogs";
import PrivacyModal from "./components/PrivacyModal";
import AdminLayout from "./components/AdminLayout";
import VoterLayout from "./components/VoterLayout";

const AppShell: React.FC = () => {
  const [page, setPage] = useState<Page>("login");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAgreedPrivacy, setHasAgreedPrivacy] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    setCurrentUser(null);
    setPage("login");
    setSelectedStudentId(null);
    setSelectedCandidateId(null);
    setSearchTerm("");
  };

  const handleNavigate = (nextPage: Page) => {
    if (nextPage === "admin_add_candidate") {
      setSelectedCandidateId(null);
    }
    setPage(nextPage);
  };

  useEffect(() => {
    const initSession = async () => {
      const storedUser = localStorage.getItem("currentUser");
      if (storedUser) {
        const user: User = JSON.parse(storedUser);

        if ("isAdmin" in user && user.isAdmin) {
          setCurrentUser(user);
          setPage("admin_setup");
        } else {
          const { data } = await supabase
            .from("students")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

          if (data) {
            const studentUser: Student = {
              ...data,
              id: String(data.id)
            };
            setCurrentUser(studentUser);
            setPage(studentUser.has_voted ? "confirm" : "ballot");
            localStorage.setItem("currentUser", JSON.stringify(studentUser));
          } else {
            handleLogout();
          }
        }
      }
      setLoading(false);
    };

    initSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="flex-center" style={{ height: "100vh" }}>Loading System...</div>;

  const isAdminUser = currentUser && "isAdmin" in currentUser && currentUser.isAdmin;
  const isAdminPage = [
    "admin_setup",
    "admin_voters",
    "admin_register",
    "admin_add_candidate",
    "admin_edit_candidate",
    "admin_election_settings",
    "admin_audit_logs",
    "results",
    "download_results",
    "student_profile",
    "candidate_profile",
  ].includes(page);

  const renderContent = () => {
    switch (page) {
      case "login":
        return <AuthForm setPage={handleNavigate} setCurrentUser={setCurrentUser} />;

      case "admin_setup":
        return (
          <AdminSetup
            setPage={handleNavigate}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onViewCandidate={(id) => {
              setSelectedCandidateId(id);
              handleNavigate("candidate_profile");
            }}
            onEditCandidate={(id) => {
              setSelectedCandidateId(id);
              if (id) {
                handleNavigate("admin_edit_candidate");
              } else {
                handleNavigate("admin_add_candidate");
              }
            }}
          />
        );

      case "admin_voters":
        return (
          <AdminVotersList
            setPage={handleNavigate}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onViewProfile={(id) => {
              setSelectedStudentId(id);
              handleNavigate("student_profile");
            }}
          />
        );

      case "admin_register":
        return <AdminRegister setPage={handleNavigate} />;

      case "admin_add_candidate":
        return <AdminAddCandidate setPage={handleNavigate} />;

      case "admin_edit_candidate":
        return (
          <AdminEditCandidate
            setPage={handleNavigate}
            candidateId={selectedCandidateId}
            onViewCandidate={(id) => {
              setSelectedCandidateId(id);
              handleNavigate("candidate_profile");
            }}
          />
        );

      case "admin_election_settings":
        return <AdminElectionSettings setPage={handleNavigate} />;

      case "admin_audit_logs":
        return <AdminAuditLogs />;

      case "ballot":
        return currentUser && !("isAdmin" in currentUser) ? (
          <BallotPage
            setPage={handleNavigate}
            currentUser={currentUser as Student}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onViewCandidate={(id) => {
              setSelectedCandidateId(id);
              handleNavigate("candidate_profile");
            }}
          />
        ) : null;

      case "confirm":
        return <ConfirmationScreen handleLogout={handleLogout} />;

      case "results":
        return <ResultsDashboard currentUser={currentUser} setPage={handleNavigate} searchTerm={searchTerm} />;

      case "student_profile":
        return selectedStudentId ? <StudentProfile setPage={handleNavigate} studentId={selectedStudentId} /> : null;

      case "candidate_profile":
        return selectedCandidateId ? (
          <CandidateProfile
            setPage={handleNavigate}
            candidateId={selectedCandidateId}
            currentUser={currentUser}
          />
        ) : null;

      case "download_results":
        return <DownloadResults setPage={handleNavigate} />;

      default:
        return null;
    }
  };

  return (
    <div className="app-container" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {!hasAgreedPrivacy && <PrivacyModal onAgree={() => setHasAgreedPrivacy(true)} />}

      {page === "login" ? (
        renderContent()
      ) : isAdminUser && isAdminPage ? (
        <AdminLayout
          activePage={page}
          setPage={handleNavigate}
          currentUser={currentUser}
          handleLogout={handleLogout}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        >
          {renderContent()}
        </AdminLayout>
      ) : (
        <VoterLayout
          activePage={page}
          setPage={handleNavigate}
          currentUser={currentUser}
          handleLogout={handleLogout}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        >
          {renderContent()}
        </VoterLayout>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
};

export default App;
