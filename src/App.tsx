import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    // basename set to '/' for root domain
    <Router basename="/">
      <div className="min-h-screen bg-[#eef2f6] p-4 sm:p-8" dir="rtl">
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
          
          {/* Admin Routes (Both aliases) */}
          <Route path="/@123abc" element={<AdminPanel />} />
          <Route path="/admins" element={<AdminPanel />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
