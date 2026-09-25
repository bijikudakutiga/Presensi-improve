import { useAuth } from "../context/AuthContext";

export function Login() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Presensi</h1>
          <p className="mt-1 text-sm text-ink/60">
            Masuk dengan akun Google kantor untuk mulai absen.
          </p>
        </div>
        <button
          onClick={signInWithGoogle}
          className="btn-primary w-full py-3"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#fff"
              d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.3 0 6.3 1.2 8.6 3.2l6-6C34.9 4.1 29.7 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.1-2.7-.5-4z"
            />
          </svg>
          Masuk dengan Google
        </button>
        <p className="text-xs text-ink/40">
          Hanya email yang terdaftar oleh admin yang dapat mengakses sistem ini.
        </p>
      </div>
    </div>
  );
}
