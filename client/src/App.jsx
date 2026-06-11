import { useEffect, useState } from 'react';

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    // We use /api/test because of the proxy we configured earlier
    fetch('/api/test')
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(err => console.error("Connection failed:", err));
  }, []);

  return (
    <div className="App">
      <h1>HackMate Status:</h1>
      <p>{message || "Connecting..."}</p>
    </div>
  )
}

export default App;