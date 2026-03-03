import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import html2canvas from 'html2canvas'

function MatchReport() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [match, setMatch] = useState(null)
  const reportRef = useRef()

  useEffect(() => {
    axios.get(`http://localhost:5000/api/matches/${id}`)
      .then(res => setMatch(res.data))
  }, [])

  const downloadImage = async () => {
    const canvas = await html2canvas(reportRef.current, {
      backgroundColor: '#0f172a',
      scale: 2,
    })
    const link = document.createElement('a')
    link.download = `CrickyWorld_${match.team1}_vs_${match.team2}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const shareWhatsApp = async () => {
    const canvas = await html2canvas(reportRef.current, {
      backgroundColor: '#0f172a',
      scale: 2,
    })

    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'scorecard.png', { type: 'image/png' })

      if (navigator.share && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `CrickyWorld - ${match.team1} vs ${match.team2}`,
            text: `Match Report: ${match.result}`,
            files: [file],
          })
        } catch (err) {
          console.log('Share cancelled')
        }
      } else {
        // Fallback - just download
        downloadImage()
        alert('Image downloaded! You can share it on WhatsApp manually.')
      }
    })
  }

  const getStrikeRate = (runs, balls) => {
    if (balls === 0) return '0.00'
    return ((runs / balls) * 100).toFixed(1)
  }

  const getEconomy = (runs, balls) => {
    if (balls === 0) return '0.00'
    return ((runs / balls) * 6).toFixed(1)
  }

  if (!match) return <div className="card text-center">Loading...</div>

  const date = new Date(match.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  })

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
        <h2>📊 Match Report</h2>
        <button className="btn btn-gray" onClick={() => navigate(-1)}>← Back</button>
      </div>

      {/* Action Buttons */}
      <div className="card text-center" style={{marginBottom:'16px'}}>
        <p className="text-gray" style={{marginBottom:'12px'}}>
          Download or share this scorecard
        </p>
        <button className="btn btn-green" onClick={downloadImage}>
          📥 Download Image
        </button>
        <button className="btn btn-blue" onClick={shareWhatsApp}>
          📤 Share (WhatsApp)
        </button>
      </div>

      {/* SCORECARD - this gets captured as image */}
      <div ref={reportRef} style={{
        background: '#0f172a',
        padding: '24px',
        borderRadius: '16px',
        fontFamily: 'Segoe UI, sans-serif',
        color: '#f1f5f9',
        maxWidth: '600px',
        margin: '0 auto',
      }}>

        {/* Header */}
        <div style={{
          textAlign: 'center',
          borderBottom: '2px solid #16a34a',
          paddingBottom: '16px',
          marginBottom: '20px',
        }}>
          <h2 style={{color:'#16a34a', fontSize:'22px', marginBottom:'4px'}}>
            🏏 CrickyWorld
          </h2>
          <p style={{color:'#94a3b8', fontSize:'13px'}}>{date}</p>
        </div>

        {/* Match Title */}
        <div style={{textAlign:'center', marginBottom:'20px'}}>
          <h2 style={{fontSize:'20px', marginBottom:'4px'}}>
            {match.team1} vs {match.team2}
          </h2>
          <p style={{color:'#94a3b8', fontSize:'13px'}}>
            {match.overs} Overs | Toss: {match.tossWinner} won
          </p>
        </div>

        {/* Score Summary */}
        <div style={{
          display:'grid',
          gridTemplateColumns:'1fr 1fr',
          gap:'12px',
          marginBottom:'20px',
        }}>
          <div style={{
            background:'#1e293b',
            borderRadius:'12px',
            padding:'16px',
            textAlign:'center',
            border:'1px solid #334155',
          }}>
            <p style={{color:'#94a3b8', fontSize:'12px', marginBottom:'4px'}}>
              {match.innings1.battingTeam}
            </p>
            <p style={{
              fontSize:'32px',
              fontWeight:'800',
              color:'#16a34a',
              lineHeight:'1',
              marginBottom:'4px',
            }}>
              {match.innings1.runs}/{match.innings1.wickets}
            </p>
            <p style={{color:'#94a3b8', fontSize:'12px'}}>
              {match.overs} overs
            </p>
          </div>
          <div style={{
            background:'#1e293b',
            borderRadius:'12px',
            padding:'16px',
            textAlign:'center',
            border:'1px solid #334155',
          }}>
            <p style={{color:'#94a3b8', fontSize:'12px', marginBottom:'4px'}}>
              {match.innings2.battingTeam}
            </p>
            <p style={{
              fontSize:'32px',
              fontWeight:'800',
              color:'#2563eb',
              lineHeight:'1',
              marginBottom:'4px',
            }}>
              {match.innings2.runs}/{match.innings2.wickets}
            </p>
            <p style={{color:'#94a3b8', fontSize:'12px'}}>
              {Math.floor(match.innings2.balls/6)}.{match.innings2.balls%6} overs
            </p>
          </div>
        </div>

        {/* Result */}
        <div style={{
          background:'#166534',
          borderRadius:'12px',
          padding:'14px',
          textAlign:'center',
          marginBottom:'20px',
        }}>
          <p style={{fontSize:'18px', fontWeight:'700', color:'#86efac'}}>
            🏆 {match.result}
          </p>
        </div>

        {/* Innings 1 Batting */}
        <div style={{marginBottom:'20px'}}>
          <h3 style={{
            color:'#16a34a',
            fontSize:'15px',
            marginBottom:'10px',
            borderBottom:'1px solid #334155',
            paddingBottom:'6px',
          }}>
            🏏 {match.innings1.battingTeam} Batting
          </h3>
          <table style={{width:'100%', borderCollapse:'collapse', fontSize:'12px'}}>
            <thead>
              <tr style={{color:'#94a3b8'}}>
                <th style={{textAlign:'left', padding:'4px'}}>Batsman</th>
                <th style={{padding:'4px', textAlign:'center'}}>R</th>
                <th style={{padding:'4px', textAlign:'center'}}>B</th>
                <th style={{padding:'4px', textAlign:'center'}}>4s</th>
                <th style={{padding:'4px', textAlign:'center'}}>6s</th>
                <th style={{padding:'4px', textAlign:'center'}}>SR</th>
              </tr>
            </thead>
            <tbody>
              {match.innings1.battingStats.filter(p => p.balls > 0 || p.isOut).map(p => (
                <tr key={p.name} style={{borderBottom:'1px solid #1e293b'}}>
                  <td style={{padding:'5px 4px'}}>
                    {p.name}
                    <span style={{color: p.isOut ? '#dc2626' : '#16a34a', fontSize:'10px'}}>
                      {p.isOut ? ' (out)' : ' *'}
                    </span>
                  </td>
                  <td style={{padding:'4px', textAlign:'center', fontWeight:'700'}}>{p.runs}</td>
                  <td style={{padding:'4px', textAlign:'center'}}>{p.balls}</td>
                  <td style={{padding:'4px', textAlign:'center'}}>{p.fours}</td>
                  <td style={{padding:'4px', textAlign:'center'}}>{p.sixes}</td>
                  <td style={{padding:'4px', textAlign:'center'}}>{getStrikeRate(p.runs, p.balls)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{borderTop:'1px solid #334155', fontWeight:'700'}}>
                <td style={{padding:'5px 4px', color:'#16a34a'}}>Total</td>
                <td colSpan="5" style={{padding:'4px', textAlign:'center', color:'#94a3b8'}}>
                  {match.innings1.runs}/{match.innings1.wickets} in {match.overs} overs
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Innings 1 Bowling */}
        <div style={{marginBottom:'20px'}}>
          <h3 style={{
            color:'#dc2626',
            fontSize:'15px',
            marginBottom:'10px',
            borderBottom:'1px solid #334155',
            paddingBottom:'6px',
          }}>
            🎯 {match.innings2.battingTeam} Bowling
          </h3>
          <table style={{width:'100%', borderCollapse:'collapse', fontSize:'12px'}}>
            <thead>
              <tr style={{color:'#94a3b8'}}>
                <th style={{textAlign:'left', padding:'4px'}}>Bowler</th>
                <th style={{padding:'4px', textAlign:'center'}}>O</th>
                <th style={{padding:'4px', textAlign:'center'}}>R</th>
                <th style={{padding:'4px', textAlign:'center'}}>W</th>
                <th style={{padding:'4px', textAlign:'center'}}>Eco</th>
              </tr>
            </thead>
            <tbody>
              {match.innings1.bowlingStats.filter(p => p.balls > 0).map(p => (
                <tr key={p.name} style={{borderBottom:'1px solid #1e293b'}}>
                  <td style={{padding:'5px 4px'}}>{p.name}</td>
                  <td style={{padding:'4px', textAlign:'center'}}>{Math.floor(p.balls/6)}.{p.balls%6}</td>
                  <td style={{padding:'4px', textAlign:'center'}}>{p.runs}</td>
                  <td style={{padding:'4px', textAlign:'center', fontWeight:'700', color:'#dc2626'}}>{p.wickets}</td>
                  <td style={{padding:'4px', textAlign:'center'}}>{getEconomy(p.runs, p.balls)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Innings 2 Batting */}
        <div style={{marginBottom:'20px'}}>
          <h3 style={{
            color:'#2563eb',
            fontSize:'15px',
            marginBottom:'10px',
            borderBottom:'1px solid #334155',
            paddingBottom:'6px',
          }}>
            🏏 {match.innings2.battingTeam} Batting
          </h3>
          <table style={{width:'100%', borderCollapse:'collapse', fontSize:'12px'}}>
            <thead>
              <tr style={{color:'#94a3b8'}}>
                <th style={{textAlign:'left', padding:'4px'}}>Batsman</th>
                <th style={{padding:'4px', textAlign:'center'}}>R</th>
                <th style={{padding:'4px', textAlign:'center'}}>B</th>
                <th style={{padding:'4px', textAlign:'center'}}>4s</th>
                <th style={{padding:'4px', textAlign:'center'}}>6s</th>
                <th style={{padding:'4px', textAlign:'center'}}>SR</th>
              </tr>
            </thead>
            <tbody>
              {match.innings2.battingStats.filter(p => p.balls > 0 || p.isOut).map(p => (
                <tr key={p.name} style={{borderBottom:'1px solid #1e293b'}}>
                  <td style={{padding:'5px 4px'}}>
                    {p.name}
                    <span style={{color: p.isOut ? '#dc2626' : '#16a34a', fontSize:'10px'}}>
                      {p.isOut ? ' (out)' : ' *'}
                    </span>
                  </td>
                  <td style={{padding:'4px', textAlign:'center', fontWeight:'700'}}>{p.runs}</td>
                  <td style={{padding:'4px', textAlign:'center'}}>{p.balls}</td>
                  <td style={{padding:'4px', textAlign:'center'}}>{p.fours}</td>
                  <td style={{padding:'4px', textAlign:'center'}}>{p.sixes}</td>
                  <td style={{padding:'4px', textAlign:'center'}}>{getStrikeRate(p.runs, p.balls)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{borderTop:'1px solid #334155', fontWeight:'700'}}>
                <td style={{padding:'5px 4px', color:'#2563eb'}}>Total</td>
                <td colSpan="5" style={{padding:'4px', textAlign:'center', color:'#94a3b8'}}>
                  {match.innings2.runs}/{match.innings2.wickets} in {Math.floor(match.innings2.balls/6)}.{match.innings2.balls%6} overs
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Innings 2 Bowling */}
        <div style={{marginBottom:'20px'}}>
          <h3 style={{
            color:'#dc2626',
            fontSize:'15px',
            marginBottom:'10px',
            borderBottom:'1px solid #334155',
            paddingBottom:'6px',
          }}>
            🎯 {match.innings1.battingTeam} Bowling
          </h3>
          <table style={{width:'100%', borderCollapse:'collapse', fontSize:'12px'}}>
            <thead>
              <tr style={{color:'#94a3b8'}}>
                <th style={{textAlign:'left', padding:'4px'}}>Bowler</th>
                <th style={{padding:'4px', textAlign:'center'}}>O</th>
                <th style={{padding:'4px', textAlign:'center'}}>R</th>
                <th style={{padding:'4px', textAlign:'center'}}>W</th>
                <th style={{padding:'4px', textAlign:'center'}}>Eco</th>
              </tr>
            </thead>
            <tbody>
              {match.innings2.bowlingStats.filter(p => p.balls > 0).map(p => (
                <tr key={p.name} style={{borderBottom:'1px solid #1e293b'}}>
                  <td style={{padding:'5px 4px'}}>{p.name}</td>
                  <td style={{padding:'4px', textAlign:'center'}}>{Math.floor(p.balls/6)}.{p.balls%6}</td>
                  <td style={{padding:'4px', textAlign:'center'}}>{p.runs}</td>
                  <td style={{padding:'4px', textAlign:'center', fontWeight:'700', color:'#dc2626'}}>{p.wickets}</td>
                  <td style={{padding:'4px', textAlign:'center'}}>{getEconomy(p.runs, p.balls)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{
          textAlign:'center',
          borderTop:'1px solid #334155',
          paddingTop:'12px',
          color:'#475569',
          fontSize:'12px',
        }}>
          Generated by 🏏 CrickyWorld App
        </div>
      </div>
    </div>
  )
}

export default MatchReport