import { BrowserRouter } from 'react-router-dom';
import { AttendanceProvider } from './context/AttendanceContext';
import { AppRoutes } from './routes/AppRoutes';

function App() {
  return (
    <BrowserRouter>
      <AttendanceProvider>
        <AppRoutes />
      </AttendanceProvider>
    </BrowserRouter>
  );
}

export default App;
