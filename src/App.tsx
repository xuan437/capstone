import React, { useState, useEffect } from "react";
import { supabase } from "./supabase";
import "./App.css";

import { User, Student, Page } from "./types";

import Header from "./components/Header";


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

const AppShell: React.FC = () => {
  const [page, setPage] = useState<Page>("login");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    setCurrentUser(null);
    setPage("login");
    setSelectedStudentId(null);
    setSelectedCandidateId(null);
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

  return (
    <div className="app-container" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {page !== "login" && <Header currentUser={currentUser} handleLogout={handleLogout} />}

      {page === "login" && <AuthForm setPage={setPage} setCurrentUser={setCurrentUser} />}
      {page === "admin_setup" && (
        <AdminSetup
          setPage={setPage}
          onViewCandidate={(id) => {
            setSelectedCandidateId(id);
            setPage("candidate_profile");
          }}
        />
      )}
      {page === "admin_voters" && (
        <AdminVotersList
          setPage={setPage}
          onViewProfile={(id) => {
            setSelectedStudentId(id);
            setPage("student_profile");
          }}
        />
      )}
      {page === "ballot" && currentUser && !("isAdmin" in currentUser) && (
        <BallotPage setPage={setPage} currentUser={currentUser as Student} />
      )}
      {page === "confirm" && <ConfirmationScreen handleLogout={handleLogout} />}
      {page === "results" && <ResultsDashboard currentUser={currentUser} setPage={setPage} />}
      {page === "student_profile" && selectedStudentId && (
        <StudentProfile setPage={setPage} studentId={selectedStudentId} />
      )}
      {page === "candidate_profile" && selectedCandidateId && (
        <CandidateProfile setPage={setPage} candidateId={selectedCandidateId} />
      )}
      {page === "download_results" && <DownloadResults setPage={setPage} />}

      {page === "admin_register" && <AdminRegister setPage={setPage} />}


    </div>
  );
};

const App: React.FC = () => {
  return <AppShell />;
};

export default App;
