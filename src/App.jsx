import React, { useEffect, useMemo, useState } from "react";

export default function App() {
  const HOLES = [
    { hole: 1, par: 4, si: 17 }, { hole: 2, par: 4, si: 7 },
    { hole: 3, par: 4, si: 5 }, { hole: 4, par: 3, si: 11 },
    { hole: 5, par: 4, si: 13 }, { hole: 6, par: 4, si: 3 },
    { hole: 7, par: 3, si: 15 }, { hole: 8, par: 4, si: 1 },
    { hole: 9, par: 4, si: 9 }, { hole: 10, par: 4, si: 12 }
  ];

  const accessCode = (() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}${String(d.getMonth()+1).padStart(2, "0")}${String(d.getFullYear()).slice(-2)}`;
  })();

  const [step, setStep] = useState("gate");
  const [players, setPlayers] = useState([{name:"",hcp:0},{name:"",hcp:0},{name:"",hcp:0},{name:"",hcp:0}]);
  const [scores, setScores] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem("purple-simple");
    if (saved) {
      const data = JSON.parse(saved);
      setStep(data.step); setPlayers(data.players); setScores(data.scores);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("purple-simple", JSON.stringify({ step, players, scores }));
  }, [step, players, scores]);

  return <div>Use the simplified prototype component from the previous canvas here: date code access, mobile scorecard, no-score handling, screenshot reminder only.</div>;
}
