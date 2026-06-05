import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ChatPage } from "./components/ChatPage";
import { AtlasBoard } from "./components/AtlasBoard";
import { SettingsProvider } from "./contexts/SettingsContext";

function App() {
  return (
    <SettingsProvider>
      <Router>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<AtlasBoard />} />
            <Route path="/projects/*" element={<ChatPage />} />
          </Route>
        </Routes>
      </Router>
    </SettingsProvider>
  );
}

export default App;
