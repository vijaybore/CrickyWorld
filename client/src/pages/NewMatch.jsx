import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

function NewMatch() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    team1: '',
    team2: '',
    overs: 10,
    tossWinner: '',
    battingFirst: '',
    wideRuns: 1,
    noBallRuns: 1,
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    if (!form.team1 || !form.team2 || !form.tossWinner || !form.battingFirst) {
      alert('Please fill all fields!')
      return
    }
    try {
      setLoading(true)
      const res = await axios.post('http://localhost:5000/api/matches', form)
      navigate(`/scoring/${res.data._id}`)
    } catch (err) {
      alert('Error creating match!')
    } finally {
      setLoading(false)
    }
  }

  const labelStyle = {
    fontSize: '13px',
    color: '#94a3b8',
    display: 'block',
    marginBottom: '4px',
    marginTop: '12px',
    fontWeight: '500',
  }

  return (
    <div>
      <h2 style={{marginBottom:'16px'}}>🏏 Create New Match</h2>

      {/* Team Details */}
      <div className="card">
        <h3 style={{marginBottom:'12px'}}>👕 Team Details</h3>

        <label style={labelStyle}>Team 1 Name</label>
        <input name="team1" placeholder="Enter team 1 name"
          value={form.team1} onChange={handleChange} />

        <label style={labelStyle}>Team 2 Name</label>
        <input name="team2" placeholder="Enter team 2 name"
          value={form.team2} onChange={handleChange} />

        <label style={labelStyle}>Number of Overs</label>
        <input name="overs" type="number" placeholder="Overs"
          value={form.overs} onChange={handleChange} />
      </div>

      {/* Toss Details */}
      <div className="card">
        <h3 style={{marginBottom:'12px'}}>🪙 Toss Details</h3>

        <label style={labelStyle}>Toss Winner</label>
        <select name="tossWinner" value={form.tossWinner} onChange={handleChange}>
          <option value="">Select Toss Winner</option>
          <option value={form.team1}>{form.team1 || 'Team 1'}</option>
          <option value={form.team2}>{form.team2 || 'Team 2'}</option>
        </select>

        <label style={labelStyle}>Batting First</label>
        <select name="battingFirst" value={form.battingFirst} onChange={handleChange}>
          <option value="">Select Batting Team</option>
          <option value={form.team1}>{form.team1 || 'Team 1'}</option>
          <option value={form.team2}>{form.team2 || 'Team 2'}</option>
        </select>
      </div>

      {/* Extra Runs Settings */}
      <div className="card">
        <h3 style={{marginBottom:'4px'}}>⚙️ Extra Runs Settings</h3>
        <p className="text-gray" style={{fontSize:'12px', marginBottom:'16px'}}>
          Set how many runs are added for Wide and No Ball in this match
        </p>

        {/* Wide Runs */}
        <label style={labelStyle}>Wide Ball Runs</label>
        <div style={{display:'flex', gap:'8px', flexWrap:'wrap', marginTop:'8px'}}>
          {[0,1].map(r => (
            <div
              key={r}
              onClick={() => setForm({...form, wideRuns: r})}
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                background: form.wideRuns == r ? '#d97706' : '#0f172a',
                border: `2px solid ${form.wideRuns == r ? '#d97706' : '#334155'}`,
                color: form.wideRuns == r ? 'white' : '#94a3b8',
                fontWeight: '700',
                fontSize: '18px',
                transition: 'all 0.2s',
              }}
            >
              {r}
              <span style={{fontSize:'9px', fontWeight:'400', marginTop:'2px'}}>
                run{r > 1 ? 's' : ''}
              </span>
            </div>
          ))}
        </div>
        <p style={{fontSize:'12px', color:'#d97706', marginTop:'8px'}}>
          Wide = +{form.wideRuns} run{form.wideRuns > 0 ? 's' : ''} (no ball counted)
        </p>

        {/* No Ball Runs */}
        <label style={{...labelStyle, marginTop:'20px'}}>No Ball Runs</label>
        <div style={{display:'flex', gap:'8px', flexWrap:'wrap', marginTop:'8px'}}>
          {[0,1].map(r => (
            <div
              key={r}
              onClick={() => setForm({...form, noBallRuns: r})}
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                background: form.noBallRuns == r ? '#ea580c' : '#0f172a',
                border: `2px solid ${form.noBallRuns == r ? '#ea580c' : '#334155'}`,
                color: form.noBallRuns == r ? 'white' : '#94a3b8',
                fontWeight: '700',
                fontSize: '18px',
                transition: 'all 0.2s',
              }}
            >
              {r}
              <span style={{fontSize:'9px', fontWeight:'400', marginTop:'2px'}}>
                run{r > 1 ? 's' : ''}
              </span>
            </div>
          ))}
        </div>
        <p style={{fontSize:'12px', color:'#ea580c', marginTop:'8px'}}>
          No Ball = +{form.noBallRuns} run{form.noBallRuns > 0 ? 's' : ''} + batsman runs
        </p>
      </div>

      {/* Start Match Button */}
      <button
        className="btn btn-green"
        style={{width:'100%', padding:'16px', fontSize:'16px', marginTop:'8px'}}
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? '⏳ Creating...' : '🏏 Start Match!'}
      </button>

      <p className="text-gray text-center" style={{fontSize:'12px', marginTop:'12px'}}>
        💡 Players will be added during the match scoring
      </p>
    </div>
  )
}

export default NewMatch