import { useEffect, useState } from 'react'
import axios from 'axios'

function ManagePlayers() {
  const [players, setPlayers] = useState([])
  const [newPlayerName, setNewPlayerName] = useState('')

  useEffect(() => {
    fetchPlayers()
  }, [])

  const fetchPlayers = async () => {
    const res = await axios.get('http://localhost:5000/api/players')
    setPlayers(res.data)
  }

  const addPlayer = async () => {
    if (!newPlayerName.trim()) return alert('Enter player name!')
    await axios.post('http://localhost:5000/api/players', { name: newPlayerName.trim() })
    setNewPlayerName('')
    fetchPlayers()
  }

  const deletePlayer = async (id) => {
    if (window.confirm('Delete this player?')) {
      await axios.delete(`http://localhost:5000/api/players/${id}`)
      fetchPlayers()
    }
  }

  return (
    <div>
      <h2 style={{marginBottom:'16px'}}>👤 Manage Players</h2>

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
          💡 Add players here to quickly select them when creating a match
        </p>
      </div>

      {players.length === 0 ? (
        <div className="card text-center">
          <p style={{fontSize:'48px', marginBottom:'8px'}}>👤</p>
          <h3>No players yet!</h3>
          <p className="text-gray">Add players above</p>
        </div>
      ) : (
        <div className="card">
          <h3 style={{marginBottom:'12px'}}>All Players ({players.length})</h3>
          {players.map((player, i) => (
            <div key={player._id} style={{
              display:'flex',
              justifyContent:'space-between',
              alignItems:'center',
              padding:'12px 0',
              borderBottom: i < players.length - 1 ? '1px solid #334155' : 'none',
            }}>
              <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                <div style={{
                  width:'40px', height:'40px',
                  borderRadius:'50%',
                  background:'#16a34a',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight:'700', fontSize:'18px',
                }}>
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{fontWeight:'600', fontSize:'15px'}}>{player.name}</p>
                  <p style={{fontSize:'12px', color:'#94a3b8'}}>Player #{i + 1}</p>
                </div>
              </div>
              <button className="btn btn-red"
                style={{padding:'8px 14px'}}
                onClick={() => deletePlayer(player._id)}>
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ManagePlayers