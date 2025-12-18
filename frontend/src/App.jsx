import React, { useState, useEffect } from "react";
import Login from "./Login";
import SelectChatbot from "./SelectChatbot";
import Profile from "./Profile";
import Home from "./Home";
import TranslationViewer from "./TranslationViewer";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Routes, Route, useNavigate } from "react-router-dom";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const storedUser = localStorage.getItem("user");

    if (token) {
      setIsAuthenticated(true);
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    }
  }, []);

  // Fetch translation records when authenticated
  useEffect(() => {
    const fetchRecords = async () => {
      if (!isAuthenticated) return;

      try {
        setLoadingRecords(true);
        const token = localStorage.getItem("authToken");
        const response = await fetch('/api/translation-records', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        const data = await response.json();
        
        if (data.success && data.records) {
          setRecords(data.records);
        }
      } catch (error) {
        console.error('Error fetching translation records:', error);
      } finally {
        setLoadingRecords(false);
      }
    };

    fetchRecords();
  }, [isAuthenticated]);

  const handleLoginSuccess = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    localStorage.setItem("authToken", userData.token);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setRecords([]);
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <>
      <Routes>
        {/* LOGIN PAGE */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Home 
                user={user} 
                onLogout={handleLogout}
                records={records}
                loadingRecords={loadingRecords}
              />
            ) : (
              <Login onLoginSuccess={handleLoginSuccess} />
            )
          }
        />

        {/* TRANSLATION VIEWER PAGE */}
        <Route
          path="/translate/:translationId"
          element={
            isAuthenticated ? (
              <TranslationViewer 
                records={records}
                user={user}
                onLogout={handleLogout}
              />
            ) : (
              <Login onLoginSuccess={handleLoginSuccess} />
            )
          }
        />

        {/* PROFILE PAGE */}
        <Route
          path="/profile"
          element={
            isAuthenticated ? (
              <Profile
                currentUser={user?.user || user}
                onClose={() => navigate(-1)}
              />
            ) : (
              <Login onLoginSuccess={handleLoginSuccess} />
            )
          }
        />
      </Routes>

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </>
  );
};

export default App;