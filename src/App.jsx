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
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = String(d.getFullYear()).slice(-2);
    return `${dd}${mm}${yy}`;
  })();

  const [step, setStep] = useState("gate");
  const [code, setCode] = useState("");
  const [players, setPlayers] = useState([
    { name: "", hcp: 0 },
    { name: "", hcp: 0 },
    { name: "", hcp: 0 },
    { name: "", hcp: 0 }
  ]);

  const [scores, setScores] = useState({});
  const [selectedHole, setSelectedHole] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(0);
  const [tempScore, setTempScore] = useState(4);

  useEffect(() => {
    const saved = localStorage.getItem("purple-simple");
    if (saved) {
      const parsed = JSON.parse(saved);
      setStep(parsed.step || "gate");
      setPlayers(parsed.players || players);
      setScores(parsed.scores || {});
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "purple-simple",
      JSON.stringify({ step, players, scores })
    );
  }, [step, players, scores]);

  const activePlayers = players.filter((p) => p.name.trim());

  const getShots = (hcp, si) => {
    const base = Math.floor(hcp / 18);
    const extra = si <= (hcp % 18) ? 1 : 0;
    return base + extra;
  };

  const getPoints = (gross, par, shots) => {
    if (gross === "NS" || gross === 0) return 0;
    return Math.max(0, 2 + par + shots - gross);
  };

  const totals = useMemo(() => {
    return activePlayers.map((p, idx) => {
      let points = 0;
      let birdies = 0;
      let blobs = 0;

      HOLES.forEach((h) => {
        const gross = scores[h.hole]?.[idx];
        const shots = getShots(p.hcp, h.si);
        const pts = getPoints(gross, h.par, shots);

        points += pts;
        if (gross !== "NS" && gross && gross < h.par) birdies++;
        if (pts === 0) blobs++;
      });

      return { points, birdies, blobs };
    });
  }, [scores, players]);

  const saveHoleScore = (value) => {
    const hole = selectedHole;
    setScores((prev) => ({
      ...prev,
      [hole]: {
        ...(prev[hole] || {}),
        [selectedPlayer]: value === 0 ? "NS" : value
      }
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
      <div className="p-4 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">Purple Golf</h1>
        <input
          className="border p-3 rounded w-full"
          placeholder="Enter today's code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button
          className="mt-4 bg-purple-600 text-white w-full p-3 rounded"
          onClick={() =>
            code === todayCode ? setStep("players") : alert("Wrong code")
          }
        >
          Enter
        </button>
      </div>
    );
  }

  if (step === "players") {
    return (
      <div className="p-4 max-w-md mx-auto">
        {players.map((p, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 mb-2">
            <input
              className="border p-2 rounded"
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
              className="border p-2 rounded"
              placeholder="Hcp"
              value={p.hcp}
              onChange={(e) => {
                const copy = [...players];
                copy[i].hcp = Number(e.target.value);
                setPlayers(copy);
              }}
            />
          </div>
        ))}
        <button
          className="bg-purple-600 text-white w-full p-3 rounded"
          onClick={() => setStep("card")}
        >
          Start Round
        </button>
      </div>
    );
  }

  if (step === "entry") {
    const hole = HOLES.find((h) => h.hole === selectedHole);
    const player = activePlayers[selectedPlayer];

    return (
      <div className="p-4 max-w-md mx-auto">
        <h2 className="text-xl mb-4">
          Hole {hole.hole} – {player.name}
        </h2>
        <div className="flex gap-3 items-center">
          <button onClick={() => setTempScore((s) => Math.max(0, s - 1))}>
            -
          </button>
          <input
            type="number"
            className="border text-center text-3xl p-4 rounded flex-1"
            value={tempScore}
            onChange={(e) => setTempScore(Number(e.target.value))}
          />
          <button onClick={() => setTempScore((s) => s + 1)}>+</button>
        </div>
        <button
          className="mt-4 w-full bg-gray-700 text-white p-3 rounded"
          onClick={() => saveHoleScore("NS")}
        >
          No score
        </button>
        <button
          className="mt-2 w-full bg-purple-600 text-white p-3 rounded"
          onClick={() => saveHoleScore(tempScore)}
        >
          Submit
        </button>
      </div>
    );
  }

  return (
    <div className="p-2 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Hole</th>
            <th>Par</th>
            <th>S.I.</th>
            {activePlayers.map((p, i) => (
              <th key={i}>{p.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HOLES.map((h) => (
            <tr
              key={h.hole}
              className="cursor-pointer"
              onClick={() => {
                setSelectedHole(h.hole);
                setSelectedPlayer(0);
                setTempScore(h.par);
                setStep("entry");
              }}
            >
              <td>{h.hole}</td>
              <td>{h.par}</td>
              <td>{h.si}</td>
              {activePlayers.map((p, idx) => {
                const gross = scores[h.hole]?.[idx];
                const shots = getShots(p.hcp, h.si);
                const stars = "*".repeat(Math.min(shots, 2));
                return (
                  <td key={idx}>
                    {(gross === "NS" ? "-" : gross ?? 0) + " " + stars}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <td colSpan={3}>Points</td>
            {totals.map((t, i) => (
              <td key={i}>{t.points}</td>
            ))}
          </tr>
          <tr>
            <td colSpan={3}>Birdies</td>
            {totals.map((t, i) => (
              <td key={i}>{t.birdies}</td>
            ))}
          </tr>
          <tr>
            <td colSpan={3}>Blobs</td>
            {totals.map((t, i) => (
              <td key={i}>{t.blobs}</td>
            ))}
          </tr>
        </tbody>
      </table>

      <div className="mt-6 text-center text-sm">
        Please take a screenshot and send it separately.
      </div>
    </div>
  );
}
