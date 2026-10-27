import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { Navbar } from './components/Navbar.jsx';
import { Footer } from './components/Footer.jsx';

// Pages
import { LandingPage } from './pages/LandingPage.jsx';
import { CompaniesPage } from './pages/CompaniesPage.jsx';
import { CompanyDetailPage } from './pages/CompanyDetailPage.jsx';
import { QuestionsPage } from './pages/QuestionsPage.jsx';
import { QuestionDetailPage } from './pages/QuestionDetailPage.jsx';
import { PlanGeneratorPage } from './pages/PlanGeneratorPage.jsx';
import { PlanDetailPage } from './pages/PlanDetailPage.jsx';
import { RevisionQueuePage } from './pages/RevisionQueuePage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';

function NotFoundPage() {
  return (
    <div className="main-content" style={{ textAlign: 'center', padding: '6rem 1.5rem' }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
        404
      </h1>
      <h2 style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>Page Not Found</h2>
      <p style={{ maxWidth: '480px', margin: '0 auto 2rem', color: 'var(--text-secondary)' }}>
        The page you are looking for does not exist or may have been moved.
      </p>
      <Link to="/" className="btn btn-primary">
        Return Home
      </Link>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="app-container">
          <Navbar />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/companies" element={<CompaniesPage />} />
            <Route path="/companies/:slug" element={<CompanyDetailPage />} />
            <Route path="/questions" element={<QuestionsPage />} />
            <Route path="/explore" element={<QuestionsPage />} />
            <Route path="/questions/:id" element={<QuestionDetailPage />} />
            <Route path="/plans" element={<PlanGeneratorPage />} />
            <Route path="/plans/:id" element={<PlanDetailPage />} />
            <Route path="/revision" element={<RevisionQueuePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}
export default App;
