import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

function Home() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('matches')
  const [players, setPlayers] = useState([])
  const [newPlayerName, setNewPlayerName] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchMatches()
    fetchPlayers()
  }, [])

  const fetchMatches = async () => {
  try {
    const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/matches`, {
      timeout: 5000
    })
    setMatches(res.data)
    } catch (err) {
      console.log(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchPlayers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/players')
      setPlayers(res.data)
    } catch (err) {
      console.log(err)
    }
  }

  const addPlayer = async () => {
    if (!newPlayerName.trim()) return alert('Enter player name!')
    try {
      await axios.post('http://localhost:5000/api/players', { name: newPlayerName.trim() })
      setNewPlayerName('')
      fetchPlayers()
    } catch (err) {
      alert('Error adding player!')
    }
  }

  const deletePlayer = async (id) => {
    if (window.confirm('Delete this player?')) {
      await axios.delete(`http://localhost:5000/api/players/${id}`)
      fetchPlayers()
    }
  }

  const deleteMatch = async (id) => {
    if (window.confirm('Delete this match?')) {
      await axios.delete(`http://localhost:5000/api/matches/${id}`)
      setMatches(matches.filter(m => m._id !== id))
    }
  }

  const getStatusBadge = (status) => {
    if (status === 'completed') return <span className="badge badge-green">✅ Completed</span>
    if (status === 'innings2') return <span className="badge badge-blue">🔵 2nd Innings</span>
    if (status === 'innings1') return <span className="badge badge-yellow">🟡 1st Innings</span>
    return <span className="badge badge-red">Setup</span>
  }

  if (loading) return <div className="card text-center">Loading...</div>

  return (
    <div>
      {/* Tabs */}
      <div style={{display:'flex', gap:'8px', marginBottom:'20px'}}>
        <button
          className={`btn ${activeTab === 'matches' ? 'btn-green' : 'btn-gray'}`}
          style={{flex:1, fontSize:'15px'}}
          onClick={() => setActiveTab('matches')}
        >
          🏏 Matches
        </button>
        <button
          className={`btn ${activeTab === 'players' ? 'btn-green' : 'btn-gray'}`}
          style={{flex:1, fontSize:'15px'}}
          onClick={() => setActiveTab('players')}
        >
          👤 Players ({players.length})
        </button>
      </div>

      {/* MATCHES TAB */}
      {activeTab === 'matches' && (
        <div>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
            <h2>All Matches</h2>
            <button className="btn btn-green" onClick={() => navigate('/new-match')}>
              + New Match
            </button>
          </div>

          {matches.length === 0 && (
            <div className="card text-center">
              <p style={{fontSize:'48px', marginBottom:'12px'}}>🏏</p>
              <h3>No matches yet!</h3>
              <p className="text-gray" style={{marginBottom:'16px'}}>
                Start your first cricket match
              </p>
              <button className="btn btn-green" onClick={() => navigate('/new-match')}>
                + Create New Match
              </button>
            </div>
          )}

          {matches.map(match => (
            <div className="card" key={match._id}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                <div style={{flex:1}}>
                  <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px', flexWrap:'wrap'}}>
                    <h3 style={{margin:0}}>{match.team1} vs {match.team2}</h3>
                    {getStatusBadge(match.status)}
                  </div>
                  <p className="text-gray" style={{fontSize:'13px', marginBottom:'8px'}}>
                    {match.overs} Overs | Toss: {match.tossWinner} won
                  </p>
                  <div style={{display:'flex', gap:'24px'}}>
                    {match.innings1 && (
                      <div>
                        <p style={{fontSize:'12px', color:'#94a3b8'}}>{match.innings1.battingTeam}</p>
                        <p style={{fontWeight:'700', fontSize:'18px', color:'#16a34a'}}>
                          {match.innings1.runs}/{match.innings1.wickets}
                        </p>
                      </div>
                    )}
                    {match.innings2 && match.status !== 'innings1' && (
                      <div>
                        <p style={{fontSize:'12px', color:'#94a3b8'}}>{match.innings2.battingTeam}</p>
                        <p style={{fontWeight:'700', fontSize:'18px', color:'#2563eb'}}>
                          {match.innings2.runs}/{match.innings2.wickets}
                        </p>
                      </div>
                    )}
                  </div>
                  {match.result && (
                    <p className="text-green" style={{marginTop:'8px', fontWeight:'600'}}>
                      🏆 {match.result}
                    </p>
                  )}
                </div>

                <div style={{display:'flex', flexDirection:'column', gap:'6px', marginLeft:'12px'}}>
                  {match.status !== 'completed' ? (
                    <button className="btn btn-green"
                      onClick={() => navigate(`/scoring/${match._id}`)}>
                      ▶ Continue
                    </button>
                  ) : (
                    <>
                      <button className="btn btn-blue"
                        onClick={() => navigate(`/scoring/${match._id}`)}>
                        📊 Summary
                      </button>
                      <button className="btn btn-green"
                        onClick={() => navigate(`/report/${match._id}`)}>
                        📤 Share
                      </button>
                    </>
                  )}
                  <button className="btn btn-red"
                    onClick={() => deleteMatch(match._id)}>
                    🗑 Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PLAYERS TAB */}
      {activeTab === 'players' && (
        <div>
          <h2 style={{marginBottom:'16px'}}>👤 Manage Players</h2>

          {/* Add Player */}
          <div className="card">
            <h3 style={{marginBottom:'10px'}}>Add New Player</h3>
            <div style={{display:'flex', gap:'8px'}}>
              <input
                placeholder="Enter player name..."
                value={newPlayerName}
                onChange={e => setNewPlayerName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPlayer()}
                style={{margin:0}}
              />
              <button className="btn btn-green" onClick={addPlayer}
                style={{whiteSpace:'nowrap'}}>
                + Add
              </button>
            </div>
            <p className="text-gray" style={{fontSize:'12px', marginTop:'8px'}}>
              💡 Add players here first, then select them when creating a match
            </p>
          </div>

          {/* Players List */}
          {players.length === 0 ? (
            <div className="card text-center">
              <p style={{fontSize:'36px', marginBottom:'8px'}}>👤</p>
              <h3>No players yet!</h3>
              <p className="text-gray">Add players above to get started</p>
            </div>
          ) : (
            <div className="card">
              <h3 style={{marginBottom:'12px'}}>
                All Players ({players.length})
              </h3>
              {players.map((player, i) => (
                <div key={player._id} style={{
                  display:'flex',
                  justifyContent:'space-between',
                  alignItems:'center',
                  padding:'10px 0',
                  borderBottom: i < players.length - 1 ? '1px solid #334155' : 'none',
                }}>
                  <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                    <div style={{
                      width:'36px',
                      height:'36px',
                      borderRadius:'50%',
                      background:'#16a34a',
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      fontWeight:'700',
                      fontSize:'16px',
                    }}>
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{fontWeight:'600'}}>{player.name}</p>
                      <p style={{fontSize:'12px', color:'#94a3b8'}}>
                        Player #{i + 1}
                      </p>
                    </div>
                  </div>
                  <button className="btn btn-red"
                    style={{padding:'6px 12px', fontSize:'12px'}}
                    onClick={() => deletePlayer(player._id)}>
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Home