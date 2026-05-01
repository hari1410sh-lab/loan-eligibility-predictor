import { useState, useRef, useEffect } from 'react'

/* ─────────────── helpers ─────────────── */
function calculateEMI(principal, rate, months) {
  const r = rate / 100 / 12
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
}

function formatINR(val) {
  const num = parseFloat(val)
  if (isNaN(num)) return '₹0'
  return '₹' + num.toLocaleString('en-IN')
}

function getCreditColor(score) {
  if (score < 600) return '#e63946'
  if (score <= 700) return '#ffd166'
  return '#06d6a0'
}

function scoreApplication(data) {
  const income = parseFloat(data.monthlyIncome) || 0
  const loan = parseFloat(data.loanAmount) || 0

  let creditPts = 0
  if (data.creditScore > 700) creditPts = 35
  else if (data.creditScore >= 600) creditPts = 20
  else creditPts = 0

  let ratioPts = 5
  if (income > 0 && loan > 0) {
    if (income * 50 > loan) ratioPts = 25
    else if (income * 30 > loan) ratioPts = 15
  }

  let empPts = 0
  if (data.employmentType === 'Salaried') empPts = 20
  else if (data.employmentType === 'Business') empPts = 15
  else empPts = 10

  let agePts = 0
  if (data.age >= 25 && data.age <= 50) agePts = 10
  else if (data.age > 60) agePts = 3
  else agePts = 6

  let purposePts = 0
  if (data.loanPurpose === 'Education' || data.loanPurpose === 'Home') purposePts = 10
  else if (data.loanPurpose === 'Vehicle' || data.loanPurpose === 'Medical') purposePts = 7
  else purposePts = 5

  return {
    creditPts, ratioPts, empPts, agePts, purposePts,
    total: creditPts + ratioPts + empPts + agePts + purposePts,
  }
}

/* ─────────────── keyframe injection ─────────────── */
const KEYFRAMES = `
  @keyframes fadeInUp {
    from { opacity:0; transform:translateY(32px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes stampIn {
    0%   { opacity:0; transform:scale(2.2) rotate(-15deg); }
    60%  { transform:scale(0.9) rotate(2deg); }
    80%  { transform:scale(1.06) rotate(-1deg); }
    100% { opacity:1; transform:scale(1) rotate(0deg); }
  }
  @keyframes tickIn {
    0%   { opacity:0; transform:scale(0) rotate(-45deg); }
    60%  { transform:scale(1.25) rotate(6deg); }
    100% { opacity:1; transform:scale(1) rotate(0deg); }
  }
  @keyframes pulseGlow {
    0%,100% { box-shadow:0 0 18px rgba(230,57,70,0.35); }
    50%     { box-shadow:0 0 38px rgba(255,23,68,0.65); }
  }
  @keyframes floatA {
    0%,100% { transform:translateY(0) translateX(0);   opacity:0.15; }
    33%     { transform:translateY(-28px) translateX(22px); opacity:0.24; }
    66%     { transform:translateY(18px) translateX(-14px); opacity:0.09; }
  }
  @keyframes floatB {
    0%,100% { transform:translateY(0) translateX(0);   opacity:0.10; }
    33%     { transform:translateY(24px) translateX(-18px); opacity:0.20; }
    66%     { transform:translateY(-18px) translateX(22px); opacity:0.07; }
  }
  @keyframes fillBar { from { width:0%; } }
  @keyframes dashProgress { from { stroke-dashoffset:283; } }

  .fadeInUp   { animation: fadeInUp 0.55s ease-out both; }
  .stampIn    { animation: stampIn  0.6s cubic-bezier(.175,.885,.32,1.275) both; }
  .tickIn     { animation: tickIn   0.5s cubic-bezier(.175,.885,.32,1.275) 0.3s both; }
  .pulseGlow  { animation: pulseGlow 2s ease-in-out infinite; }
  .orbA { position:fixed; border-radius:50%; pointer-events:none; z-index:0;
          animation:floatA 9s ease-in-out infinite; }
  .orbB { position:fixed; border-radius:50%; pointer-events:none; z-index:0;
          animation:floatB 11s ease-in-out infinite; }
  .orbC { position:fixed; border-radius:50%; pointer-events:none; z-index:0;
          animation:floatA 13s ease-in-out infinite reverse; }
  .fillBar { animation: fillBar 1s ease-out both; }
  .gauge   { animation: dashProgress 1.4s ease-out both; }

  input[type=range] {
    -webkit-appearance:none; appearance:none;
    width:100%; height:4px; border-radius:2px;
    background:#2a2a2a; outline:none; cursor:pointer;
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance:none; width:18px; height:18px;
    border-radius:50%; background:#e63946; cursor:pointer;
    box-shadow:0 0 8px rgba(230,57,70,.6);
    transition:box-shadow .2s;
  }
  input[type=range]::-moz-range-thumb {
    width:18px; height:18px; border-radius:50%;
    background:#e63946; cursor:pointer; border:none;
    box-shadow:0 0 8px rgba(230,57,70,.6);
  }
  ::-webkit-scrollbar { width:6px; }
  ::-webkit-scrollbar-track { background:#111; }
  ::-webkit-scrollbar-thumb { background:#333; border-radius:3px; }
  ::-webkit-scrollbar-thumb:hover { background:#e63946; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:#0a0a0a; color:#fff;
         font-family:system-ui,-apple-system,sans-serif;
         -webkit-font-smoothing:antialiased; }
`

/* ─────────────── sub-components ─────────────── */
function CircularGauge({ pct, size = 130 }) {
  const r = 45
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e1e1e" strokeWidth="8" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="#e63946" strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          className="gauge"
          style={{ filter: 'drop-shadow(0 0 6px rgba(230,57,70,.7))' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.22, fontWeight: 700, color: '#e63946', lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontSize: size * 0.1, color: '#888', marginTop: 2 }}>confidence</span>
      </div>
    </div>
  )
}

function Bar({ label, value, max }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: '#ccc' }}>{label}</span>
        <span style={{ fontSize: 13, color: '#e63946', fontWeight: 600 }}>{value}/{max} pts</span>
      </div>
      <div style={{ height: 6, background: '#1e1e1e', borderRadius: 3, overflow: 'hidden' }}>
        <div
          className="fillBar"
          style={{
            height: '100%', width: `${pct}%`,
            background: 'linear-gradient(90deg,#e63946,#ff1744aa)',
            borderRadius: 3, boxShadow: '0 0 8px rgba(230,57,70,.5)',
          }}
        />
      </div>
    </div>
  )
}

/* ─────────────── main component ─────────────── */
export default function App() {
  const [form, setForm] = useState({
    fullName: '', age: 30, monthlyIncome: '', loanAmount: '',
    employmentType: 'Salaried', creditScore: 700, loanPurpose: 'Home',
  })
  const [result, setResult] = useState(null)
  const [tenure, setTenure] = useState(36)
  const [focused, setFocused] = useState(null)
  const resultRef = useRef(null)

  useEffect(() => {
    if (result && resultRef.current) {
      setTimeout(() => resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    }
  }, [result])

  function handleSubmit() {
    if (!form.fullName.trim() || !form.monthlyIncome || !form.loanAmount) return
    const bd = scoreApplication(form)
    const eligible = bd.total >= 60
    const income = parseFloat(form.monthlyIncome) || 0
    const loan = parseFloat(form.loanAmount) || 0

    const failed = []
    const tips = []
    if (form.creditScore < 600) {
      failed.push('Credit Score')
      tips.push({ f: 'Credit Score', t: 'Improve your credit score above 600 by paying bills on time and reducing outstanding debt.' })
    }
    if (income * 30 <= loan) {
      failed.push('Income vs Loan Ratio')
      tips.push({ f: 'Income vs Loan Ratio', t: 'Increase monthly income or request a smaller loan. Aim for monthly income ≥ loan ÷ 30.' })
    }
    if (form.age > 60) {
      failed.push('Age Bracket')
      tips.push({ f: 'Age Bracket', t: 'Consider applying with a younger co-applicant or choose a shorter loan tenure.' })
    }
    if (form.employmentType === 'Self-Employed') {
      tips.push({ f: 'Employment Type', t: 'Provide ITR filings and consistent income proof to strengthen a self-employed application.' })
    }
    setResult({ eligible, score: bd.total, bd, failed, tips })
  }

  function handleReset() {
    setForm({ fullName: '', age: 30, monthlyIncome: '', loanAmount: '', employmentType: 'Salaried', creditScore: 700, loanPurpose: 'Home' })
    setResult(null)
    setTenure(36)
  }

  const inp = (field) => ({
    width: '100%', padding: '12px 16px',
    background: '#0d0d0d',
    border: `1px solid ${focused === field ? '#e63946' : '#2a2a2a'}`,
    borderRadius: 8, color: '#fff', fontSize: 15, outline: 'none',
    transition: 'border-color .2s, box-shadow .2s',
    boxShadow: focused === field ? '0 0 12px rgba(230,57,70,.22)' : 'none',
  })

  const lbl = { display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 500, color: '#888', letterSpacing: '0.06em', textTransform: 'uppercase' }
  const card = { background: '#111', border: '1px solid #1e1e1e', borderRadius: 16, padding: 28 }

  const loanNum = parseFloat(form.loanAmount) || 0
  const emi = loanNum > 0 ? calculateEMI(loanNum, 8.5, tenure) : 0
  const ccol = getCreditColor(form.creditScore)
  const canSubmit = form.fullName.trim() && form.monthlyIncome && form.loanAmount

  return (
    <>
      <style>{KEYFRAMES}</style>

      {/* Grid background */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(230,57,70,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(230,57,70,.03) 1px,transparent 1px)',
        backgroundSize: '50px 50px',
      }} />

      {/* Orbs */}
      <div className="orbA" style={{ top: '8%', right: '4%', width: 400, height: 400, background: 'radial-gradient(circle,rgba(180,20,30,.28) 0%,transparent 70%)' }} />
      <div className="orbB" style={{ bottom: '12%', left: '4%', width: 340, height: 340, background: 'radial-gradient(circle,rgba(160,10,20,.20) 0%,transparent 70%)' }} />
      <div className="orbC" style={{ top: '50%', left: '38%', width: 300, height: 300, background: 'radial-gradient(circle,rgba(200,30,40,.14) 0%,transparent 70%)' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto', padding: '40px 20px 64px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(230,57,70,.14)', border: '1px solid rgba(230,57,70,.38)',
            borderRadius: 20, padding: '4px 14px',
            fontSize: 11, fontWeight: 700, color: '#e63946',
            letterSpacing: '0.12em', marginBottom: 20,
          }}>AI POWERED</div>
          <h1 style={{ fontSize: 'clamp(28px,5vw,44px)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 12 }}>
            Loan Eligibility<br />
            <span style={{ color: '#e63946' }}>Predictor</span>
          </h1>
          <p style={{ color: '#666', fontSize: 15 }}>Advanced AI scoring engine — get your loan decision in seconds</p>
        </div>

        {/* ── Form Card ── */}
        <div className="fadeInUp" style={card}>
          <h2 style={{ fontSize: 17, fontWeight: 600, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #1e1e1e' }}>
            Applicant Details
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Full Name */}
            <div>
              <label style={lbl}>Full Name</label>
              <input type="text" placeholder="Enter your full name"
                value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                onFocus={() => setFocused('name')} onBlur={() => setFocused(null)}
                style={inp('name')} />
            </div>

            {/* Age */}
            <div>
              <label style={lbl}>
                Age <span style={{ float: 'right', color: '#e63946', fontWeight: 700, fontSize: 15, textTransform: 'none', letterSpacing: 0 }}>{form.age} years</span>
              </label>
              <input type="range" min={18} max={65} value={form.age}
                onChange={e => setForm(f => ({ ...f, age: +e.target.value }))}
                style={{ marginTop: 4 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 11, color: '#555' }}>18</span>
                <span style={{ fontSize: 11, color: '#555' }}>65</span>
              </div>
            </div>

            {/* Income + Loan */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: 'Monthly Income', field: 'monthlyIncome' },
                { label: 'Loan Amount',    field: 'loanAmount' },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label style={lbl}>{label}</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#666', fontSize: 15 }}>₹</span>
                    <input type="number" placeholder="0"
                      value={form[field]}
                      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                      onFocus={() => setFocused(field)} onBlur={() => setFocused(null)}
                      style={{ ...inp(field), paddingLeft: 28 }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Employment Type */}
            <div>
              <label style={lbl}>Employment Type</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {['Salaried', 'Self-Employed', 'Business'].map(type => {
                  const active = form.employmentType === type
                  return (
                    <button key={type} onClick={() => setForm(f => ({ ...f, employmentType: type }))}
                      style={{
                        flex: 1, padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
                        border: `1px solid ${active ? '#e63946' : '#2a2a2a'}`,
                        background: active ? 'rgba(230,57,70,.15)' : '#0d0d0d',
                        color: active ? '#e63946' : '#888',
                        fontSize: 13, fontWeight: active ? 600 : 400,
                        boxShadow: active ? '0 0 12px rgba(230,57,70,.18)' : 'none',
                        transition: 'all .18s',
                      }}>
                      {type}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Credit Score */}
            <div>
              <label style={lbl}>
                Credit Score
                <span style={{ float: 'right', color: ccol, fontWeight: 700, fontSize: 15, textTransform: 'none', letterSpacing: 0, transition: 'color .3s' }}>
                  {form.creditScore}
                  <span style={{ fontSize: 11, fontWeight: 400, color: '#666', marginLeft: 6 }}>
                    {form.creditScore < 600 ? 'Poor' : form.creditScore <= 700 ? 'Fair' : 'Good'}
                  </span>
                </span>
              </label>
              <input type="range" min={300} max={900} value={form.creditScore}
                onChange={e => setForm(f => ({ ...f, creditScore: +e.target.value }))}
                style={{ marginTop: 4, accentColor: ccol }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 11, color: '#e63946' }}>300 Poor</span>
                <span style={{ fontSize: 11, color: '#ffd166' }}>600 Fair</span>
                <span style={{ fontSize: 11, color: '#06d6a0' }}>900 Excellent</span>
              </div>
            </div>

            {/* Loan Purpose */}
            <div>
              <label style={lbl}>Loan Purpose</label>
              <select value={form.loanPurpose}
                onChange={e => setForm(f => ({ ...f, loanPurpose: e.target.value }))}
                onFocus={() => setFocused('purpose')} onBlur={() => setFocused(null)}
                style={{
                  ...inp('purpose'), appearance: 'none', cursor: 'pointer',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center',
                }}>
                {['Home', 'Education', 'Vehicle', 'Medical', 'Business'].map(p => (
                  <option key={p} value={p} style={{ background: '#111' }}>{p}</option>
                ))}
              </select>
            </div>

            {/* Submit */}
            <button onClick={handleSubmit} disabled={!canSubmit}
              style={{
                width: '100%', padding: 16, borderRadius: 10, border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed',
                background: canSubmit ? 'linear-gradient(135deg,#e63946,#ff1744)' : '#2a2a2a',
                color: canSubmit ? '#000' : '#555',
                fontSize: 15, fontWeight: 700, letterSpacing: '0.05em',
                boxShadow: canSubmit ? '0 0 20px rgba(230,57,70,.38)' : 'none',
                transition: 'all .2s',
              }}
              onMouseEnter={e => { if (canSubmit) { e.target.style.boxShadow = '0 0 32px rgba(255,23,68,.62)'; e.target.style.transform = 'translateY(-1px)' } }}
              onMouseLeave={e => { if (canSubmit) { e.target.style.boxShadow = '0 0 20px rgba(230,57,70,.38)'; e.target.style.transform = 'translateY(0)' } }}
            >
              CHECK ELIGIBILITY
            </button>
          </div>
        </div>

        {/* ── Result Card ── */}
        {result && (
          <div ref={resultRef} className="fadeInUp" style={{ marginTop: 24 }}>
            <div
              className={result.eligible ? 'pulseGlow' : ''}
              style={{
                background: '#111', borderRadius: 16, padding: 28,
                border: `1px solid ${result.eligible ? '#e63946' : '#4a1010'}`,
              }}>

              {/* Verdict */}
              <div style={{ textAlign: 'center', marginBottom: 32 }}>
                {result.eligible ? (
                  <>
                    <div className="tickIn" style={{ fontSize: 46, marginBottom: 6 }}>✓</div>
                    <div className="stampIn" style={{
                      fontSize: 46, fontWeight: 900, color: '#e63946',
                      letterSpacing: '0.06em', fontStyle: 'italic',
                      textShadow: '0 0 28px rgba(255,23,68,.55)',
                    }}>APPROVED</div>
                    <p style={{ color: '#888', marginTop: 8, fontSize: 14 }}>
                      Congratulations, {form.fullName.split(' ')[0]}! Your application looks promising.
                    </p>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 40, marginBottom: 8, color: '#e63946' }}>✗</div>
                    <div style={{ fontSize: 38, fontWeight: 900, color: '#e63946', letterSpacing: '0.04em' }}>NOT ELIGIBLE</div>
                    <p style={{ color: '#888', marginTop: 8, fontSize: 14 }}>
                      Based on current information, this application cannot be approved.
                    </p>
                  </>
                )}
              </div>

              {/* Gauge row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, marginBottom: 32, flexWrap: 'wrap' }}>
                <CircularGauge pct={result.score} size={130} />
                <div>
                  <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Overall Score</div>
                  <div style={{ fontSize: 38, fontWeight: 800, color: '#e63946' }}>{result.score}/100</div>
                  <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
                    {result.eligible ? 'Above eligibility threshold' : 'Below 60-point threshold'}
                  </div>
                  <div style={{
                    display: 'inline-block', marginTop: 10,
                    padding: '4px 12px', borderRadius: 20,
                    background: result.eligible ? 'rgba(6,214,160,.14)' : 'rgba(230,57,70,.14)',
                    border: `1px solid ${result.eligible ? 'rgba(6,214,160,.38)' : 'rgba(230,57,70,.38)'}`,
                    color: result.eligible ? '#06d6a0' : '#e63946',
                    fontSize: 12, fontWeight: 600,
                  }}>
                    {result.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE'}
                  </div>
                </div>
              </div>

              {/* Score Breakdown */}
              <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: 24, marginBottom: 24 }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Score Breakdown</h3>
                <Bar label="Credit Score"          value={result.bd.creditPts} max={35} />
                <Bar label="Income vs Loan Ratio"  value={result.bd.ratioPts}  max={25} />
                <Bar label="Employment Type"       value={result.bd.empPts}    max={20} />
                <Bar label="Age Bracket"           value={result.bd.agePts}    max={10} />
                <Bar label="Loan Purpose"          value={result.bd.purposePts} max={10} />
              </div>

              {/* EMI Calculator */}
              {result.eligible && loanNum > 0 && (
                <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: 24, marginBottom: 24 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>EMI Calculator (8.5% p.a.)</h3>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                    {[12, 24, 36, 48, 60].map(m => (
                      <button key={m} onClick={() => setTenure(m)}
                        style={{
                          padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                          border: `1px solid ${tenure === m ? '#e63946' : '#2a2a2a'}`,
                          background: tenure === m ? 'rgba(230,57,70,.15)' : '#0d0d0d',
                          color: tenure === m ? '#e63946' : '#888',
                          fontSize: 13, fontWeight: tenure === m ? 600 : 400,
                          transition: 'all .15s',
                        }}>
                        {m} mo
                      </button>
                    ))}
                  </div>
                  <div style={{
                    background: '#0d0d0d', borderRadius: 12, padding: '20px 24px',
                    border: '1px solid #1e1e1e',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
                  }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>Loan Amount</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{formatINR(form.loanAmount)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>Tenure</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{tenure} months</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>Monthly EMI</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: '#e63946' }}>
                        {formatINR(Math.round(emi).toString())}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Failed factors */}
              {!result.eligible && result.failed.length > 0 && (
                <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: 24, marginBottom: 24 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Failed Factors</h3>
                  {result.failed.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span style={{ color: '#e63946', fontSize: 16 }}>✗</span>
                      <span style={{ color: '#ccc', fontSize: 14 }}>{f}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Improvement tips */}
              {result.tips.length > 0 && (
                <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: 24, marginBottom: 24 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Improvement Tips</h3>
                  {result.tips.map(tip => (
                    <div key={tip.f} style={{
                      background: '#0d0d0d', border: '1px solid #1e1e1e',
                      borderRadius: 10, padding: '14px 16px', marginBottom: 10,
                    }}>
                      <div style={{ fontSize: 11, color: '#e63946', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{tip.f}</div>
                      <div style={{ fontSize: 14, color: '#aaa', lineHeight: 1.55 }}>{tip.t}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reset */}
              <button onClick={handleReset}
                style={{
                  width: '100%', padding: 14, borderRadius: 10, cursor: 'pointer',
                  border: '1px solid #e63946', background: 'transparent',
                  color: '#e63946', fontSize: 14, fontWeight: 600,
                  letterSpacing: '0.05em', transition: 'background .2s',
                }}
                onMouseEnter={e => { e.target.style.background = 'rgba(230,57,70,.1)' }}
                onMouseLeave={e => { e.target.style.background = 'transparent' }}
              >
                CHECK ANOTHER PROFILE
              </button>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p style={{ textAlign: 'center', color: '#3a3a3a', fontSize: 12, marginTop: 32, lineHeight: 1.7 }}>
          This tool is for educational purposes only. Results do not constitute actual loan approval or financial advice.<br />
          Please consult a qualified financial advisor before making any financial decisions.
        </p>
      </div>
    </>
  )
}
