import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Moon, RotateCcw, Sparkles, Sun, Wand2 } from "lucide-react";
import "./styles.css";

type Point = { x: number; y: number; t: number };
type Stroke = Point[];

type MisconceptionRecord = {
  label: "a:z";
  attempts: number;
  lastSeenAt: string;
  preferredRepairCardId: "lowerA_z_confusion_apple_belly";
};

type LearnerProfile = {
  learnerId: string;
  misconceptions: Record<string, MisconceptionRecord>;
  attempts: Array<{
    id: string;
    expected: "a";
    observedAs: "z" | "a" | "unknown";
    timestamp: string;
  }>;
};

type TeacherAction =
  | { type: "highlightAttempt"; message: string }
  | { type: "showContrast"; message: string; metaphor: string }
  | { type: "askRetry"; prompt: string }
  | { type: "showParentProof"; note: ParentProofNote };

type ParentProofNote = {
  title: string;
  summary: string;
  nextFocus: string;
};

const STORAGE_KEY = "living-teacher.learnerProfile.v1";

function defaultProfile(): LearnerProfile {
  return {
    learnerId: "demo-child",
    misconceptions: {},
    attempts: [],
  };
}

function loadProfile(): LearnerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultProfile(), ...JSON.parse(raw) } : defaultProfile();
  } catch {
    return defaultProfile();
  }
}

function saveProfile(profile: LearnerProfile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

function getRememberedTeacherLine(profile: LearnerProfile): string | null {
  return profile.misconceptions["a:z"]
    ? "I remember your zigzag road. Let's make the apple belly first."
    : null;
}

function analyzeAttempt(strokes: Stroke[]): "z" | "a" | "unknown" {
  const points = strokes.flat();
  if (points.length < 8) return "unknown";

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  const aspect = width / Math.max(height, 1);
  const directionChanges = countDirectionChanges(points);
  const closes = distance(points[0], points[points.length - 1]) < Math.max(width, height) * 0.35;

  if (directionChanges >= 2 && aspect > 0.8 && !closes) return "z";
  if (closes || directionChanges <= 1) return "a";
  return "unknown";
}

function countDirectionChanges(points: Point[]) {
  let changes = 0;
  let previous = 0;
  for (let i = 2; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x;
    const sign = Math.sign(dx);
    if (sign && previous && sign !== previous) changes += 1;
    if (sign) previous = sign;
  }
  return changes;
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function actionsFor(observedAs: "z" | "a" | "unknown"): TeacherAction[] {
  if (observedAs !== "z") {
    return [
      {
        type: "askRetry",
        prompt: "Let's make one gentle apple belly: round first, tiny tail second.",
      },
    ];
  }

  return [
    { type: "highlightAttempt", message: "I see a zigzag road." },
    {
      type: "showContrast",
      metaphor: "apple belly",
      message:
        "Your lines are strong. Small a needs a round apple belly and a tiny tail.",
    },
    {
      type: "askRetry",
      prompt: "Make the apple belly first, then add the tiny tail.",
    },
    {
      type: "showParentProof",
      note: {
        title: "Today's tiny step",
        summary:
          "Practiced small a. Noticed zigzag lines where a round body is needed.",
        nextFocus: "Round body first, then tiny tail.",
      },
    },
  ];
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [profile, setProfile] = useState<LearnerProfile>(() => loadProfile());
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [actions, setActions] = useState<TeacherAction[]>([]);
  const [observedAs, setObservedAs] = useState<"z" | "a" | "unknown">("unknown");
  const [dark, setDark] = useState(false);

  const memoryLine = useMemo(() => getRememberedTeacherLine(profile), [profile]);

  useEffect(() => {
    drawCanvas(canvasRef.current, strokes, currentStroke, dark);
  }, [strokes, currentStroke, dark]);

  function rememberZ() {
    const next: LearnerProfile = {
      ...profile,
      misconceptions: {
        ...profile.misconceptions,
        "a:z": {
          label: "a:z",
          attempts: (profile.misconceptions["a:z"]?.attempts ?? 0) + 1,
          lastSeenAt: new Date().toISOString(),
          preferredRepairCardId: "lowerA_z_confusion_apple_belly",
        },
      },
      attempts: [
        ...profile.attempts,
        { id: crypto.randomUUID(), expected: "a", observedAs: "z", timestamp: new Date().toISOString() },
      ],
    };
    setProfile(next);
    saveProfile(next);
    setObservedAs("z");
    setActions(actionsFor("z"));
  }

  function checkAttempt() {
    const result = analyzeAttempt(strokes);
    setObservedAs(result);
    setActions(actionsFor(result));
    if (result === "z") rememberZ();
  }

  function clearPage() {
    setStrokes([]);
    setCurrentStroke(null);
    setActions([]);
    setObservedAs("unknown");
  }

  function resetMemory() {
    const next = defaultProfile();
    setProfile(next);
    saveProfile(next);
    clearPage();
  }

  return (
    <main className={dark ? "app dark" : "app"}>
      <section className="teaching-page">
        <header className="teacher-presence">
          <div className="teacher-mark">
            <Wand2 size={22} />
          </div>
          <div>
            <p className="eyebrow">Living Teacher MVP</p>
            <h1>{memoryLine ?? "Let's make a small a."}</h1>
          </div>
          <button className="icon-button" onClick={() => setDark(!dark)} aria-label="Toggle day dark mode">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        <div className="lesson-grid">
          <section className="notebook">
            <div className="model-line">
              <span className="model-letter">a</span>
              <span>round belly first, tiny tail second</span>
            </div>
            <canvas
              ref={canvasRef}
              width={860}
              height={520}
              onPointerDown={(event) => {
                const point = canvasPoint(event);
                setCurrentStroke([point]);
              }}
              onPointerMove={(event) => {
                if (!currentStroke) return;
                setCurrentStroke([...currentStroke, canvasPoint(event)]);
              }}
              onPointerUp={() => {
                if (!currentStroke) return;
                setStrokes([...strokes, currentStroke]);
                setCurrentStroke(null);
              }}
            />
            <div className="action-dock">
              <button data-action="check-attempt" onClick={checkAttempt}>
                <Sparkles size={17} /> Let teacher look
              </button>
              <button data-action="simulate-z" onClick={rememberZ}>Simulate z for a</button>
              <button onClick={clearPage}>
                <RotateCcw size={17} /> Clear
              </button>
            </div>
          </section>

          <aside className="insight-rail">
            <AttemptLens actions={actions} observedAs={observedAs} />
            <ProofReel actions={actions} attempts={profile.misconceptions["a:z"]?.attempts ?? 0} />
            <section className="memory-card" data-testid="learning-ledger">
              <p className="eyebrow">Learning ledger</p>
              <h2>{profile.misconceptions["a:z"] ? "a:z remembered" : "No misconception yet"}</h2>
              <p>
                {profile.misconceptions["a:z"]
                  ? `Seen ${profile.misconceptions["a:z"].attempts} time(s). Refresh the page and the teacher remembers.`
                  : "Trigger z for a to prove the memory loop."}
              </p>
              <button className="text-button" onClick={resetMemory}>Reset learner memory</button>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function AttemptLens({
  actions,
  observedAs,
}: {
  actions: TeacherAction[];
  observedAs: "z" | "a" | "unknown";
}) {
  const visible = actions.filter((action) => action.type === "highlightAttempt" || action.type === "showContrast");
  return (
    <section className="attempt-lens">
      <p className="eyebrow">Attempt lens</p>
      <h2>{observedAs === "z" ? "Zigzag road detected" : "Teacher is watching"}</h2>
      {visible.length ? visible.map((action, index) => <p key={index}>{action.message}</p>) : (
        <p>Draw a small a, or use the simulator to show the teacher a z-shaped attempt.</p>
      )}
    </section>
  );
}

function ProofReel({ actions, attempts }: { actions: TeacherAction[]; attempts: number }) {
  const proof = actions.find((action): action is Extract<TeacherAction, { type: "showParentProof" }> => action.type === "showParentProof");
  const rememberedProof: ParentProofNote | null =
    attempts > 0
      ? {
          title: "Remembered proof",
          summary:
            "Practiced small a. Noticed zigzag lines where a round body is needed.",
          nextFocus: "Round body first, then tiny tail.",
        }
      : null;
  const note = proof?.note ?? rememberedProof;

  return (
    <section className="proof-reel" data-testid="parent-proof">
      <p className="eyebrow">Parent proof</p>
      <h2>{note?.title ?? "No proof yet"}</h2>
      <p>{note?.summary ?? "The proof reel appears only after the teacher has evidence."}</p>
      <p className="next-step">
        <strong>Next tiny step:</strong> {note?.nextFocus ?? "Make one gentle attempt."}
      </p>
      <span className="pill">{attempts} misconception event(s)</span>
    </section>
  );
}

function canvasPoint(event: React.PointerEvent<HTMLCanvasElement>): Point {
  const rect = event.currentTarget.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * event.currentTarget.width,
    y: ((event.clientY - rect.top) / rect.height) * event.currentTarget.height,
    t: performance.now(),
  };
}

function drawCanvas(canvas: HTMLCanvasElement | null, strokes: Stroke[], current: Stroke | null, dark: boolean) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = dark ? "#141316" : "#fffaf0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = dark ? "rgba(255,255,255,.08)" : "rgba(31,35,40,.08)";
  ctx.lineWidth = 1;
  for (let y = 70; y < canvas.height; y += 62) {
    ctx.beginPath();
    ctx.moveTo(56, y);
    ctx.lineTo(canvas.width - 56, y);
    ctx.stroke();
  }
  ctx.strokeStyle = dark ? "#f3ebe0" : "#1c2520";
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  [...strokes, ...(current ? [current] : [])].forEach((stroke) => {
    if (stroke.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(stroke[0].x, stroke[0].y);
    stroke.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.stroke();
  });
}

createRoot(document.getElementById("root")!).render(<App />);
