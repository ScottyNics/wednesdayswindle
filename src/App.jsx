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
      setPlayers(parsed.players || []);
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
          <button
            className="px-4 py-2 border rounded"
            onClick={() => setTempScore((s) => Math.max(0, s - 1))}
          >
            -
          </button>

          <input
            type="number"
            className="border text-center text-3xl p-4 rounded flex-1"
            value={tempScore}
            onChange={(e) => setTempScore(Number(e.target.value))}
          />

          <button
            className="px-4 py-2 border rounded"
            onClick={() => setTempScore((s) => s + 1)}
          >
            +
          </button>
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
    <div className="p-2 overflow-x-auto text-center">
      <table className="w-full text-sm border-2 border-black text-center" style={{ borderCollapse: 'collapse' }}>
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
                <th className="border border-black text-center">Score</th>
                <th className="border border-black text-center">Points</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>

        <tbody>
          {HOLES.map((h) => (
            <tr
              key={h.hole}
              className="cursor-pointer"
              style={{ backgroundColor: h.hole % 2 === 1 ? '#bfdbfe' : '#dbeafe' }}
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
                const alwaysStars = stars;
                const ptsBg =
                  pts === 2
                    ? "bg-amber-100"
                    : pts < 2
                    ? "bg-red-100"
                    : "bg-green-100";

                return (
                  <React.Fragment key={idx}>
                    <td className="border border-black text-center">
                      {`${scoreDisplay}${scoreDisplay ? " " : ""}${alwaysStars}`}
                    </td>
                    <td className="border border-black text-center font-semibold"
                      style={{
                        backgroundColor:
                          gross == null
                            ? 'transparent'
                            : pts === 2
                            ? '#fde68a'
                            : pts < 2
                            ? '#fecaca'
                            : '#bbf7d0'
                      }}>
                      {gross == null ? "" : pts}
                    </td>
                  </React.Fragment>
                );
              })}
            </tr>
          ))}

          <tr>
            <td colSpan={3} className="border border-black font-bold">
              Points
            </td>
            {totals.map((t, i) => (
              <React.Fragment key={i}>
                <td className="border border-black text-center font-bold">
                  {t.points}
                </td>
                <td className="border border-black"></td>
              </React.Fragment>
            ))}
          </tr>

          <tr>
            <td colSpan={3} className="border border-black font-bold text-center">
              Birdies
            </td>
            {totals.map((t, i) => (
              <React.Fragment key={i}>
                <td className="border border-black text-center">{t.birdies}</td>
                <td className="border border-black"></td>
              </React.Fragment>
            ))}
          </tr>

          <tr>
            <td colSpan={3} className="border border-black font-bold text-center">
              Blobs
            </td>
            {totals.map((t, i) => (
              <React.Fragment key={i}>
                <td className="border border-black text-center">{t.blobs}</td>
                <td className="border border-black"></td>
              </React.Fragment>
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
