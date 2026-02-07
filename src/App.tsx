import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Dashboard from './pages/Dashboard';
import TransactionsPage from './pages/TransactionsPage';
import AccountsPage from './pages/AccountsPage';
import ReportsPage from './pages/ReportsPage';
import ClientsPage from './pages/ClientsPage';
import AgentsPage from './pages/AgentsPage';
import ExpensesPage from './pages/ExpensesPage';
import CalculatorPage from './pages/CalculatorPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AchieversHub from './pages/AchieversHub';
import AdminPanel from './pages/AdminPanel';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import DeleteDataPage from './pages/DeleteDataPage';
import SummaryPage from './pages/SummaryPage';
import { getGlobalSettings } from './lib/store';

function App() {
  // SEO Injection Effect
  useEffect(() => {
    const settings = getGlobalSettings();
    if (settings.seo) {
        // Update Title
        document.title = settings.seo.title || 'مان هويات لمكاتب الخدمات';

        // Update Meta Description
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.setAttribute('name', 'description');
            document.head.appendChild(metaDesc);
        }
        metaDesc.setAttribute('content', settings.seo.description || '');

        // Update Meta Keywords
        let metaKeywords = document.querySelector('meta[name="keywords"]');
        if (!metaKeywords) {
            metaKeywords = document.createElement('meta');
            metaKeywords.setAttribute('name', 'keywords');
            document.head.appendChild(metaKeywords);
        }
        metaKeywords.setAttribute('content', settings.seo.keywords || '');
    }
  }, []);

  return (
    // basename set to '/' for root domain deployment (manhobat.com)
    <Router basename="/">
      <div className="min-h-screen bg-[#eef2f6] p-4 sm:p-8" dir="rtl">
        <Toaster position="top-center" dir="rtl" richColors closeButton />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="/achievers" element={<AchieversHub />} />
          <Route path="/summary" element={<SummaryPage />} />
          
          {/* New Pages */}
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/delete-data" element={<DeleteDataPage />} />
          
          {/* Admin Routes (Both aliases) */}
          <Route path="/@123abc" element={<AdminPanel />} />
          <Route path="/admins" element={<AdminPanel />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
