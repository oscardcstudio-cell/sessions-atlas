import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ChatPage } from "./components/ChatPage";
import { EmptyState } from "./components/EmptyState";
import { SettingsProvider } from "./contexts/SettingsContext";

function App() {
  return (
    <SettingsProvider>
      <Router>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<EmptyState />} />
            <Route path="/projects/*" element={<ChatPage />} />
          </Route>
        </Routes>
      </Router>
    </SettingsProvider>
  );
}

export default App;
