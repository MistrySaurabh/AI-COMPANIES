import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import EmailEditor from './pages/email/EmailEditor';
import CompanyList from './pages/companies/CompanyList';
import CompanyCreate from './pages/companies/CompanyCreate';
import CompanyView from './pages/companies/CompanyView';
import CompanyEdit from './pages/companies/CompanyEdit';
import StateList from './pages/states/StateList';
import StateCreate from './pages/states/StateCreate';
import StateView from './pages/states/StateView';
import StateEdit from './pages/states/StateEdit';
import CityList from './pages/cities/CityList';
import CityCreate from './pages/cities/CityCreate';
import CityView from './pages/cities/CityView';
import CityEdit from './pages/cities/CityEdit';
import RoleList from './pages/roles/RoleList';
import RoleCreate from './pages/roles/RoleCreate';
import RoleView from './pages/roles/RoleView';
import RoleEdit from './pages/roles/RoleEdit';
import EmailSettings from './pages/settings/EmailSettings';
import PersonalInfo from './pages/settings/PersonalInfo';
import EmailTemplates from './pages/templates/EmailTemplates';
import EmailLogs from './pages/email/EmailLogs';
import ScraperPage from './pages/scraper/ScraperPage';
import GooglePlacesPage from './pages/places/GooglePlacesPage';
import BackupPage from './pages/backup/BackupPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/companies" replace />} />

          {/* Email — full-bleed, no inner padding */}
          <Route path="/email" element={<EmailEditor />} />

          {/* Standard padded layout */}
          <Route path="/*" element={
            <main className="max-w-7xl mx-auto px-4 py-8">
              <Routes>
                <Route path="/companies" element={<CompanyList />} />
                <Route path="/companies/create" element={<CompanyCreate />} />
                <Route path="/companies/:id" element={<CompanyView />} />
                <Route path="/companies/:id/edit" element={<CompanyEdit />} />
                <Route path="/states" element={<StateList />} />
                <Route path="/states/create" element={<StateCreate />} />
                <Route path="/states/:id" element={<StateView />} />
                <Route path="/states/:id/edit" element={<StateEdit />} />
                <Route path="/cities" element={<CityList />} />
                <Route path="/cities/create" element={<CityCreate />} />
                <Route path="/cities/:id" element={<CityView />} />
                <Route path="/cities/:id/edit" element={<CityEdit />} />
                <Route path="/roles" element={<RoleList />} />
                <Route path="/roles/create" element={<RoleCreate />} />
                <Route path="/roles/:id" element={<RoleView />} />
                <Route path="/roles/:id/edit" element={<RoleEdit />} />
                <Route path="/settings/email" element={<EmailSettings />} />
                <Route path="/settings/personal-info" element={<PersonalInfo />} />
                <Route path="/templates" element={<EmailTemplates />} />
                <Route path="/email-logs" element={<EmailLogs />} />
                <Route path="/scraper" element={<ScraperPage />} />
                <Route path="/places" element={<GooglePlacesPage />} />
                <Route path="/backup" element={<BackupPage />} />
              </Routes>
            </main>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
