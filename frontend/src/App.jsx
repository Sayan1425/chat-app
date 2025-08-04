import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from "./pages/user-login/Login";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


function App() {
  return (
    <>
      <ToastContainer position='top-right' autoClose={3000} />
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/user-login" element={<Login />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
