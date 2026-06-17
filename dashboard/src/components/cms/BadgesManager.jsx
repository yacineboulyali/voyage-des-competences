import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Award, Search, Plus, Edit2, Trash2, Globe, MapPin, Star } from 'lucide-react';

export default function BadgesManager() {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBadges();
  }, []);

  async function fetchBadges() {
    setLoading(true);
    const { data, error } = await supabase
      .from('badge_definitions')
      .select('*')
      .order('city', { ascending: true });
    
    if (error) console.error('Error fetching badges:', error);
    else setBadges(data || []);
    setLoading(false);
  }

  const filteredBadges = badges.filter(b => 
    (b.badge_name || b.name_fr)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.id || b.badge_id)?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRankEmoji = (rank) => {
    switch (rank?.toLowerCase()) {
      case 'or': return '🥇';
      case 'argent': return '🥈';
      case 'bronze': return '🥉';
      default: return '🏅';
    }
  };

  return (
    <div className="badges-manager fade-in">
      <div className="cms-toolbar">
        <div className="search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Rechercher un badge (nom, ville, id)..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="btn-primary" onClick={() => {}}>
          <Plus size={18} /> Nouveau Badge
        </button>
      </div>

      <div className="badges-grid">
        {loading ? (
          <div className="loading"><div className="spinner" /> Chargement du référentiel...</div>
        ) : filteredBadges.length === 0 ? (
          <div className="empty-state">Aucun badge ne correspond à votre recherche.</div>
        ) : (
          filteredBadges.map((badge) => (
            <div key={badge.id || badge.badge_id} className="badge-definition-card">
              <div className="badge-image-container" style={{ background: badge.city === 'rabat' ? 'linear-gradient(135deg, #7c2d12 0%, #451a03 100%)' : '' }}>
                {badge.image_url ? (
                  <img src={badge.image_url} alt={badge.badge_name || badge.name_fr} className="badge-img" />
                ) : (
                  <div className="badge-placeholder">
                    <Award size={40} opacity={0.3} />
                    <span>{getRankEmoji(badge.rank)}</span>
                  </div>
                )}
                <div className={`badge-rank-tag ${badge.rank}`}>
                  {badge.rank?.toUpperCase()}
                </div>
              </div>

              <div className="badge-info">
                <div className="badge-header">
                  <h4>{badge.badge_name || badge.name_fr}</h4>
                  <span className="badge-id">#{badge.id?.slice(0, 8) || badge.badge_id}</span>
                </div>
                
                <p className="badge-description">{badge.description_fr || badge.description || "Aucune description"}</p>
                
                <div className="badge-meta">
                  <div className="meta-item">
                    <MapPin size={14} />
                    <span>{badge.city || 'Global'}</span>
                  </div>
                  <div className="meta-item">
                    <Star size={14} />
                    <span>{badge.skill || 'Compétence'}</span>
                  </div>
                </div>

                <div className="badge-condition">
                  <strong>Condition :</strong> {badge.requirement || badge.condition_text || "Non définie"}
                </div>

                <div className="badge-points">
                  <Award size={14} /> {badge.points || 0} points
                </div>
              </div>

              <div className="badge-actions">
                <button className="icon-btn" title="Modifier"><Edit2 size={16} /></button>
                <button className="icon-btn delete" title="Supprimer"><Trash2 size={16} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        .badges-manager {
          padding-top: 10px;
        }
        .cms-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          gap: 16px;
        }
        .search-box {
          flex: 1;
          display: flex;
          align-items: center;
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: 12px;
          padding: 0 16px;
          height: 48px;
        }
        .search-box input {
          background: transparent;
          border: none;
          color: var(--text-primary);
          padding: 8px 12px;
          width: 100%;
          outline: none;
        }
        .badges-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }
        .badge-definition-card {
          background: var(--bg-card);
          border: 1px solid var(--border-light);
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          position: relative;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .badge-definition-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.1);
          border-color: var(--primary-main);
        }
        .badge-image-container {
          height: 140px;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .badge-img {
          height: 100px;
          object-fit: contain;
          filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));
        }
        .badge-placeholder {
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .badge-rank-tag {
          position: absolute;
          top: 12px;
          right: 12px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 800;
          color: white;
        }
        .badge-rank-tag.or { background: linear-gradient(to right, #b45309, #fbbf24); }
        .badge-rank-tag.argent { background: linear-gradient(to right, #4b5563, #9ca3af); }
        .badge-rank-tag.bronze { background: linear-gradient(to right, #78350f, #a16207); }
        
        .badge-info {
          padding: 16px;
          flex: 1;
        }
        .badge-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        .badge-header h4 {
          margin: 0;
          font-size: 17px;
          color: var(--text-primary);
        }
        .badge-id {
          font-size: 10px;
          font-family: monospace;
          color: var(--text-muted);
          background: var(--bg-main);
          padding: 2px 6px;
          border-radius: 4px;
        }
        .badge-description {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.4;
          margin-bottom: 16px;
          min-height: 36px;
        }
        .badge-meta {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--text-muted);
          text-transform: capitalize;
        }
        .badge-condition {
          background: rgba(124, 58, 237, 0.05);
          border-radius: 8px;
          padding: 10px;
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 12px;
          border-left: 3px solid var(--primary-main);
        }
        .badge-points {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
          color: #f59e0b;
          font-size: 14px;
        }
        .badge-actions {
          padding: 12px;
          border-top: 1px solid var(--border-light);
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }
        .icon-btn {
          background: transparent;
          border: 1px solid var(--border-light);
          color: var(--text-secondary);
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .icon-btn:hover {
          background: var(--bg-main);
          color: var(--primary-main);
          border-color: var(--primary-main);
        }
        .icon-btn.delete:hover {
          color: #ef4444;
          border-color: #ef4444;
          background: #fef2f2;
        }
      `}</style>
    </div>
  );
}
