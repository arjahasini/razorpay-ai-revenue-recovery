import { Zap, Shield, Database, Sparkles, Info } from 'lucide-react';

interface Props {
  demoMode: boolean;
  onToggleDemo: () => void;
}

export default function SettingsPage({ demoMode, onToggleDemo }: Props) {
  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">Settings</h1>
        <p className="text-sm text-ink-500 mt-1">Configure your AI Revenue Recovery agent.</p>
      </div>

      {/* Demo Mode */}
      <div className="card p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <Zap className="w-5 h-5 text-brand-600" fill={demoMode ? 'currentColor' : 'none'} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink-800">Demo Mode</h3>
              <p className="text-xs text-ink-500 mt-1 max-w-md">
                When enabled, all retry actions are simulated safely — no real charges are made.
                Perfect for live demos and presentations.
              </p>
            </div>
          </div>
          <button
            onClick={onToggleDemo}
            className={`relative w-12 h-6 rounded-full transition-colors ${demoMode ? 'bg-brand-600' : 'bg-ink-200'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${demoMode ? 'translate-x-6' : ''}`} />
          </button>
        </div>
      </div>

      {/* AI Engine */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent-400/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-accent-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-800">AI Recovery Engine</h3>
            <p className="text-xs text-ink-500">Transparent logistic regression model with explainable factors</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-ink-50">
            <p className="text-xs text-ink-400">Model Type</p>
            <p className="text-sm font-semibold text-ink-700">Logistic Regression</p>
          </div>
          <div className="p-3 rounded-lg bg-ink-50">
            <p className="text-xs text-ink-400">Features</p>
            <p className="text-sm font-semibold text-ink-700">9 weighted factors</p>
          </div>
          <div className="p-3 rounded-lg bg-ink-50">
            <p className="text-xs text-ink-400">Scoring</p>
            <p className="text-sm font-semibold text-ink-700">Sigmoid + explainability</p>
          </div>
          <div className="p-3 rounded-lg bg-ink-50">
            <p className="text-xs text-ink-400">Fallback</p>
            <p className="text-sm font-semibold text-ink-700">Category base rate</p>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-success-50 flex items-center justify-center">
            <Shield className="w-5 h-5 text-success-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-800">Security</h3>
            <p className="text-xs text-ink-500">Input validation, CORS, and synthetic data only</p>
          </div>
        </div>
        <ul className="space-y-2">
          <li className="flex items-center gap-2 text-xs text-ink-600"><span className="w-1.5 h-1.5 rounded-full bg-success-500" /> CORS configured for cross-origin requests</li>
          <li className="flex items-center gap-2 text-xs text-ink-600"><span className="w-1.5 h-1.5 rounded-full bg-success-500" /> Pydantic input validation on all endpoints</li>
          <li className="flex items-center gap-2 text-xs text-ink-600"><span className="w-1.5 h-1.5 rounded-full bg-success-500" /> No real customer payment data — synthetic only</li>
          <li className="flex items-center gap-2 text-xs text-ink-600"><span className="w-1.5 h-1.5 rounded-full bg-success-500" /> No hardcoded API keys</li>
        </ul>
      </div>

      {/* About */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-ink-100 flex items-center justify-center">
            <Info className="w-5 h-5 text-ink-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-800">About</h3>
          </div>
        </div>
        <p className="text-xs text-ink-500 leading-relaxed">
          Razorpay AI Revenue Recovery Agent — an intelligent payment recovery system that detects
          failed payments, predicts recovery probability using a transparent ML model, recommends
          the best recovery action, and guides merchants toward recovering lost revenue. Built for
          the Razorpay AI Buildathon.
        </p>
        <div className="flex items-center gap-2 mt-3 text-xs text-ink-400">
          <Database className="w-3.5 h-3.5" />
          SQLite · FastAPI · React · scikit-learn
        </div>
      </div>
    </div>
  );
}
