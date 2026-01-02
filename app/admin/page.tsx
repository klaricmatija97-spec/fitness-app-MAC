'use client';

import { useState, useEffect } from 'react';

interface TrainerInvite {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  created_at: string;
}

export default function AdminPage() {
  const [invites, setInvites] = useState<TrainerInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchInvites = async () => {
    try {
      const res = await fetch(`/api/admin/trainer-invites?status=pending`, {
        headers: { 'x-admin-key': adminKey },
      });
      const data = await res.json();
      if (data.ok) {
        setInvites(data.invites);
      }
    } catch (error) {
      console.error('Error fetching invites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      console.log('Logging in with key:', adminKey);
      const res = await fetch(`/api/admin/trainer-invites?status=pending`, {
        headers: { 'x-admin-key': adminKey },
      });
      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Response data:', data);
      
      if (data.ok) {
        setAuthenticated(true);
        setInvites(data.invites || []);
        setMessage({ type: 'success', text: `Prijavljeni! ${data.count || 0} zahtjeva na čekanju.` });
      } else {
        setMessage({ type: 'error', text: data.message || 'Pogrešan admin ključ' });
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage({ type: 'error', text: 'Greška pri povezivanju s serverom' });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (inviteId: string, action: 'approve' | 'reject') => {
    setActionLoading(inviteId);
    setMessage(null);
    
    try {
      const res = await fetch('/api/admin/trainer-invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
        },
        body: JSON.stringify({ inviteId, action }),
      });
      
      const data = await res.json();
      
      if (data.ok) {
        setMessage({ 
          type: 'success', 
          text: action === 'approve' 
            ? `✅ Trener ${data.trainer?.name || ''} kreiran! Email poslan.`
            : '❌ Zahtjev odbijen.'
        });
        // Osvježi listu
        fetchInvites();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Greška pri obradi zahtjeva' });
    } finally {
      setActionLoading(null);
    }
  };

  if (!authenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.loginCard}>
          <h1 style={styles.title}>🔐 Corpex Admin</h1>
          <p style={styles.subtitle}>Unesite admin ključ za pristup</p>
          
          <input
            type="password"
            placeholder="Admin ključ"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            style={styles.input}
          />
          
          <button 
            onClick={handleLogin} 
            disabled={loading || !adminKey}
            style={styles.button}
          >
            {loading ? 'Učitavanje...' : 'Prijava'}
          </button>
          
          {message && (
            <p style={{ ...styles.message, color: message.type === 'error' ? '#ef4444' : '#22c55e' }}>
              {message.text}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.dashboard}>
        <header style={styles.header}>
          <h1 style={styles.title}>🏋️ Corpex Admin</h1>
          <p style={styles.subtitle}>Upravljanje zahtjevima trenera</p>
        </header>

        {message && (
          <div style={{
            ...styles.alert,
            backgroundColor: message.type === 'error' ? '#fef2f2' : '#f0fdf4',
            borderColor: message.type === 'error' ? '#fecaca' : '#bbf7d0',
            color: message.type === 'error' ? '#dc2626' : '#16a34a',
          }}>
            {message.text}
          </div>
        )}

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>
            📋 Zahtjevi na čekanju ({invites.length})
          </h2>
          
          {loading ? (
            <p style={styles.loading}>Učitavanje...</p>
          ) : invites.length === 0 ? (
            <p style={styles.empty}>Nema zahtjeva na čekanju 🎉</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Ime</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Telefon</th>
                  <th style={styles.th}>Datum</th>
                  <th style={styles.th}>Akcije</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => (
                  <tr key={invite.id} style={styles.tr}>
                    <td style={styles.td}>{invite.name}</td>
                    <td style={styles.td}>{invite.email}</td>
                    <td style={styles.td}>{invite.phone || '-'}</td>
                    <td style={styles.td}>
                      {new Date(invite.created_at).toLocaleDateString('hr-HR')}
                    </td>
                    <td style={styles.td}>
                      <button
                        onClick={() => handleAction(invite.id, 'approve')}
                        disabled={actionLoading === invite.id}
                        style={styles.approveBtn}
                      >
                        {actionLoading === invite.id ? '...' : '✅ Odobri'}
                      </button>
                      <button
                        onClick={() => handleAction(invite.id, 'reject')}
                        disabled={actionLoading === invite.id}
                        style={styles.rejectBtn}
                      >
                        {actionLoading === invite.id ? '...' : '❌ Odbij'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <button onClick={fetchInvites} style={styles.refreshBtn}>
          🔄 Osvježi
        </button>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f0f0f',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  loginCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center',
  },
  dashboard: {
    maxWidth: '1000px',
    width: '100%',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  title: {
    color: '#fff',
    fontSize: '28px',
    fontWeight: '300',
    marginBottom: '8px',
  },
  subtitle: {
    color: '#888',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '16px',
    backgroundColor: '#2a2a2a',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#fff',
    marginBottom: '16px',
    outline: 'none',
  },
  button: {
    width: '100%',
    padding: '14px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: '#8b5cf6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  message: {
    marginTop: '16px',
    fontSize: '14px',
  },
  alert: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid',
    marginBottom: '20px',
    fontSize: '14px',
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '20px',
  },
  cardTitle: {
    color: '#fff',
    fontSize: '18px',
    fontWeight: '500',
    marginBottom: '20px',
  },
  loading: {
    color: '#888',
    textAlign: 'center',
    padding: '40px',
  },
  empty: {
    color: '#888',
    textAlign: 'center',
    padding: '40px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    color: '#888',
    fontSize: '12px',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '1px solid #333',
  },
  tr: {
    borderBottom: '1px solid #2a2a2a',
  },
  td: {
    padding: '14px 12px',
    color: '#fff',
    fontSize: '14px',
  },
  approveBtn: {
    padding: '8px 12px',
    fontSize: '12px',
    backgroundColor: '#22c55e',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginRight: '8px',
  },
  rejectBtn: {
    padding: '8px 12px',
    fontSize: '12px',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  refreshBtn: {
    padding: '12px 20px',
    fontSize: '14px',
    backgroundColor: '#2a2a2a',
    color: '#fff',
    border: '1px solid #333',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};

