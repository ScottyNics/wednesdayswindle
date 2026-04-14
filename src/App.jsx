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
    return `${String(d.getDate()).padStart(2, "0")}${String(
      d.getMonth() + 1
    ).padStart(2, "0")}${String(d.getFullYear()).slice(-2)}`;
  })();

  const defaultPlayers = [
    { name: "", hcp: 0 },
    { name: "", hcp: 0 },
    { name: "", hcp: 0 },
    { name: "", hcp: 0 }
  ];

  const [step, setStep] = useState("gate");
  const [code, setCode] = useState("");
  const [players, setPlayers] = useState(defaultPlayers);
  const [scores, setScores] = useState({});
  const [selectedHole, setSelectedHole] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(0);
  const [tempScore, setTempScore] = useState(4);

  useEffect(() => {
  const saved = localStorage.getItem("purple-simple");

  if (saved) {
    const parsed = JSON.parse(saved);

    // Never restore directly into entry screen
    const safeStep = parsed.step === "entry" ? "card" : parsed.step;

    setStep(safeStep || "gate");
    setPlayers(parsed.players || defaultPlayers);
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

        if (gross != null && gross !== "NS" && Number(gross) < h.par) {
          birdies++;
        }

        if (gross != null && pts === 0) blobs++;
      });

      return { points, birdies, blobs };
    });
  }, [scores, activePlayers]);

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

  const editPlayer = (index) => {
    const newName = prompt("Player name", activePlayers[index].name);
    if (newName === null) return;

    const newHcp = prompt("Handicap", activePlayers[index].hcp);
    if (newHcp === null) return;

    const updated = [...players];
    const realIndex = players.findIndex(
      (p) => p.name === activePlayers[index].name
    );

    updated[realIndex] = {
      name: newName,
      hcp: Number(newHcp)
    };

    setPlayers(updated);
  };

  if (step === "gate") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-bold mb-6">Wednesday Swindle</h1>
          <input
            className="border-2 p-5 rounded-2xl w-full text-2xl text-center"
            placeholder="Enter today's code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button
            className="mt-6 bg-purple-600 text-white w-full p-5 rounded-2xl text-2xl font-semibold"
            onClick={() =>
              code === todayCode ? setStep("players") : alert("Wrong code")
            }
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  if (step === "players") {
    return (
      <div className="min-h-screen p-4 max-w-md mx-auto bg-slate-50">
        <h2 className="text-2xl font-bold mb-4 text-center">Players</h2>
        {players.map((p, i) => (
          <div key={i} className="flex gap-3 mb-3 items-center">
            <input
              className="border-2 p-4 rounded-xl text-xl flex-1"
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
              min="0"
              max="99"
              className="border-2 p-4 rounded-xl text-xl w-20 text-center"
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
        <button
          className="bg-purple-600 text-white w-full p-4 rounded-2xl text-xl font-semibold mt-4"
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
      <div className="min-h-screen p-4 max-w-md mx-auto">
        <h2 className="text-2xl mb-6 text-center font-semibold">
          Hole {hole.hole} – {player.name}
        </h2>

        <div className="flex gap-3 items-center">
          <button
            className="px-5 py-4 border rounded-xl text-2xl"
            onClick={() => setTempScore((s) => Math.max(0, s - 1))}
          >
            -
          </button>

          <input
            type="number"
            className="border text-center text-4xl p-4 rounded-xl flex-1"
            value={tempScore}
            onChange={(e) => setTempScore(Number(e.target.value))}
          />

          <button
            className="px-5 py-4 border rounded-xl text-2xl"
            onClick={() => setTempScore((s) => s + 1)}
          >
            +
          </button>
        </div>

        <button
          className="mt-4 w-full bg-gray-700 text-white p-4 rounded-xl text-xl"
          onClick={() => saveHoleScore("NS")}
        >
          No score
        </button>

        <button
          className="mt-3 w-full bg-purple-600 text-white p-4 rounded-xl text-xl"
          onClick={() => saveHoleScore(tempScore)}
        >
          Submit
        </button>
      </div>
    );
  }

  return (
    <div className="p-2 max-w-full mx-auto">
      <div className="flex justify-center mb-3">
        <button
          className="bg-red-600 text-white px-4 py-3 rounded-xl text-sm font-semibold"
          onClick={cancelRound}
        >
          Cancel Round
        </button>
      </div>

      <div className="overflow-x-auto">
        <table
          className="w-full text-xs sm:text-sm border-2 border-black table-fixed"
          style={{ borderCollapse: "collapse" }}
        >
          <thead>
            <tr>
              <th className="border border-black text-center" rowSpan={2}>Hole</th>
              <th className="border border-black text-center" rowSpan={2}>Par</th>
              <th className="border border-black text-center" rowSpan={2}>S.I.</th>
              {activePlayers.map((p, i) => (
                <th
                  key={i}
                  colSpan={2}
                  className="border border-black text-center cursor-pointer"
                  onClick={() => editPlayer(i)}
                >
                  {p.name}
                </th>
              ))}
            </tr>
            <tr>
              {activePlayers.map((_, i) => (
                <React.Fragment key={i}>
                  <th className="border border-black text-center h-16 w-8">
                    <div className="-rotate-90 whitespace-nowrap">Score</div>
                  </th>
                  <th className="border border-black text-center h-16 w-8">
                    <div className="-rotate-90 whitespace-nowrap">Points</div>
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            {HOLES.map((h) => (
              <tr
                key={h.hole}
                className="cursor-pointer"
                style={{ backgroundColor: h.hole % 2 === 1 ? "#bfdbfe" : "#dbeafe" }}
                onClick={() => {
                  setSelectedHole(h.hole);
                  setSelectedPlayer(0);
                  setTempScore(h.par);
                  setStep("entry");
                }}
              >
                <td className="border border-black text-center font-medium">{h.hole}</td>
                <td className="border border-black text-center">{h.par}</td>
                <td className="border border-black text-center">{h.si}</td>

                {activePlayers.map((p, idx) => {
                  const gross = scores[h.hole]?.[idx];
                  const shots = getShots(p.hcp, h.si);
                  const pts = getPoints(gross, h.par, shots);
                  const stars = "*".repeat(Math.min(shots, 2));
                  const scoreDisplay = gross == null ? "" : gross === "NS" ? "-" : gross;

                  return (
                    <React.Fragment key={idx}>
                      <td className="border border-black text-center align-middle">
                        {`${scoreDisplay}${scoreDisplay ? " " : ""}${stars}`}
                      </td>
                      <td
                        className="border border-black text-center font-semibold align-middle"
                        style={{
                          backgroundColor:
                            gross == null
                              ? "transparent"
                              : pts === 2
                              ? "#fde68a"
                              : pts < 2
                              ? "#fecaca"
                              : "#bbf7d0"
                        }}
                      >
                        {gross == null ? "" : pts}
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}

            <tr>
              <td colSpan={3} className="border border-black font-bold text-center">Points</td>
              {totals.map((t, i) => (
                <React.Fragment key={i}>
                  <td className="border border-black text-center font-bold">{t.points}</td>
                  <td className="border border-black"></td>
                </React.Fragment>
              ))}
            </tr>

            <tr>
              <td colSpan={3} className="border border-black font-bold text-center">Birdies</td>
              {totals.map((t, i) => (
                <React.Fragment key={i}>
                  <td className="border border-black text-center">{t.birdies}</td>
                  <td className="border border-black"></td>
                </React.Fragment>
              ))}
            </tr>

            <tr>
              <td colSpan={3} className="border border-black font-bold text-center">Blobs</td>
              {totals.map((t, i) => (
                <React.Fragment key={i}>
                  <td className="border border-black text-center">{t.blobs}</td>
                  <td className="border border-black"></td>
                </React.Fragment>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-center text-xs sm:text-sm">
        Please take a screenshot and send it separately.
      </div>
    </div>
  );
}
