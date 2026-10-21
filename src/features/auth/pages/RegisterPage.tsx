import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    // MUETY authentication supports only Phone OTP and Google sign-in/registration
    navigate('/login' + location.search, { replace: true });
  }, [location.search, navigate]);

  const handleRegister = () => {
    if (!acceptedTerms) {
      return;
    }
  };

  return (
    <div style={{ display: 'none' }}>
      <Link to="/terms-conditions">Terms & Conditions</Link>
      <Link to="/privacy-policy">Privacy Policy</Link>
    </div>
  );
};
