import { useEffect, useState } from "react";
import fitflowLogo from "@/assets/fitflow-logo.png.asset.json";

export function LaunchScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("ff_launch_shown")) {
      setVisible(false);
      return;
    }
    sessionStorage.setItem("ff_launch_shown", "1");
    const t1 = setTimeout(() => setFading(true), 2400);
    const t2 = setTimeout(() => setVisible(false), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#06121f] transition-opacity duration-500 ${fading ? "opacity-0" : "opacity-100"}`}
    >
      {/* Aurora backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(45,212,191,0.28),transparent_55%),radial-gradient(circle_at_70%_75%,rgba(251,146,60,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 ff-launch-grain opacity-[0.06]" />

      {/* Rings + logo */}
      <div className="relative flex items-center justify-center">
        <span className="ff-ring absolute h-56 w-56 rounded-full border border-teal-400/40" />
        <span className="ff-ring ff-ring-2 absolute h-56 w-56 rounded-full border border-orange-400/40" />
        <span className="ff-ring ff-ring-3 absolute h-56 w-56 rounded-full border border-teal-300/25" />

        <img
          src={fitflowLogo.url}
          alt="FitFlow"
          className="ff-launch-logo relative z-10 w-44 max-w-[60vw] drop-shadow-[0_10px_40px_rgba(45,212,191,0.5)]"
        />
      </div>

      <p className="ff-launch-text relative mt-10 text-[11px] uppercase tracking-[0.45em] text-white/70">
        Train · Eat · Evolve
      </p>

      <div className="ff-launch-text relative mt-6 h-[3px] w-40 overflow-hidden rounded-full bg-white/10">
        <span className="ff-loadbar absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-teal-400 via-cyan-300 to-orange-400" />
      </div>

      <style>{`
        @keyframes ff-pop {
          0%   { transform: scale(.55) rotate(-8deg); opacity: 0; filter: blur(10px); }
          55%  { transform: scale(1.08) rotate(2deg); opacity: 1; filter: blur(0); }
          75%  { transform: scale(.96) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes ff-float {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-6px); }
        }
        @keyframes ff-ring {
          0%   { transform: scale(.5); opacity: .9; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes ff-rise {
          0%   { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes ff-load {
          0%   { transform: translateX(-110%); }
          100% { transform: translateX(330%); }
        }
        .ff-launch-logo {
          animation:
            ff-pop 1s cubic-bezier(.2,.8,.2,1.1) both,
            ff-float 2.4s ease-in-out 1s infinite;
          transform-origin: center;
        }
        .ff-ring { animation: ff-ring 2.2s ease-out infinite; }
        .ff-ring-2 { animation-delay: .55s; }
        .ff-ring-3 { animation-delay: 1.1s; }
        .ff-launch-text { animation: ff-rise .6s ease-out .7s both; }
        .ff-loadbar { animation: ff-load 1.4s cubic-bezier(.6,.1,.3,1) .8s infinite; }
        .ff-launch-grain {
          background-image: radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px);
          background-size: 3px 3px;
        }
      `}</style>
    </div>
  );
}