import { useEffect, useMemo, useState } from "react";

const KEYS = {
  voters: "votesecure_voters",
  candidates: "votesecure_candidates",
  votes: "votesecure_votes",
  settings: "votesecure_settings"
};

const defaultCandidates = [
  { name: "Candidate A", details: "Student Development", symbol: "🌱" },
  { name: "Candidate B", details: "Education & Innovation", symbol: "📘" },
  { name: "Candidate C", details: "Student Welfare", symbol: "🤝" }
];

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

const defaultSettings = {
  votingEnabled: true,
  startTime: "",
  endTime: "",
  maxVoters: 50,
  resultsPublished: false
};

function App() {
  const [view, setView] = useState("home");
  const [voters, setVoters] = useState(() => readStorage(KEYS.voters, []));
  const [candidates, setCandidates] = useState(() => readStorage(KEYS.candidates, defaultCandidates));
  const [votes, setVotes] = useState(() => {
    const stored = readStorage(KEYS.votes, [12, 18, 10]);
    const list = Array.isArray(stored) ? [...stored] : [12, 18, 10];
    const count = readStorage(KEYS.candidates, defaultCandidates).length;
    while (list.length < count) list.push(0);
    return list.slice(0, count);
  });
  const [settings, setSettings] = useState(() => ({
    ...defaultSettings,
    ...readStorage(KEYS.settings, {})
  }));
  const [currentVoter, setCurrentVoter] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [generatedOTP, setGeneratedOTP] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [voterForm, setVoterForm] = useState({
    voterId: "", name: "", email: "", mobile: "", otp: ""
  });
  const [adminForm, setAdminForm] = useState({ username: "", password: "" });
  const [candidateForm, setCandidateForm] = useState({
    name: "", details: "", symbol: ""
  });
  const [settingsForm, setSettingsForm] = useState({
    startTime: settings.startTime,
    endTime: settings.endTime,
    maxVoters: settings.maxVoters
  });

  useEffect(() => localStorage.setItem(KEYS.voters, JSON.stringify(voters)), [voters]);
  useEffect(() => localStorage.setItem(KEYS.candidates, JSON.stringify(candidates)), [candidates]);
  useEffect(() => localStorage.setItem(KEYS.votes, JSON.stringify(votes)), [votes]);
  useEffect(() => localStorage.setItem(KEYS.settings, JSON.stringify(settings)), [settings]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const totalVotes = votes.reduce((sum, value) => sum + value, 0);
  const votedCount = voters.filter(voter => voter.hasVoted).length;
  const progress = settings.maxVoters
    ? Math.min(100, (votedCount / settings.maxVoters) * 100)
    : 0;

  const votingActive = useMemo(() => {
    const now = new Date();
    if (!settings.votingEnabled) return false;
    if (settings.startTime && now < new Date(settings.startTime)) return false;
    if (settings.endTime && now > new Date(settings.endTime)) return false;
    return votedCount < settings.maxVoters;
  }, [settings, votedCount]);

  function notify(message) {
    setToast(message);
  }

  function navigate(next) {
    if (["dashboard", "elections"].includes(next) && !currentVoter) {
      notify("Please login first.");
      return;
    }
    if (next === "admin" && !adminLoggedIn) {
      setAdminLoginOpen(true);
      return;
    }
    if (next === "elections") setSelectedCandidate(null);
    if (next === "admin") {
      setSettingsForm({
        startTime: settings.startTime,
        endTime: settings.endTime,
        maxVoters: settings.maxVoters
      });
    }
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateVoterField(event) {
    const { name, value } = event.target;
    setVoterForm(previous => ({ ...previous, [name]: value }));
  }

  function sendOTP() {
    const { voterId, name, email, mobile } = voterForm;
    if (!voterId.trim() || !name.trim() || !email.trim() || !mobile.trim()) {
      notify("Please enter all details.");
      return;
    }
    if (!/^[0-9]{10}$/.test(mobile.trim())) {
      notify("Enter valid 10 digit mobile number.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      notify("Enter valid email.");
      return;
    }
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    setGeneratedOTP(otp);
    setOtpSent(true);
    notify("Demo OTP generated. See the message in the login window.");
  }

  function loginVoter() {
    const voterId = voterForm.voterId.trim();
    const name = voterForm.name.trim();
    const email = voterForm.email.trim();
    const mobile = voterForm.mobile.trim();
    if (!voterId || !name || !email || !mobile) {
      notify("Fill all voter details.");
      return;
    }
    if (!generatedOTP || voterForm.otp.trim() !== generatedOTP) {
      notify("Generate and enter the correct OTP.");
      return;
    }

    let voter = voters.find(item => item.voterId.toLowerCase() === voterId.toLowerCase());
    let updatedVoters = [...voters];

    if (voter) {
      if (
        voter.name.toLowerCase() !== name.toLowerCase() ||
        voter.email.toLowerCase() !== email.toLowerCase() ||
        voter.mobile !== mobile
      ) {
        notify("Voter ID already registered with different details.");
        return;
      }
    } else {
      if (voters.length >= settings.maxVoters) {
        notify("Maximum voter limit reached.");
        return;
      }
      voter = {
        voterId, name, email, mobile,
        hasVoted: false,
        votedCandidate: null,
        loginTime: new Date().toLocaleString(),
        voteTime: ""
      };
      updatedVoters.push(voter);
      setVoters(updatedVoters);
    }

    setCurrentVoter(voter);
    setGeneratedOTP("");
    setOtpSent(false);
    setVoterForm({ voterId: "", name: "", email: "", mobile: "", otp: "" });
    setLoginOpen(false);
    setView("dashboard");
    notify("Login successful.");
  }

  function logoutVoter() {
    setCurrentVoter(null);
    setSelectedCandidate(null);
    setView("home");
    notify("Logged out.");
  }

  function readyToVote() {
    if (!currentVoter || currentVoter.hasVoted) {
      notify("You cannot vote again.");
      return;
    }
    if (!votingActive) {
      notify("Voting is currently closed.");
      return;
    }
    setSelectedCandidate(null);
    setView("elections");
  }

  function castVote() {
    if (!currentVoter || currentVoter.hasVoted || !votingActive) {
      notify("Voting is unavailable.");
      return;
    }
    if (selectedCandidate === null || !candidates[selectedCandidate]) {
      notify("Select a candidate.");
      return;
    }
    const updatedVoters = voters.map(voter => {
      if (voter.voterId.toLowerCase() === currentVoter.voterId.toLowerCase()) {
        return {
          ...voter,
          hasVoted: true,
          votedCandidate: selectedCandidate,
          voteTime: new Date().toLocaleString()
        };
      }
      return voter;
    });
    const target = updatedVoters.find(voter =>
      voter.voterId.toLowerCase() === currentVoter.voterId.toLowerCase()
    );
    if (!target || currentVoter.hasVoted) {
      notify("Vote cannot be recorded.");
      return;
    }
    const updatedVotes = [...votes];
    updatedVotes[selectedCandidate] = (updatedVotes[selectedCandidate] || 0) + 1;
    setVotes(updatedVotes);
    setVoters(updatedVoters);
    setCurrentVoter(target);
    setSelectedCandidate(null);
    setView("dashboard");
    notify("Vote submitted successfully.");
  }

  function loginAdmin() {
    if (adminForm.username === "admin" && adminForm.password === "admin123") {
      setAdminLoggedIn(true);
      setAdminLoginOpen(false);
      setAdminForm({ username: "", password: "" });
      setView("admin");
      notify("Admin login successful.");
    } else {
      notify("Invalid admin login.");
    }
  }

  function logoutAdmin() {
    setAdminLoggedIn(false);
    setView("home");
    notify("Admin logged out.");
  }

  function saveElectionSettings() {
    const max = Number(settingsForm.maxVoters);
    const { startTime, endTime } = settingsForm;
    if (!max || max < 1) {
      notify("Enter a valid maximum voter count.");
      return;
    }
    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
      notify("End time must be after start time.");
      return;
    }
    setSettings(previous => ({ ...previous, startTime, endTime, maxVoters: max }));
    notify("Settings saved.");
  }

  function startVotingNow() {
    setSettings(previous => ({
      ...previous, votingEnabled: true, startTime: "", endTime: ""
    }));
    setSettingsForm(previous => ({ ...previous, startTime: "", endTime: "" }));
    notify("Voting started.");
  }

  function stopVoting() {
    setSettings(previous => ({ ...previous, votingEnabled: false }));
    notify("Voting stopped.");
  }

  function publishResults() {
    setSettings(previous => ({ ...previous, resultsPublished: true }));
    notify("Results published successfully.");
  }

  function hideResults() {
    setSettings(previous => ({ ...previous, resultsPublished: false }));
    if (view === "results") setView("home");
    notify("Results hidden successfully.");
  }

  function addCandidate(event) {
    event.preventDefault();
    const name = candidateForm.name.trim();
    const details = candidateForm.details.trim();
    const symbol = candidateForm.symbol.trim();
    if (!name || !details || !symbol) {
      notify("Enter all candidate details.");
      return;
    }
    if (candidates.some(candidate => candidate.name.toLowerCase() === name.toLowerCase())) {
      notify("Candidate already exists.");
      return;
    }
    setCandidates(previous => [...previous, { name, details, symbol }]);
    setVotes(previous => [...previous, 0]);
    setCandidateForm({ name: "", details: "", symbol: "" });
    notify("Candidate added.");
  }

  function removeCandidate(index) {
    if (candidates.length <= 1) {
      notify("At least one candidate must remain.");
      return;
    }
    if (!window.confirm(`Delete ${candidates[index].name} and its votes?`)) return;

    setCandidates(previous => previous.filter((_, i) => i !== index));
    setVotes(previous => previous.filter((_, i) => i !== index));
    setVoters(previous => previous.map(voter => {
      if (!Number.isInteger(voter.votedCandidate)) return voter;
      if (voter.votedCandidate === index) {
        return { ...voter, votedCandidate: null };
      }
      if (voter.votedCandidate > index) {
        return { ...voter, votedCandidate: voter.votedCandidate - 1 };
      }
      return voter;
    }));
    notify("Candidate deleted.");
  }

  function clearRegisteredVoters() {
    if (!voters.length) {
      notify("No registered voters to clear.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete ALL registered voters? This cannot be undone.")) return;
    setVoters([]);
    setCurrentVoter(null);
    setSelectedCandidate(null);
    notify("All registered voters cleared successfully.");
  }

  function resultRows() {
    return candidates.map((candidate, index) => {
      const count = votes[index] || 0;
      const percent = totalVotes ? (count / totalVotes) * 100 : 0;
      return { candidate, count, percent };
    });
  }

  const adminStatus = !settings.votingEnabled
    ? "🔴 Voting is STOPPED."
    : settings.startTime && new Date() < new Date(settings.startTime)
      ? "🟡 Voting has not started."
      : settings.endTime && new Date() > new Date(settings.endTime)
        ? "🔴 Voting has ended."
        : votedCount >= settings.maxVoters
          ? "🟠 Maximum voter capacity reached."
          : "🟢 Voting is ACTIVE.";

  const latestVote = [...voters].reverse().find(voter => voter.hasVoted);

  return (
    <>
      <nav className="navbar">
        <div className="logo">VoteSecure</div>
        <div className="nav-buttons">
          <button className="nav-btn" onClick={() => navigate("home")}>Home</button>
          <button className="nav-btn" onClick={() => setLoginOpen(true)}>Voter Login</button>
          <button className="nav-btn" onClick={() => navigate("results")}>Results</button>
          <button className="nav-btn" onClick={() => setAdminLoginOpen(true)}>Admin</button>
        </div>
      </nav>

      {view === "home" && (
        <section className="view active">
          <div className="container">
            <div className="hero">
              <div className="secure-badge">SECURE • SIMPLE • SMART</div>
              <h1>Welcome to <span>VoteSecure</span></h1>
              <p>A simple online voting system where voters can securely log in, cast one vote and check results after admin publication.</p>
              <div className="hero-buttons">
                <button className="btn btn-primary" onClick={() => setLoginOpen(true)}>Voter Login</button>
                <button className="btn btn-secondary" onClick={() => setAdminLoginOpen(true)}>Admin Panel</button>
              </div>
            </div>
            <div className="card-grid">
              <InfoCard title="🔐 Secure Login" text="Voter login with Voter ID and OTP verification." />
              <InfoCard title="☑️ One Voter • One Vote" text="Each registered voter can vote only once." />
              <InfoCard title="📊 Admin Monitoring" text="Admin can monitor voters, votes and candidates." />
              <InfoCard title="⚙️ Admin Control" text="Admin controls voting and result publication." />
            </div>
            <div className="home-info-section">
              <div className="home-info-header">
                <h2>Important Election Information</h2>
                <p>Review these points before starting the voting process.</p>
              </div>
              <div className="card-grid">
                <InfoCard title="🗳️ Election Details" text="Student President Election 2026." />
                <InfoCard title="👤 Voter Eligibility" text="Use your valid Voter ID and registered details." />
                <InfoCard title="📜 Voting Rules" text="Select one candidate. Your vote cannot be changed." />
                <InfoCard title="🛡️ Security" text="OTP verification is required before voting." />
                <InfoCard title="⚙️ Voting Process" text="Login → OTP → Dashboard → Vote → Confirm." />
                <InfoCard title="📢 Results" text="Results are visible only after admin publication." />
              </div>
            </div>
          </div>
        </section>
      )}

      {view === "dashboard" && currentVoter && (
        <section className="view active">
          <div className="container page">
            <div className="page-header">
              <div><h1>Voter Dashboard</h1><p>Welcome, <strong>{currentVoter.name}</strong>.</p></div>
              <div>
                <button className="btn btn-secondary" onClick={() => navigate("home")}>Home</button>
                <button className="btn btn-danger" onClick={logoutVoter}>Logout</button>
              </div>
            </div>
            <div className="card">
              <h2>Voter Details</h2>
              <div className="voter-profile">
                <ProfileItem label="Voter ID" value={currentVoter.voterId} />
                <ProfileItem label="Name" value={currentVoter.name} />
                <ProfileItem label="Email" value={currentVoter.email} />
                <ProfileItem label="Mobile" value={currentVoter.mobile} />
                <ProfileItem label="Voting Status" value={currentVoter.hasVoted ? "Voted" : "Not Voted"} />
              </div>
            </div>
            {!currentVoter.hasVoted ? (
              <div className="ready-box">
                <h2>Ready to Vote?</h2>
                <p>Click below to enter the ballot.</p>
                <button className="btn btn-primary" onClick={readyToVote}>Ready to Vote</button>
              </div>
            ) : (
              <div className="completed-box">
                <h2>✓ Voting Completed</h2>
                <p>Your vote has already been recorded.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {view === "elections" && currentVoter && (
        <section className="view active">
          <div className="container page">
            <div className="page-header">
              <div><h1>Election Ballot</h1><p>Select one candidate.</p></div>
              <button className="btn btn-secondary" onClick={() => navigate("dashboard")}>Dashboard</button>
            </div>
            <div className="election-card">
              <span className="election-status">{votingActive ? "● Voting Active" : "● Voting Closed"}</span>
              <h2>Student President Election 2026</h2>
              <p>Voter: <strong>{currentVoter.name}</strong></p>
            </div>
            <div className="candidate-grid">
              {candidates.length ? candidates.map((candidate, index) => (
                <button
                  type="button"
                  className={`candidate-card ${selectedCandidate === index ? "selected" : ""}`}
                  key={`${candidate.name}-${index}`}
                  onClick={() => {
                    if (!votingActive || currentVoter.hasVoted) {
                      notify("Voting is unavailable.");
                      return;
                    }
                    setSelectedCandidate(index);
                  }}
                >
                  <div className="candidate-symbol">{candidate.symbol}</div>
                  <h3>{candidate.name}</h3>
                  <p>{candidate.details}</p>
                </button>
              )) : <p>No candidates available.</p>}
            </div>
            {selectedCandidate !== null && candidates[selectedCandidate] && (
              <div className="confirm-panel visible">
                <h2>Confirm Your Vote</h2>
                <p>Selected candidate: <strong>{candidates[selectedCandidate].name} {candidates[selectedCandidate].symbol}</strong></p>
                <button className="btn btn-primary" onClick={castVote}>Confirm Vote</button>
                <button className="btn btn-secondary" onClick={() => setSelectedCandidate(null)}>Change Selection</button>
              </div>
            )}
          </div>
        </section>
      )}

      {view === "results" && (
        <section className="view active">
          <div className="container page">
            <div className="page-header">
              <div><h1>Election Results</h1><p>Official election results.</p></div>
              <button className="btn btn-secondary" onClick={() => navigate("home")}>Home</button>
            </div>
            {!settings.resultsPublished ? (
              <div className="result-card">
                <h2>🔒 Results Not Available</h2>
                <p>The administrator has not published the results yet.</p>
              </div>
            ) : (
              <div className="result-card">
                <h2>📊 Published Election Results</h2>
                <p>Results published by the administrator.</p>
                {resultRows().map(({ candidate, count, percent }) => (
                  <div className="result-row" key={candidate.name}>
                    <div className="result-info">
                      <strong>{candidate.symbol} {candidate.name}</strong>
                      <span>{count} votes ({percent.toFixed(1)}%)</span>
                    </div>
                    <div className="progress"><div className="progress-bar" style={{ width: `${percent}%` }} /></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {view === "admin" && adminLoggedIn && (
        <section className="view active">
          <div className="container page">
            <div className="page-header">
              <div><h1>Admin Dashboard</h1><p>Control and monitor the election.</p></div>
              <button className="btn btn-danger" onClick={logoutAdmin}>Admin Logout</button>
            </div>

            <div className="admin-grid">
              <AdminStat title="Registered Voters" value={voters.length} />
              <AdminStat title="Voters Completed" value={votedCount} />
              <AdminStat title="Remaining Voters" value={Math.max(0, settings.maxVoters - votedCount)} />
              <AdminStat title="Total Votes" value={totalVotes} />
            </div>

            <div className="admin-card">
              <h2>⚙️ Election Control</h2>
              <div className="input-group">
                <label>Start Date &amp; Time</label>
                <input type="datetime-local" value={settingsForm.startTime} onChange={e => setSettingsForm({ ...settingsForm, startTime: e.target.value })} />
              </div>
              <div className="input-group">
                <label>End Date &amp; Time</label>
                <input type="datetime-local" value={settingsForm.endTime} onChange={e => setSettingsForm({ ...settingsForm, endTime: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Maximum Voters</label>
                <input type="number" min="1" value={settingsForm.maxVoters} onChange={e => setSettingsForm({ ...settingsForm, maxVoters: e.target.value })} />
              </div>
              <button className="btn btn-primary" onClick={saveElectionSettings}>Save Settings</button>
              <button className="btn btn-primary" onClick={startVotingNow}>▶ Start Voting</button>
              <button className="btn btn-danger" onClick={stopVoting}>⛔ Stop Voting</button>
              <div className="status-box">{adminStatus}</div>
            </div>

            <div className="admin-card">
              <h2>📢 Results Management</h2>
              <p>Only admin can publish or hide results.</p>
              <div className="status-box">{settings.resultsPublished ? "🟢 Results are PUBLISHED." : "🔴 Results are HIDDEN."}</div>
              <button className="btn btn-primary" onClick={publishResults}>📢 Publish Results</button>
              <button className="btn btn-danger" onClick={hideResults}>🔒 Hide Results</button>
            </div>

            <div className="admin-header">
              <h2>📊 Voting Progress</h2>
              <p>{progress.toFixed(1)}% voters completed voting.</p>
              <div className="progress"><div className="progress-bar" style={{ width: `${progress}%` }} /></div>
            </div>

            <div className="admin-card">
              <h2>Candidate Vote Count</h2>
              <div className="table-scroll">
                <table className="admin-table">
                  <thead><tr><th>Candidate</th><th>Votes</th><th>Percentage</th></tr></thead>
                  <tbody>
                    {resultRows().map(({ candidate, count, percent }) => (
                      <tr key={candidate.name}><td>{candidate.name}</td><td>{count}</td><td>{percent.toFixed(1)}%</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="admin-card">
              <h2>🗳️ Manage Candidates</h2>
              <form onSubmit={addCandidate}>
                <div className="input-group">
                  <label>Candidate Name</label>
                  <input value={candidateForm.name} onChange={e => setCandidateForm({ ...candidateForm, name: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label>Party Details</label>
                  <input value={candidateForm.details} onChange={e => setCandidateForm({ ...candidateForm, details: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label>Party Symbol</label>
                  <input value={candidateForm.symbol} onChange={e => setCandidateForm({ ...candidateForm, symbol: e.target.value })} required />
                </div>
                <button className="btn btn-primary" type="submit">➕ Add Candidate</button>
              </form>
              {candidates.map((candidate, index) => (
                <div className="admin-candidate-item" key={`${candidate.name}-${index}`}>
                  <div>
                    <h3>{candidate.symbol} {candidate.name}</h3>
                    <p>{candidate.details}</p>
                    <p>Votes: {votes[index] || 0}</p>
                  </div>
                  <button className="delete-btn" onClick={() => removeCandidate(index)}>Delete Candidate</button>
                </div>
              ))}
            </div>

            <div className="admin-card">
              <div className="registered-voters-heading">
                <h2>👥 Registered Voters</h2>
                <div>
                  <button className="btn btn-primary" onClick={() => notify("Registered voters refreshed.")}>🔄 Refresh</button>
                  <button className="btn btn-danger" onClick={clearRegisteredVoters}>🗑️ Clear All Voters</button>
                </div>
              </div>
              <div className="table-scroll">
                <table className="admin-table">
                  <thead><tr>
                    <th>Voter ID</th><th>Name</th><th>Email</th><th>Mobile</th>
                    <th>Status</th><th>Registered At</th><th>Vote Time</th>
                  </tr></thead>
                  <tbody>
                    {voters.length ? voters.map(voter => (
                      <tr key={voter.voterId}>
                        <td>{voter.voterId}</td><td>{voter.name}</td><td>{voter.email}</td>
                        <td>{voter.mobile}</td><td>{voter.hasVoted ? "Voted" : "Not Voted"}</td>
                        <td>{voter.loginTime || "-"}</td><td>{voter.voteTime || "-"}</td>
                      </tr>
                    )) : <tr><td colSpan="7">No registered voters found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="admin-card">
              <h2>Voting Activity</h2>
              <p>{latestVote ? `Latest voting activity: ${latestVote.name} at ${latestVote.voteTime}` : "No voting activity yet."}</p>
            </div>
          </div>
        </section>
      )}

      {loginOpen && (
        <div className="modal" onMouseDown={e => { if (e.target === e.currentTarget) setLoginOpen(false); }}>
          <div className="modal-box">
            <h2>Voter Login</h2>
            <div className="input-group"><label>Voter ID</label><input name="voterId" value={voterForm.voterId} onChange={updateVoterField} /></div>
            <div className="input-group"><label>Full Name</label><input name="name" value={voterForm.name} onChange={updateVoterField} /></div>
            <div className="input-group"><label>Email</label><input type="email" name="email" value={voterForm.email} onChange={updateVoterField} /></div>
            <div className="input-group"><label>Mobile Number</label><input name="mobile" maxLength="10" value={voterForm.mobile} onChange={updateVoterField} /></div>
            <button className="btn btn-secondary" onClick={sendOTP}>Send OTP</button>
            {otpSent && (
              <div className="otp-box">
                <div className="input-group"><label>Enter OTP</label><input name="otp" maxLength="6" value={voterForm.otp} onChange={updateVoterField} /></div>
                <p className="demo-note">Demo OTP: {generatedOTP}</p>
              </div>
            )}
            <button className="btn btn-primary" onClick={loginVoter}>Login</button>
            <button className="btn btn-secondary" onClick={() => setLoginOpen(false)}>Cancel</button>
            <p className="demo-note">This is a frontend demonstration. OTP is displayed here and is not sent to a phone.</p>
          </div>
        </div>
      )}

      {adminLoginOpen && (
        <div className="modal" onMouseDown={e => { if (e.target === e.currentTarget) setAdminLoginOpen(false); }}>
          <div className="modal-box">
            <h2>Admin Login</h2>
            <div className="input-group">
              <label>Username</label>
              <input value={adminForm.username} onChange={e => setAdminForm({ ...adminForm, username: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input type="password" value={adminForm.password} onChange={e => setAdminForm({ ...adminForm, password: e.target.value })} />
            </div>
            <button className="btn btn-primary" onClick={loginAdmin}>Login</button>
            <button className="btn btn-secondary" onClick={() => setAdminLoginOpen(false)}>Cancel</button>
            <p className="demo-note">Demo credentials: admin / admin123</p>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
      <footer>VoteSecure © 2026 | Online Voting System Demo</footer>
    </>
  );
}

function InfoCard({ title, text }) {
  return <div className="card"><h3>{title}</h3><p>{text}</p></div>;
}

function ProfileItem({ label, value }) {
  return <div className="profile-item"><strong>{label}</strong><span>{value}</span></div>;
}

function AdminStat({ title, value }) {
  return <div className="admin-card"><h3>{title}</h3><div className="admin-number">{value}</div></div>;
}

export default App;
