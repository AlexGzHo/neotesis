import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { LandingPage } from './features/landing';
import { AIChat } from './features/pdf-viewer';
import { AuthProvider } from './features/auth';

function App() {
    return (
        <AuthProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <MainLayout>
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/ai-chat" element={<AIChat />} />
                    </Routes>
                </MainLayout>
            </Router>
        </AuthProvider>
    );
}

export default App;
