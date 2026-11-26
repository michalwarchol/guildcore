import { BrowserRouter, Route, Routes } from 'react-router';
import { HomePage } from './pages/HomePage';
import { routes } from './routes';

export function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={routes.home} element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}
