import { useEffect, useState } from "react";
import "./App.css";
import { supabase } from "./supabaseClient";
import Login from "./components/Login";
import Register from "./components/Register";
import ForgotPassword from "./components/ForgotPassword";
import Dashboard from "./components/Dashboard";

function App() {
  const [session, setSession] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
  };

  const handleRegisterClick = () => {
    setShowRegister(true);
    setShowForgotPassword(false);
  };

  const handleLoginClick = () => {
    setShowRegister(false);
    setShowForgotPassword(false);
  };

  const handleForgotPassword = () => {
    setShowForgotPassword(true);
    setShowRegister(false);
  };

  if (!session) {
    return (
      <div className="app-container">
        <div className="auth-section">
          <img src="/BullBlink Logo2.png" alt="BullBlink Logo" className="logo" />
          {showRegister ? (
            <Register onLoginClick={handleLoginClick} onSuccess={handleLoginClick} />
          ) : showForgotPassword ? (
            <ForgotPassword onBack={handleLoginClick} />
          ) : (
            <Login
              onRegisterClick={handleRegisterClick}
              onForgotPassword={handleForgotPassword}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <Dashboard user={session.user} />
  );
}

export default App;
