import React, { useEffect, useMemo, useState } from "react";

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

const defaultPlayers = Array.from({ length: 4 }, () => ({ name: "", hcp: 0 }));

export default function App() {
  const todayCode = (() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getFullYear()).slice(-2)}`;
  })();

  const todayDisplay = new Date().toLocaleDateString("en-GB");

  const [step, setStep] = useState("gate");
  const [code, setCode] = useState("");
  const [players, setPlayers] = useState(defaultPlayers);
  const [scores, setScores] = useState({});
  const [selectedHole, setSelectedHole] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(0);
  const [tempScore, setTempScore] = useState(4);

  useEffect(() => {
    const saved = localStorage.getItem("wednesday-swindle");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      setStep(parsed.step || "gate");
      setPlayers(parsed.players || defaultPlayers);
      setScores(parsed.scores || {});
      setSelectedHole(parsed.selectedHole ?? null);
      setSelectedPlayer(parsed.selectedPlayer ?? 0);
      setTempScore(parsed.tempScore ?? 4);
    } catch {
      // ignore corrupted storage
    }
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  useEffect(() => {
    localStorage.setItem(
      "wednesday-swindle",
      JSON.stringify({
        step,
        players,
        scores,
        selectedHole,
        selectedPlayer,
        tempScore
      })
    );
  }, [step, players, scores, selectedHole, selectedPlayer, tempScore]);

  const activePlayers = players.filter((p) => p.name.trim());

  const resetToGate = () => {
    setStep("gate");
    setCode("");
    setPlayers(defaultPlayers);
    setScores({});
    setSelectedHole(null);
    setSelectedPlayer(0);
    setTempScore(4);
    localStorage.removeItem("wednesday-swindle");
  };

  const getShots = (hcp, si) => {
    const base = Math.floor(hcp / 18);
    const remainder = hcp % 18;
    return base + (si <= remainder ? 1 : 0);
  };

  const getPoints = (gross, par, shots) => {
    if (gross == null || gross === "NS") return 0;
    return Math.max(0, 2 + par + shots - Number(gross));
  };

  const totals = useMemo(
    () =>
      activePlayers.map((p, idx) => {
        let points = 0;
        let birdies = 0;
        let blobs = 0;

        HOLES.forEach((h) => {
          const gross = scores[h.hole]?.[idx];
          const pts = getPoints(gross, h.par, getShots(p.hcp, h.si));
          points += pts;
          if (gross != null && gross !== "NS" && Number(gross) < h.par) birdies++;
          if (gross != null && pts === 0) blobs++;
        });

        return { name: p.name, points, birdies, blobs };
      }),
    [scores, activePlayers]
  );

  const leaderboard = [...totals].sort((a, b) => b.points - a.points);

  const saveHoleScore = (value) => {
    const hole = selectedHole;
    setScores((prev) => ({
      ...prev,
      [hole]: {
        ...(prev[hole] || {}),
        [selectedPlayer]: value
      }
    }));

    if (selectedPlayer + 1 < activePlayers.length) {
      setSelectedPlayer((p) => p + 1);
      setTempScore(HOLES.find((h) => h.hole === hole)?.par || 4);
    } else {
      setStep("card");
      setSelectedHole(null);
      setSelectedPlayer(0);
    }
  };

  if (step === "gate") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 to-emerald-950 px-6">
        <div className="w-full max-w-md">
          <h1 className="text-white text-4xl font-bold text-center mb-8">
            Wednesday Swindle
          </h1>
          <input
            className="w-full text-4xl text-center py-3 px-4 rounded-3xl border-2 bg-white"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code"
          />
          <button
            className="w-full mt-8 bg-emerald-600 text-white text-5xl font-bold p-8 rounded-3xl"
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
      <div className="min-h-screen bg-slate-100 px-4 py-6 max-w-md mx-auto">
        <h2 className="text-3xl font-bold text-center mb-6">Players</h2>
        {players.map((p, i) => (
          <div key={i} className="flex gap-2 mb-3 items-center">
            <input
              className="w-1/2 text-xl p-4 rounded-2xl border"
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
              className="w-14 text-xl text-center p-3 rounded-2xl border"
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
          className="w-full bg-emerald-600 text-white text-2xl font-bold py-4 rounded-3xl mt-4"
          onClick={() => setStep("card")}
        >
          OK
        </button>

        <button
          className="w-full bg-slate-700 text-white text-2xl font-bold py-4 rounded-3xl mt-4"
          onClick={resetToGate}
        >
          Cancel
        </button>
      </div>
    );
  }

  if (step === "entry") {
    const hole = HOLES.find((h) => h.hole === selectedHole);
    const player = activePlayers[selectedPlayer];

    return (
      <div className="min-h-screen bg-slate-900 text-white px-4 py-8 max-w-md mx-auto">
        <h2 className="text-4xl font-bold text-center mb-8">
          Hole {hole?.hole} • {player?.name}
        </h2>

        <div className="flex items-center justify-center gap-4">
          <button
            className="text-4xl bg-white/10 px-5 py-4 rounded-2xl"
            onClick={() => setTempScore((s) => Math.max(1, s - 1))}
          >
            −
          </button>

          <input
            type="number"
            className="w-20 text-center text-5xl p-4 rounded-3xl text-black"
            value={tempScore}
            onChange={(e) => setTempScore(Number(e.target.value))}
          />

          <button
            className="text-4xl bg-white/10 px-5 py-4 rounded-2xl"
            onClick={() => setTempScore((s) => s + 1)}
          >
            +
          </button>
        </div>

        <button
          className="w-full mt-6 bg-slate-700 text-white text-2xl font-bold py-4 rounded-3xl"
          onClick={() => saveHoleScore("NS")}
        >
          No Score
        </button>

        <button
          className="w-full mt-4 bg-emerald-600 text-white text-2xl font-bold py-4 rounded-3xl"
          onClick={() => saveHoleScore(tempScore)}
        >
          Submit Score
        </button>
      </div>
    );
  }

  if (step === "summary") {
    return (
      <div className="min-h-screen bg-slate-950 text-white px-4 py-6">
        <h1 className="text-3xl font-bold text-center">Round Summary</h1>
        <p className="text-center text-slate-300 mt-2 mb-6">{todayDisplay}</p>

        <div className="bg-white text-black rounded-3xl overflow-hidden">
          <table className="w-full text-base">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left">Player</th>
                <th className="p-3 text-center">Points</th>
                <th className="p-3 text-center">Birdies</th>
                <th className="p-3 text-center">Blobs</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((p, i) => (
                <tr
                  key={p.name}
                  className={i === 0 ? "bg-emerald-100 font-bold" : "border-t"}
                >
                  <td className="p-3">{p.name}</td>
                  <td className="p-3 text-center">{p.points}</td>
                  <td className="p-3 text-center">{p.birdies}</td>
                  <td className="p-3 text-center">{p.blobs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          className="w-full mt-6 bg-red-600 text-white text-2xl font-bold py-4 rounded-3xl"
          onClick={resetToGate}
        >
          End Round
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="px-2 py-2">
        <div className="bg-white text-black rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="w-10 p-2 align-bottom">Hole</th>
                  <th className="w-10 p-2 align-bottom">Par</th>
                  <th className="w-12 p-2 align-bottom">S.I.</th>
                  {activePlayers.map((p, i) => (
                    <th
                      key={i}
                      colSpan={2}
                      className="border-l-2 border-slate-300 p-2 text-center cursor-pointer"
                      onClick={() => setStep("players")}
                    >
                      <div className="text-center">{p.name}</div>
                      <div className="text-xs text-slate-500 text-center mt-1">
                        HCP {p.hcp}
                      </div>
                    </th>
                  ))}
                </tr>
                <tr>
                  <th></th>
                  <th></th>
                  <th></th>
                  {activePlayers.map((_, i) => (
                    <React.Fragment key={i}>
                      <th className="w-10 h-24 border-l-2 border-slate-300 text-center">
                        <div className="-rotate-90 text-[10px] font-bold whitespace-nowrap">
                          Score
                        </div>
                      </th>
                      <th className="w-10 h-24 border-r-2 border-slate-300 text-center">
                        <div className="-rotate-90 text-[10px] font-bold whitespace-nowrap">
                          Points
                        </div>
                      </th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>

              <tbody>
                {HOLES.map((h) => (
                  <tr
                    key={h.hole}
                    className="border-t odd:bg-white even:bg-slate-50 cursor-pointer"
                    onClick={() => {
                      setSelectedHole(h.hole);
                      setSelectedPlayer(0);
                      setTempScore(h.par);
                      setStep("entry");
                    }}
                  >
                    <td className="p-2 text-center">{h.hole}</td>
                    <td className="p-2 text-center">{h.par}</td>
                    <td className="p-2 text-center">{h.si}</td>

                    {activePlayers.map((p, idx) => {
                      const gross = scores[h.hole]?.[idx];
                      const shots = getShots(p.hcp, h.si);
                      const pts = getPoints(gross, h.par, shots);
                      const isBirdie =
                        gross != null &&
                        gross !== "NS" &&
                        Number(gross) === h.par - 1;

                      return (
                        <React.Fragment key={idx}>
                          <td className="p-2 text-center border-l border-slate-200">
                            <span
                              className={
                                isBirdie
                                  ? "inline-flex items-center justify-center w-6 h-6 rounded-full border-2 border-emerald-600"
                                  : ""
                              }
                            >
                              {gross === "NS" ? "-" : gross ?? ""}
                            </span>
                            <span className="text-[0.9rem] align-super ml-1">
                              {"•".repeat(Math.min(shots, 2))}
                            </span>
                          </td>
                          <td className="p-2 text-center font-bold border-r border-slate-200">
                            {gross == null ? "" : pts}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}

                <tr className="border-t-2 bg-slate-100 font-bold">
                  <td colSpan={3} className="p-2 text-center">
                    Points
                  </td>
                  {totals.map((t, i) => (
                    <React.Fragment key={i}>
                      <td></td>
                      <td className="p-2 text-center">{t.points}</td>
                    </React.Fragment>
                  ))}
                </tr>

                <tr className="bg-slate-50">
                  <td colSpan={3} className="p-2 text-center font-bold">
                    Birdies
                  </td>
                  {totals.map((t, i) => (
                    <React.Fragment key={i}>
                      <td></td>
                      <td className="p-2 text-center">{t.birdies}</td>
                    </React.Fragment>
                  ))}
                </tr>

                <tr className="bg-slate-50">
                  <td colSpan={3} className="p-2 text-center font-bold">
                    Blobs
                  </td>
                  {totals.map((t, i) => (
                    <React.Fragment key={i}>
                      <td></td>
                      <td className="p-2 text-center">{t.blobs}</td>
                    </React.Fragment>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <button
          className="w-full mt-6 bg-emerald-600 text-white text-xl font-bold py-4 rounded-3xl"
          onClick={() => setStep("summary")}
        >
          Round Summary
        </button>

        <button
          className="w-full mt-4 bg-red-600 text-white text-xl font-bold py-4 rounded-3xl"
          onClick={resetToGate}
        >
          Cancel Round
        </button>
      </div>
    </div>
  );
}
