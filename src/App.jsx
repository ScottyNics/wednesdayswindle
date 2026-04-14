import React, { useEffect, useMemo, useState } from "react";

export default function App() {
  const HOLES = [
    { hole: 1, par: 4, si: 17 },
    { hole: 2, par: 4, si: 7 },
    { hole: 3, par: 4, si: 5 },
    { hole: 4, par: 3, si: 11 },
    { hole: 5, par: 4, si: 13 },
    { hole: 6, par: 4, si: 3 },
    { hole: 7, par: 3, si: 15 },
    { hole: 8, par: 4, si: 1 },
    { hole: 9, par: 4, si: 9 },
    { hole: 10, par: 4, si: 12 }
  ];

  const todayCode = (() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getFullYear()).slice(-2)}`;
  })();

  const defaultPlayers = Array(4).fill(null).map(() => ({ name: "", hcp: 0 }));

  const [step, setStep] = useState("gate");
  const [code, setCode] = useState("");
  const [players, setPlayers] = useState(defaultPlayers);
  const [scores, setScores] = useState({});
  const [selectedHole, setSelectedHole] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(0);
  const [tempScore, setTempScore] = useState(4);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("wednesday-swindle");
      if (!saved) return;

      const parsed = JSON.parse(saved);

      // Only restore known-safe screens after deployments / refreshes
      const validSteps = ["gate", "players", "card"];
      const safeStep = validSteps.includes(parsed.step) ? parsed.step : "gate";

      setStep(safeStep);
      setPlayers(
        Array.isArray(parsed.players) && parsed.players.length
          ? parsed.players
          : defaultPlayers
      );
      setScores(parsed.scores && typeof parsed.scores === "object" ? parsed.scores : {});
    } catch (error) {
      console.error("Failed to restore saved round", error);
      localStorage.removeItem("wednesday-swindle");
      setStep("gate");
      setPlayers(defaultPlayers);
      setScores({});
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("wednesday-swindle", JSON.stringify({ step, players, scores }));
  }, [step, players, scores]);

  const activePlayers = players.filter((p) => p.name.trim());

  const endRound = () => {
    localStorage.removeItem("wednesday-swindle");
    setStep("gate");
    setCode("");
    setPlayers(defaultPlayers);
    setScores({});
    setSelectedHole(null);
    setSelectedPlayer(0);
  };

  const cancelRound = () => {
    if (!window.confirm("Cancel this round and start over?")) return;
    setStep("players");
    setScores({});
    setSelectedHole(null);
    setSelectedPlayer(0);
  };

  const getShots = (hcp, si) => {
    const base = Math.floor(hcp / 18);
    const remainder = hcp % 18;
    return base + (si <= remainder ? 1 : 0);
  };

  const getPoints = (gross, par, shots) => {
    if (gross == null || gross === "NS" || gross === 0) return 0;
    return Math.max(0, 2 + par + shots - Number(gross));
  };

  const totals = useMemo(() => activePlayers.map((p, idx) => {
    let points = 0, birdies = 0, blobs = 0;
    HOLES.forEach((h) => {
      const gross = scores[h.hole]?.[idx];
      const pts = getPoints(gross, h.par, getShots(p.hcp, h.si));
      points += pts;
      if (gross != null && gross !== "NS" && Number(gross) < h.par) birdies++;
      if (gross != null && pts === 0) blobs++;
    });
    return { points, birdies, blobs };
  }), [scores, activePlayers]);

  const saveHoleScore = (value) => {
    const hole = selectedHole;
    setScores((prev) => ({
      ...prev,
      [hole]: { ...(prev[hole] || {}), [selectedPlayer]: value === 0 ? "NS" : value }
    }));

    if (selectedPlayer + 1 < activePlayers.length) {
      setSelectedPlayer((p) => p + 1);
      setTempScore(HOLES.find((h) => h.hole === hole).par);
    } else {
      setStep("card");
      setSelectedHole(null);
      setSelectedPlayer(0);
    }
  };

  if (step === "gate") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-md flex flex-col items-center justify-center">
          <h1 className="text-4xl font-bold mb-8 text-center">Wednesday Swindle</h1>
          <input
            className="w-full text-center text-3xl border-2 rounded-3xl px-6 py-6"
            placeholder="Enter today's code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button
            className="mt-6 w-full text-3xl font-bold bg-emerald-600 text-white rounded-3xl py-6"
            onClick={() => (code === todayCode ? setStep("players") : alert("Wrong code"))}
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  if (step === "players") {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 max-w-md mx-auto">
        <h2 className="text-3xl font-bold mb-6 text-center">Players</h2>
        {players.map((p, i) => (
          <div key={i} className="flex gap-3 mb-4 items-center">
            <input
              className="flex-1 border-2 rounded-2xl px-5 py-5 text-2xl"
              placeholder={`Player ${i + 1}`}
              value={p.name}
              onChange={(e) => {
                const copy = [...players];
                copy[i].name = e.target.value;
                setPlayers(copy);
              }}
            />
            <input
              type="number"
              className="w-20 border-2 rounded-2xl px-2 py-5 text-2xl text-center"
              value={p.hcp}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const copy = [...players];
                copy[i].hcp = Number(e.target.value);
                setPlayers(copy);
              }}
            />
          </div>
        ))}
        <button className="w-full bg-emerald-600 text-white text-2xl font-bold py-5 rounded-3xl mt-6" onClick={() => setStep("card")}>
          Start Round
        </button>
        <button className="w-full bg-slate-700 text-white text-xl font-bold py-4 rounded-3xl mt-4 shadow-lg" onClick={endRound}>
          Cancel
        </button>
      </div>
    );
  }

  if (step === "entry") {
    // Crash-proof protection if app refreshes during score entry
    if (selectedHole == null || !activePlayers[selectedPlayer]) {
      setStep("card");
      return null;
    }
    const hole = HOLES.find((h) => h.hole === selectedHole);
    const player = activePlayers[selectedPlayer];

    return (
      <div className="min-h-screen px-4 py-6 max-w-md mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8">Hole {hole.hole} - {player.name}</h2>
        <div className="flex gap-4 items-center">
          <button className="px-6 py-6 text-4xl border rounded-2xl" onClick={() => setTempScore((s) => Math.max(0, s - 1))}>-</button>
          <input
            type="number"
            className="flex-1 text-center text-5xl border rounded-2xl py-6"
            value={tempScore}
            onChange={(e) => setTempScore(Number(e.target.value))}
          />
          <button className="px-6 py-6 text-4xl border rounded-2xl" onClick={() => setTempScore((s) => s + 1)}>+</button>
        </div>
        <button className="mt-6 w-full bg-gray-700 text-white text-2xl font-bold py-5 rounded-3xl" onClick={() => saveHoleScore("NS")}>No score</button>
        <button className="mt-4 w-full bg-emerald-600 text-white text-2xl font-bold py-5 rounded-3xl" onClick={() => saveHoleScore(tempScore)}>Submit</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700 px-4 py-4 shadow-lg">
        <h1 className="text-xl font-bold text-center">Wednesday Swindle</h1>
        <p className="text-center text-sm text-slate-300">Round in Progress</p>
      </div>

      <div className="px-3 py-3">
        <div className="grid grid-cols-2 gap-2 mb-3">
          {totals.slice(0, 2).map((t, i) => (
            <div key={i} className="bg-slate-800 rounded-2xl p-3 text-center shadow-lg">
              <div className="text-sm text-slate-300">{activePlayers[i]?.name || `P${i + 1}`}</div>
              <div className="text-2xl font-bold text-emerald-400">{t.points}</div>
            </div>
          ))}
        </div>

        <div className="bg-white text-black rounded-3xl shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed" style={{ borderCollapse: 'collapse' }}>
              <thead className="bg-slate-200">
                <tr>
                  <th className="p-2 text-center" rowSpan={2}>Hole</th>
                  <th className="p-2 text-center" rowSpan={2}>Par</th>
                  <th className="p-2 text-center" rowSpan={2}>S.I.</th>
                  {activePlayers.map((p, i) => (
                    <th key={i} colSpan={2} className="p-2 text-center font-bold">{p.name}</th>
                  ))}
                </tr>
                <tr>
                  {activePlayers.map((_, i) => (
                    <React.Fragment key={i}>
                      <th className="p-2 text-center w-24">Score</th>
                      <th className="p-2 text-center w-24">Pts</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOLES.map((h) => (
                  <tr
                    key={h.hole}
                    className="border-t border-slate-200"
                    style={{ backgroundColor: h.hole % 2 ? '#f8fafc' : '#eef2ff' }}
                    onClick={() => {
                      setSelectedHole(h.hole);
                      setSelectedPlayer(0);
                      setTempScore(h.par);
                      setStep('entry');
                    }}
                  >
                    <td className="p-2 text-center font-semibold align-middle">{h.hole}</td>
                    <td className="p-2 text-center align-middle">{h.par}</td>
                    <td className="p-2 text-center align-middle">{h.si}</td>
                    {activePlayers.map((p, idx) => {
                      const gross = scores[h.hole]?.[idx];
                      const shots = getShots(p.hcp, h.si);
                      const pts = getPoints(gross, h.par, shots);
                      const stars = '*'.repeat(Math.min(shots, 2));
                      const scoreDisplay = gross == null ? '' : gross === 'NS' ? '-' : gross;
                      return (
                        <React.Fragment key={idx}>
                          <td className="p-2 text-center align-middle">
                            <span>{scoreDisplay}{scoreDisplay ? ' ' : ''}<span style={{ fontSize: '0.5em' }}>{stars}</span></span>
                          </td>
                          <td className="p-2 text-center align-middle">
                            <span className="inline-block min-w-[44px] rounded-full px-2 py-1 font-bold"
                              style={{
                                backgroundColor:
                                  gross == null
                                    ? 'transparent'
                                    : pts === 2
                                    ? '#fde68a'
                                    : pts < 2
                                    ? '#fecaca'
                                    : '#bbf7d0'
                              }}
                            >
                              {gross == null ? '' : pts}
                            </span>
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-slate-300">Please take a screenshot and send it separately.</div>
      <div className="flex justify-center mt-4 gap-3">
        <button className="bg-red-600 text-white px-6 py-4 rounded-2xl text-lg font-bold" onClick={cancelRound}>Cancel Round</button>
        <button className="bg-emerald-600 text-white px-6 py-4 rounded-2xl text-lg font-bold shadow-lg" onClick={endRound}>End Round</button>
      </div>
    </div>
  );
}