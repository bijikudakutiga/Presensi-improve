import { useAuth } from "../context/AuthContext";
import { ProfileForm } from "../components/ProfileForm";

export function ProfileIdentityPage() {
  const { profile, refreshProfile, signOut } = useAuth();

  if (!profile) return null;

  return (
    <div className="space-y-4 animate-fadein">
      <h1 className="text-xl font-extrabold tracking-tight">Data Diri</h1>
      <p className="text-sm text-ink/50 -mt-3">
        Lengkapi data ini agar HR dapat memproses administrasi kepegawaian dan penggajian dengan tepat.
      </p>
      <ProfileForm profile={profile} isAdmin={false} onSaved={refreshProfile} />
      <button
        className="btn w-full border border-rust text-rust bg-white hover:bg-rust hover:text-white"
        onClick={signOut}
      >
        Keluar
      </button>
    </div>
  );
}
