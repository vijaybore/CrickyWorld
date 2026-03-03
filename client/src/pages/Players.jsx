import { useEffect, useState } from 'react'
import axios from 'axios'

function Players() {
  const [matches, setMatches] = useState([])
  const [activeTab, setActiveTab] = useState('batting')

  useEffect(() => {
    fetchMatches()
  }, [])

  const fetchMatches = async () => {
    const res = await axios.get('http://localhost:5000/api/matches')
    setMatches(res.data)
  }

  // Calculate player stats from all completed matches
  const calculateStats = () => {
    const playerMap = {}

    matches.forEach(match => {
      if (match.status !== 'completed') return

      // Process both innings
      ;[match.innings1, match.innings2].forEach(innings => {
        if (!innings) return

        // Batting stats
        innings.battingStats && innings.battingStats.forEach(p => {
          if (!playerMap[p.name]) {
            playerMap[p.name] = {
              name: p.name,
              matches: 0,
              innings: 0,
              totalRuns: 0,
              totalBalls: 0,
              totalFours: 0,
              totalSixes: 0,
              highestScore: 0,
              totalWickets: 0,
              totalBallsBowled: 0,
              totalRunsConceded: 0,
              bestWickets: 0,
              bestRuns: 999,
              fifties: 0,
              hundreds: 0,
            }
          }
          if (p.balls > 0 || p.isOut) {
            playerMap[p.name].innings += 1
            playerMap[p.name].totalRuns += p.runs
            playerMap[p.name].totalBalls += p.balls
            playerMap[p.name].totalFours += p.fours
            playerMap[p.name].totalSixes += p.sixes
            if (p.runs > playerMap[p.name].highestScore) {
              playerMap[p.name].highestScore = p.runs
            }
            if (p.runs >= 50 && p.runs < 100) playerMap[p.name].fifties += 1
            if (p.runs >= 100) playerMap[p.name].hundreds += 1
          }
        })

        // Bowling stats
        innings.bowlingStats && innings.bowlingStats.forEach(p => {
          if (!playerMap[p.name]) {
            playerMap[p.name] = {
              name: p.name,
              matches: 0,
              innings: 0,
              totalRuns: 0,
              totalBalls: 0,
              totalFours: 0,
              totalSixes: 0,
              highestScore: 0,
              totalWickets: 0,
              totalBallsBowled: 0,
              totalRunsConceded: 0,
              bestWickets: 0,
              bestRuns: 999,
              fifties: 0,
              hundreds: 0,
            }
          }
          if (p.balls > 0) {
            playerMap[p.name].totalWickets += p.wickets
            playerMap[p.name].totalBallsBowled += p.balls
            playerMap[p.name].totalRunsConceded += p.runs
            if (
              p.wickets > playerMap[p.name].bestWickets ||
              (p.wickets === playerMap[p.name].bestWickets && p.runs < playerMap[p.name].bestRuns)
            ) {
              playerMap[p.name].bestWickets = p.wickets
              playerMap[p.name].bestRuns = p.runs
            }
          }
        })
      })

      // Count matches per player
      const allPlayers = [
        ...(match.team1Players || []),
        ...(match.team2Players || [])
      ]
      allPlayers.forEach(name => {
        if (playerMap[name]) {
          playerMap[name].matches += 1
        }
      })
    })

    return Object.values(playerMap)
  }

  const players = calculateStats()

  const battingRankings = [...players]
    .filter(p => p.totalRuns > 0)
    .sort((a, b) => b.totalRuns - a.totalRuns)

  const bowlingRankings = [...players]
    .filter(p => p.totalWickets > 0)
    .sort((a, b) => b.totalWickets - a.totalWickets)

  const getStrikeRate = (runs, balls) => {
    if (balls === 0) return '-'
    return ((runs / balls) * 100).toFixed(1)
  }

  const getAverage = (runs, innings) => {
    if (innings === 0) return '-'
    return (runs / innings).toFixed(1)
  }

  const getEconomy = (runs, balls) => {
    if (balls === 0) return '-'
    return ((runs / balls) * 6).toFixed(1)
  }

  const getBowlingAverage = (runs, wickets) => {
    if (wickets === 0) return '-'
    return (runs / wickets).toFixed(1)
  }

  const getMedalColor = (index) => {
    if (index === 0) return '#FFD700'
    if (index === 1) return '#C0C0C0'
    if (index === 2) return '#CD7F32'
    return '#94a3b8'
  }

  return (
    <div>
      <h2>🏆 Player Rankings</h2>
      <p className="text-gray" style={{marginBottom:'16px'}}>
        Based on {matches.filter(m => m.status === 'completed').length} completed matches
      </p>

      {/* Tabs */}
      <div style={{display:'flex', gap:'8px', marginBottom:'16px'}}>
        <button
          className={`btn ${activeTab === 'batting' ? 'btn-green' : 'btn-gray'}`}
          style={{flex:1}}
          onClick={() => setActiveTab('batting')}
        >
          🏏 Batting
        </button>
        <button
          className={`btn ${activeTab === 'bowling' ? 'btn-green' : 'btn-gray'}`}
          style={{flex:1}}
          onClick={() => setActiveTab('bowling')}
        >
          🎯 Bowling
        </button>
      </div>

      {/* Batting Rankings */}
      {activeTab === 'batting' && (
        <div>
          {battingRankings.length === 0 ? (
            <div className="card text-center">
              <p className="text-gray">No completed matches yet!</p>
            </div>
          ) : (
            <>
              {/* Top 3 Cards */}
              <div style={{display:'flex', gap:'8px', marginBottom:'16px'}}>
                {battingRankings.slice(0, 3).map((p, i) => (
                  <div key={p.name} className="card text-center" style={{
                    flex:1, borderColor: getMedalColor(i), borderWidth:'2px'
                  }}>
                    <div style={{fontSize:'24px'}}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                    </div>
                    <p style={{fontWeight:'700', fontSize:'13px', marginTop:'4px'}}>{p.name}</p>
                    <div style={{fontSize:'28px', fontWeight:'800', color: getMedalColor(i)}}>
                      {p.totalRuns}
                    </div>
                    <p style={{fontSize:'11px', color:'#94a3b8'}}>runs</p>
                    <p style={{fontSize:'11px', color:'#94a3b8'}}>HS: {p.highestScore}</p>
                  </div>
                ))}
              </div>

              {/* Full Table */}
              <div className="card">
                <h3 style={{marginBottom:'12px'}}>Batting Leaderboard</h3>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%', borderCollapse:'collapse', fontSize:'12px'}}>
                    <thead>
                      <tr style={{color:'#94a3b8', borderBottom:'1px solid #334155'}}>
                        <th style={{padding:'8px', textAlign:'left'}}>#</th>
                        <th style={{padding:'8px', textAlign:'left'}}>Player</th>
                        <th style={{padding:'6px'}}>M</th>
                        <th style={{padding:'6px'}}>Inn</th>
                        <th style={{padding:'6px'}}>Runs</th>
                        <th style={{padding:'6px'}}>HS</th>
                        <th style={{padding:'6px'}}>Avg</th>
                        <th style={{padding:'6px'}}>SR</th>
                        <th style={{padding:'6px'}}>4s</th>
                        <th style={{padding:'6px'}}>6s</th>
                        <th style={{padding:'6px'}}>50s</th>
                      </tr>
                    </thead>
                    <tbody>
                      {battingRankings.map((p, i) => (
                        <tr key={p.name} style={{
                          borderBottom:'1px solid #1e293b',
                          background: i < 3 ? '#1a2744' : 'transparent'
                        }}>
                          <td style={{padding:'8px', color: getMedalColor(i), fontWeight:'700'}}>
                            {i + 1}
                          </td>
                          <td style={{padding:'8px', fontWeight:'600'}}>{p.name}</td>
                          <td style={{padding:'6px', textAlign:'center'}}>{p.matches}</td>
                          <td style={{padding:'6px', textAlign:'center'}}>{p.innings}</td>
                          <td style={{padding:'6px', textAlign:'center', fontWeight:'700', color:'#16a34a'}}>
                            {p.totalRuns}
                          </td>
                          <td style={{padding:'6px', textAlign:'center'}}>{p.highestScore}</td>
                          <td style={{padding:'6px', textAlign:'center'}}>{getAverage(p.totalRuns, p.innings)}</td>
                          <td style={{padding:'6px', textAlign:'center'}}>{getStrikeRate(p.totalRuns, p.totalBalls)}</td>
                          <td style={{padding:'6px', textAlign:'center'}}>{p.totalFours}</td>
                          <td style={{padding:'6px', textAlign:'center'}}>{p.totalSixes}</td>
                          <td style={{padding:'6px', textAlign:'center'}}>{p.fifties}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Bowling Rankings */}
      {activeTab === 'bowling' && (
        <div>
          {bowlingRankings.length === 0 ? (
            <div className="card text-center">
              <p className="text-gray">No completed matches yet!</p>
            </div>
          ) : (
            <>
              {/* Top 3 Cards */}
              <div style={{display:'flex', gap:'8px', marginBottom:'16px'}}>
                {bowlingRankings.slice(0, 3).map((p, i) => (
                  <div key={p.name} className="card text-center" style={{
                    flex:1, borderColor: getMedalColor(i), borderWidth:'2px'
                  }}>
                    <div style={{fontSize:'24px'}}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                    </div>
                    <p style={{fontWeight:'700', fontSize:'13px', marginTop:'4px'}}>{p.name}</p>
                    <div style={{fontSize:'28px', fontWeight:'800', color: getMedalColor(i)}}>
                      {p.totalWickets}
                    </div>
                    <p style={{fontSize:'11px', color:'#94a3b8'}}>wickets</p>
                    <p style={{fontSize:'11px', color:'#94a3b8'}}>
                      Best: {p.bestWickets}/{p.bestRuns === 999 ? 0 : p.bestRuns}
                    </p>
                  </div>
                ))}
              </div>

              {/* Full Table */}
              <div className="card">
                <h3 style={{marginBottom:'12px'}}>Bowling Leaderboard</h3>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%', borderCollapse:'collapse', fontSize:'12px'}}>
                    <thead>
                      <tr style={{color:'#94a3b8', borderBottom:'1px solid #334155'}}>
                        <th style={{padding:'8px', textAlign:'left'}}>#</th>
                        <th style={{padding:'8px', textAlign:'left'}}>Player</th>
                        <th style={{padding:'6px'}}>M</th>
                        <th style={{padding:'6px'}}>Overs</th>
                        <th style={{padding:'6px'}}>Runs</th>
                        <th style={{padding:'6px'}}>Wkts</th>
                        <th style={{padding:'6px'}}>Best</th>
                        <th style={{padding:'6px'}}>Avg</th>
                        <th style={{padding:'6px'}}>Eco</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bowlingRankings.map((p, i) => (
                        <tr key={p.name} style={{
                          borderBottom:'1px solid #1e293b',
                          background: i < 3 ? '#1a2744' : 'transparent'
                        }}>
                          <td style={{padding:'8px', color: getMedalColor(i), fontWeight:'700'}}>
                            {i + 1}
                          </td>
                          <td style={{padding:'8px', fontWeight:'600'}}>{p.name}</td>
                          <td style={{padding:'6px', textAlign:'center'}}>{p.matches}</td>
                          <td style={{padding:'6px', textAlign:'center'}}>
                            {Math.floor(p.totalBallsBowled/6)}.{p.totalBallsBowled%6}
                          </td>
                          <td style={{padding:'6px', textAlign:'center'}}>{p.totalRunsConceded}</td>
                          <td style={{padding:'6px', textAlign:'center', fontWeight:'700', color:'#dc2626'}}>
                            {p.totalWickets}
                          </td>
                          <td style={{padding:'6px', textAlign:'center'}}>
                            {p.bestWickets}/{p.bestRuns === 999 ? 0 : p.bestRuns}
                          </td>
                          <td style={{padding:'6px', textAlign:'center'}}>
                            {getBowlingAverage(p.totalRunsConceded, p.totalWickets)}
                          </td>
                          <td style={{padding:'6px', textAlign:'center'}}>
                            {getEconomy(p.totalRunsConceded, p.totalBallsBowled)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default Players