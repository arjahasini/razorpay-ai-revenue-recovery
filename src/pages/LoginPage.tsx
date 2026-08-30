import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;
  const formValid = emailValid && passwordValid;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formValid) {
      setTouched({ email: true, password: true });
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password, remember);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('demo@example.com');
    setPassword('Demo@123');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-ink-900 via-ink-800 to-brand-900 p-12 flex-col justify-between overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-accent-500/10 rounded-full blur-3xl translate-y-1/3" />

        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg">
            <Zap className="w-6 h-6 text-white" fill="white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Razorpay AI</h1>
            <p className="text-xs text-brand-200">Revenue Recovery</p>
          </div>
        </div>

        <div className="relative">
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Turn failed payments<br />into recovered revenue.
          </h2>
          <p className="text-ink-300 text-lg max-w-md leading-relaxed">
            AI analyzes every failed payment, predicts recovery probability, and recommends the best action to recover lost revenue.
          </p>

          <div className="mt-8 space-y-3">
            {[
              'Transparent ML recovery scoring',
              'AI-powered recovery strategy engine',
              'Smart retry simulation',
              'Real-time revenue recovery dashboard',
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-3 text-ink-200">
                <div className="w-5 h-5 rounded-full bg-success-500/20 flex items-center justify-center">
                  <span className="text-success-400 text-xs">✓</span>
                </div>
                <span className="text-sm">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-ink-400">Built for the Razorpay AI Buildathon · Track 3</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-ink-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-accent-500 flex items-center justify-center shadow-sm">
              <Zap className="w-5 h-5 text-white" fill="white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-ink-900">Razorpay AI</h1>
              <p className="text-xs text-ink-400">Revenue Recovery</p>
            </div>
          </div>

          <div className="card p-8 animate-slide-up">
            <h2 className="text-2xl font-bold text-ink-900 mb-1">Welcome back</h2>
            <p className="text-sm text-ink-500 mb-6">Sign in to your merchant account</p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-danger-50 border border-danger-200 flex items-start gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-danger-600 mt-0.5 shrink-0" />
                <span className="text-sm text-danger-700">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="text-xs font-medium text-ink-600 uppercase tracking-wide">Email</label>
                <div className="relative mt-1.5">
                  <Mail className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                    placeholder="merchant@example.com"
                    className={`input pl-9 ${touched.email && !emailValid ? 'border-danger-400 focus:ring-danger-400' : ''}`}
                    autoComplete="email"
                  />
                </div>
                {touched.email && !emailValid && (
                  <p className="text-xs text-danger-600 mt-1">Enter a valid email address</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-medium text-ink-600 uppercase tracking-wide">Password</label>
                <div className="relative mt-1.5">
                  <Lock className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                    placeholder="Enter your password"
                    className={`input pl-9 pr-10 ${touched.password && !passwordValid ? 'border-danger-400 focus:ring-danger-400' : ''}`}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {touched.password && !passwordValid && (
                  <p className="text-xs text-danger-600 mt-1">Password must be at least 6 characters</p>
                )}
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-ink-600">Remember me</span>
                </label>
                <button type="button" className="text-sm text-brand-600 hover:text-brand-700 font-medium transition-colors">
                  Forgot password?
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !formValid}
                className="btn-primary w-full py-2.5"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                ) : (
                  <>Sign In <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            {/* Demo credentials */}
            <button
              onClick={fillDemo}
              className="w-full mt-3 p-3 rounded-lg bg-brand-50 border border-brand-200 hover:bg-brand-100 transition-colors text-left"
            >
              <p className="text-xs font-semibold text-brand-700">Demo Credentials</p>
              <p className="text-xs text-ink-500 mt-0.5">demo@example.com · Demo@123 — click to fill</p>
            </button>

            <p className="text-center text-sm text-ink-500 mt-6">
              Don't have an account?{' '}
              <button onClick={() => navigate('/signup')} className="text-brand-600 hover:text-brand-700 font-semibold transition-colors">
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
