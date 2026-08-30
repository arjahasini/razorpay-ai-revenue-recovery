import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, User, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ name: false, email: false, password: false, confirm: false });

  const nameValid = name.trim().length >= 2;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;
  const confirmValid = confirm === password && confirm.length > 0;
  const formValid = nameValid && emailValid && passwordValid && confirmValid;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formValid) {
      setTouched({ name: true, email: true, password: true, confirm: true });
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signup(name, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
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
            Start recovering<br />lost revenue today.
          </h2>
          <p className="text-ink-300 text-lg max-w-md leading-relaxed">
            Create an account to access the AI-powered recovery dashboard, queue, and insights.
          </p>
        </div>

        <p className="relative text-xs text-ink-400">Built for the Razorpay AI Buildathon · Track 3</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-ink-50">
        <div className="w-full max-w-md">
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
            <h2 className="text-2xl font-bold text-ink-900 mb-1">Create account</h2>
            <p className="text-sm text-ink-500 mb-6">Get started with AI Revenue Recovery</p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-danger-50 border border-danger-200 flex items-start gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-danger-600 mt-0.5 shrink-0" />
                <span className="text-sm text-danger-700">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs font-medium text-ink-600 uppercase tracking-wide">Full Name</label>
                <div className="relative mt-1.5">
                  <User className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                    placeholder="Your full name"
                    className={`input pl-9 ${touched.name && !nameValid ? 'border-danger-400 focus:ring-danger-400' : ''}`}
                  />
                </div>
                {touched.name && !nameValid && (
                  <p className="text-xs text-danger-600 mt-1">Name must be at least 2 characters</p>
                )}
              </div>

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
                    placeholder="At least 6 characters"
                    className={`input pl-9 pr-10 ${touched.password && !passwordValid ? 'border-danger-400 focus:ring-danger-400' : ''}`}
                    autoComplete="new-password"
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

              {/* Confirm Password */}
              <div>
                <label className="text-xs font-medium text-ink-600 uppercase tracking-wide">Confirm Password</label>
                <div className="relative mt-1.5">
                  <Lock className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                    placeholder="Re-enter password"
                    className={`input pl-9 ${touched.confirm && !confirmValid ? 'border-danger-400 focus:ring-danger-400' : ''}`}
                    autoComplete="new-password"
                  />
                </div>
                {touched.confirm && !confirmValid && (
                  <p className="text-xs text-danger-600 mt-1">Passwords do not match</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !formValid}
                className="btn-primary w-full py-2.5"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
                ) : (
                  <>Create Account <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-ink-500 mt-6">
              Already have an account?{' '}
              <button onClick={() => navigate('/login')} className="text-brand-600 hover:text-brand-700 font-semibold transition-colors">
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
