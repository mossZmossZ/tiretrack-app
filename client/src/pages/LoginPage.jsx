import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleDigit = async (digit) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    // Auto-submit at 4 digits
    if (newPin.length === 4) {
      setLoading(true);
      try {
        const result = await login(newPin);
        if (result.success) {
          navigate(result.role === 'admin' ? '/admin/dashboard' : '/tech/input');
        } else {
          setError(result.error || 'รหัส PIN ไม่ถูกต้อง');
          setShaking(true);
          setTimeout(() => { setShaking(false); setPin(''); }, 500);
        }
      } catch {
        setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์');
        setShaking(true);
        setTimeout(() => { setShaking(false); setPin(''); }, 500);
      }
      setLoading(false);
    }
  };

  const handleDelete = () => {
    setPin(p => p.slice(0, -1));
    setError('');
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
            <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>tire_repair</span>
          </div>
          <h1 className="text-2xl font-extrabold text-text-primary" style={{ fontFamily: 'Manrope' }}>TireTrack</h1>
          <p className="text-sm text-text-secondary mt-1">ใส่รหัส PIN เพื่อเข้าสู่ระบบ</p>
        </div>

        {/* PIN Dots */}
        <div className={`flex justify-center gap-4 mb-8 ${shaking ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`pin-dot transition-all duration-200 ${i < pin.length ? 'filled' : ''}`}
            />
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-center text-danger text-sm mb-4 animate-fade-in">{error}</p>
        )}

        {/* Number Pad */}
        <div className="flex flex-col items-center gap-3">
          {[[1, 2, 3], [4, 5, 6], [7, 8, 9]].map((row, ri) => (
            <div key={ri} className="flex gap-4">
              {row.map(num => (
                <button
                  key={num}
                  onClick={() => handleDigit(String(num))}
                  disabled={loading}
                  className="numpad-btn hover:shadow-md"
                >
                  {num}
                </button>
              ))}
            </div>
          ))}
          <div className="flex gap-4">
            <div className="w-[72px] h-[72px]" />
            <button
              onClick={() => handleDigit('0')}
              disabled={loading}
              className="numpad-btn hover:shadow-md"
            >
              0
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="numpad-btn hover:shadow-md !bg-transparent !border-transparent"
            >
              <span className="material-symbols-outlined text-text-secondary">backspace</span>
            </button>
          </div>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-center mt-6">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
