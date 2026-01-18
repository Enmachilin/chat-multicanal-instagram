import { useState } from 'react';
import CommentsList from '../components/CommentsList';
import MessagesList from '../components/MessagesList';
import './Dashboard.css';

/**
 * Instagram Dashboard
 * Main page for viewing and responding to Instagram comments and DMs
 */
export default function Dashboard() {
    return (
        <div className="dashboard">
            {/* Header */}
            <header className="dashboard-header">
                <div className="header-content">
                    <div className="header-brand">
                        <div className="brand-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="2" y="2" width="20" height="20" rx="5" />
                                <circle cx="12" cy="12" r="4" />
                                <circle cx="18" cy="6" r="1.5" fill="currentColor" />
                            </svg>
                        </div>
                        <h1>Instagram Dashboard</h1>
                    </div>
                    <div className="header-status">
                        <span className="status-dot"></span>
                        <span>Conectado</span>
                    </div>
                </div>
            </header>

            {/* Main Content - Split View */}
            <main className="dashboard-main">
                <div className="split-view">
                    <section className="dashboard-column">
                        <div className="column-header">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                            </svg>
                            <h2>Comentarios</h2>
                        </div>
                        <CommentsList />
                    </section>

                    <section className="dashboard-column">
                        <div className="column-header">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                <polyline points="22,6 12,13 2,6" />
                            </svg>
                            <h2>Mensajes DM</h2>
                        </div>
                        <MessagesList />
                    </section>
                </div>
            </main>
        </div>
    );
}
