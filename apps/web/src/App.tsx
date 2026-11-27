import { BrowserRouter, Route, Routes } from 'react-router';
import { AppHomePage } from './pages/AppHomePage/AppHomePage';
import { HomePage } from './pages/HomePage/HomePage';
import { LoginPage } from './pages/LoginPage/LoginPage';
import { SignupPage } from './pages/SignupPage/SignupPage';
import { routes } from './routes';

export function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={routes.home} element={<HomePage />} />
        <Route path={routes.login} element={<LoginPage />} />
        <Route path={routes.signup} element={<SignupPage />} />
        <Route path={routes.app} element={<AppHomePage />} />
      </Routes>
    </BrowserRouter>
  );
}
