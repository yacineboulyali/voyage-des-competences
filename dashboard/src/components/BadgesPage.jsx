import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import BadgesManager from './cms/BadgesManager';
import { LayoutGrid, PieChart as ChartIcon, List } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
  PieChart, Pie, Legend,
} from 'recharts';

const RANK_COLORS = { bronze: '#cd7f32', argent: '#c0c0c0', or: '#ffd700' };
const SKILL_COLORS = { decision: '#a78bfa', equipe: '#67e8f9', stress: '#fcd34d', excellence: '#34d399' };

export default function BadgesPage() {
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'manager'
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('player_earned_badges')
        .select('*')
        .order('earned_at', { ascending: false });
      setBadges(data || []);
      setLoading(false);
    }
    fetch();
  }, []);

  // Stats
  const byRank = ['bronze', 'argent', 'or'].map(rank => ({
    name: rank.charAt(0).toUpperCase() + rank.slice(1),
    value: badges.filter(b => b.rank === rank).length,
    color: RANK_COLORS[rank],
  }));

  const bySkill = Object.entries(SKILL_COLORS).map(([skill, color]) => ({
    name: skill,
    value: badges.filter(b => b.skill === skill).length,
    color,
  })).filter(s => s.value > 0);

  const byCity = {};
  badges.forEach(b => {
    if (b.city) byCity[b.city] = (byCity[b.city] || 0) + 1;
  });
  const cityData = Object.entries(byCity).map(([city, count]) => ({ city, count })).sort((a,b)=>b.count-a.count);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="custom-tooltip">
        <div className="tooltip-value" style={{ color: payload[0].color }}>{payload[0].name}: {payload[0].value}</div>
      </div>
    );
  };

  return (
    <div className="fade-in">
      <div className="page-tabs" style={{ marginBottom: 24, display: 'flex', gap: 12, borderBottom: '1px solid var(--border-light)', paddingBottom: 16 }}>
        <button 
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <ChartIcon size={16} /> Analytique
        </button>
        <button 
          className={`tab-btn ${activeTab === 'manager' ? 'active' : ''}`}
          onClick={() => setActiveTab('manager')}
        >
          <LayoutGrid size={16} /> Référentiel des Badges
        </button>
      </div>

      {activeTab === 'analytics' ? (
        <>
          <div className="stats-grid fade-in" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {byRank.map((r, i) => (
              <div key={r.name} className="stat-card fade-in" style={{ '--delay': `${i * 0.1}s` }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>
                  {r.name === 'Bronze' ? '🥉' : r.name === 'Argent' ? '🥈' : '🥇'}
                </div>
                <div className="stat-value" style={{ color: r.color }}>{r.value}</div>
                <div className="stat-label">Badges {r.name}</div>
              </div>
            ))}
          </div>

          <div className="dashboard-grid">
            <div className="card fade-in">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-icon">🏅</div>
                  <h3>Badges par compétence</h3>
                </div>
              </div>
              <div className="card-body">
                {bySkill.length === 0 ? (
                  <div className="empty-state"><span className="empty-icon">🏅</span><h3>Aucun badge</h3></div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={bySkill} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name, value}) => `${name}: ${value}`} labelLine={false}>
                        {bySkill.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="card fade-in">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-icon">MAP</div>
                  <h3>Badges par ville</h3>
                </div>
              </div>
              <div className="card-body">
                {cityData.length === 0 ? (
                  <div className="empty-state"><span className="empty-icon">🏙️</span><h3>Aucun badge par ville</h3></div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={cityData} barSize={20}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                      <XAxis dataKey="city" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="count" name="Badges" fill="#7c3aed" radius={[4,4,0,0]}>
                        {cityData.map((_, i) => <Cell key={i} fill={`hsl(${260 + i * 20}, 70%, 60%)`} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="card fade-in">
            <div className="card-header">
              <div className="card-title">
                <div className="card-icon">⏱️</div>
                <h3>Derniers badges obtenus</h3>
              </div>
            </div>
            <div className="table-wrapper">
              {loading ? (
                <div className="loading"><div className="spinner" /> Chargement...</div>
              ) : badges.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">🏅</span>
                  <h3>Aucun badge encore</h3>
                  <p>Les badges apparaîtront quand les joueurs progresseront</p>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Badge</th>
                      <th>Ville</th>
                      <th>Compétence</th>
                      <th>Rang</th>
                      <th>Points</th>
                      <th>Obtenu le</th>
                    </tr>
                  </thead>
                  <tbody>
                    {badges.slice(0, 20).map(b => (
                      <tr key={b.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 20 }}>{b.icon_url || b.badge_emoji || '🏅'}</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.badge_name || b.badge_name_fr}</span>
                          </div>
                        </td>
                        <td>{b.city || '—'}</td>
                        <td>{b.skill ? <span className={`skill-chip ${b.skill}`}>{b.skill}</span> : '—'}</td>
                        <td>{b.rank ? <span className={`rank-tag ${b.rank}`}>{b.rank}</span> : '—'}</td>
                        <td style={{ color: '#fcd34d', fontWeight: 600 }}>{b.points || 0}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                          {new Date(b.earned_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      ) : (
        <BadgesManager />
      )}

      <style jsx>{`
        .tab-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .tab-btn:hover {
          color: var(--text-primary);
          background: var(--bg-card);
        }
        .tab-btn.active {
          color: var(--primary-main);
          background: rgba(124, 58, 237, 0.1);
          box-shadow: 0 4px 12px rgba(124, 58, 237, 0.15);
        }
      `}</style>
    </div>
  );
}
