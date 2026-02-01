import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { LandingPage } from './components/landing/LandingPage';
import { CitationTools } from './components/citation/CitationTools';
import { SampleCalculator } from './components/calculator/SampleCalculator';
import { AIChat } from './components/pdf/AIChat';
import { AuthProvider } from './context/AuthContext';

function App() {
    return (
        <AuthProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <MainLayout>
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/citation-tools" element={<CitationTools />} />
                        <Route path="/sample-calculator" element={<SampleCalculator />} />
                        <Route path="/ai-chat" element={<AIChat />} />
                    </Routes>
                </MainLayout>
            </Router>
        </AuthProvider>
    );
}

export default App;
