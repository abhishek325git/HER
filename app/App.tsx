import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import ChatPage from './pages/ChatPage';
import DashboardPage from './pages/DashboardPage';
import CodeExplorerPage from './pages/CodePage';
import RemindersPage from './pages/RemindersPage';
import MemoriesPage from './pages/MemoriesPage';
import AutomationPage from './pages/AutomationPage';
import SettingsPage from './pages/SettingsPage';
import { useReminderNotifications } from './lib/hooks/useReminderNotifications';

function App() {
  // Enable reminder notifications globally
  useReminderNotifications();
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ChatPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/memories" element={<MemoriesPage />} />
          <Route path="/reminders" element={<RemindersPage />} />
          <Route path="/automations" element={<AutomationPage />} />
          <Route path="/code-explorer" element={<CodeExplorerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
