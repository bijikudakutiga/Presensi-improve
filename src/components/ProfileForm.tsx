import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { getEmployeeDirectory } from "../lib/employeeDirectory";
import type { EmployeeDirectoryEntry, Position, Profile } from "../types";

interface Props {
  profile: Profile;
  isAdmin: boolean;
  onSaved: () => void;
}

type FormState = Partial<Profile>;

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="field-label block mb-1">{label}</span>
      <input
        type={type}
        className="input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="field-label block mb-1">{label}</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Pilih...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ProfileForm({ profile, isAdmin, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(profile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [directory, setDirectory] = useState<EmployeeDirectoryEntry[]>([]);

  useEffect(() => {
    supabase
      .from("positions")
      .select("*")
      .order("level")
      .then(({ data }) => setPositions((data as Position[]) || []));
    getEmployeeDirectory().then(setDirectory);
  }, []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const payload: Record<string, unknown> = {
      full_name: form.full_name || null,
      position: form.position || null,
      employee_id: form.employee_id || null,
      join_date: form.join_date || null,
      gender: form.gender || null,
      place_of_birth: form.place_of_birth || null,
      date_of_birth: form.date_of_birth || null,
      marital_status: form.marital_status || null,
      religion: form.religion || null,
      blood_type: form.blood_type || null,
      phone: form.phone || null,
      id_number: form.id_number || null,
      id_address: form.id_address || null,
      domicile_address: form.domicile_address || null,
      emergency_contact_name: form.emergency_contact_name || null,
      emergency_contact_phone: form.emergency_contact_phone || null,
      bank_name: form.bank_name || null,
      bank_account_number: form.bank_account_number || null,
      bank_account_holder: form.bank_account_holder || null,
    };
    if (isAdmin) {
      payload.base_salary = form.base_salary || null;
      payload.role = form.role || "employee";
      payload.position_id = form.position_id || null;
      payload.supervisor_id = form.supervisor_id || null;
      payload.position = positions.find((p) => p.id === form.position_id)?.name || null;
    }
    const { error: updateError } = await supabase.from("profiles").update(payload).eq("id", profile.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onSaved();
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <p className="field-label">Informasi Pribadi</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nama lengkap" value={form.full_name || ""} onChange={(v) => set("full_name", v)} />
          <Field label="ID Karyawan" value={form.employee_id || ""} onChange={(v) => set("employee_id", v)} />
          <div className="block">
            <span className="field-label block mb-1">Jabatan</span>
            <p className="input bg-ink/5 text-ink/60">
              {positions.find((p) => p.id === form.position_id)?.name || form.position || "Belum diatur"}
            </p>
          </div>
          <div className="block">
            <span className="field-label block mb-1">Atasan Langsung</span>
            <p className="input bg-ink/5 text-ink/60">
              {directory.find((d) => d.id === form.supervisor_id)?.full_name || "Belum diatur"}
            </p>
          </div>
          <Field
            label="Tanggal bergabung"
            type="date"
            value={form.join_date || ""}
            onChange={(v) => set("join_date", v)}
          />
          <Select
            label="Jenis kelamin"
            value={form.gender || ""}
            onChange={(v) => set("gender", v as Profile["gender"])}
            options={[
              { value: "L", label: "Laki-laki" },
              { value: "P", label: "Perempuan" },
            ]}
          />
          <Field label="Golongan darah" value={form.blood_type || ""} onChange={(v) => set("blood_type", v)} />
          <Field label="Tempat lahir" value={form.place_of_birth || ""} onChange={(v) => set("place_of_birth", v)} />
          <Field
            label="Tanggal lahir"
            type="date"
            value={form.date_of_birth || ""}
            onChange={(v) => set("date_of_birth", v)}
          />
          <Select
            label="Status pernikahan"
            value={form.marital_status || ""}
            onChange={(v) => set("marital_status", v)}
            options={[
              { value: "Belum Menikah", label: "Belum Menikah" },
              { value: "Menikah", label: "Menikah" },
              { value: "Cerai", label: "Cerai" },
            ]}
          />
          <Field label="Agama" value={form.religion || ""} onChange={(v) => set("religion", v)} />
        </div>
      </div>

      <div className="card space-y-3">
        <p className="field-label">Informasi Kontak</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="No. HP" value={form.phone || ""} onChange={(v) => set("phone", v)} />
          <Field label="No. KTP / Identitas" value={form.id_number || ""} onChange={(v) => set("id_number", v)} />
          <Field
            label="Alamat sesuai KTP"
            value={form.id_address || ""}
            onChange={(v) => set("id_address", v)}
          />
          <Field
            label="Alamat domisili"
            value={form.domicile_address || ""}
            onChange={(v) => set("domicile_address", v)}
          />
          <Field
            label="Kontak darurat (nama)"
            value={form.emergency_contact_name || ""}
            onChange={(v) => set("emergency_contact_name", v)}
          />
          <Field
            label="Kontak darurat (no. HP)"
            value={form.emergency_contact_phone || ""}
            onChange={(v) => set("emergency_contact_phone", v)}
          />
        </div>
      </div>

      <div className="card space-y-3">
        <p className="field-label">Informasi Bank (untuk penggajian)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nama bank" value={form.bank_name || ""} onChange={(v) => set("bank_name", v)} />
          <Field
            label="Nomor rekening"
            value={form.bank_account_number || ""}
            onChange={(v) => set("bank_account_number", v)}
          />
          <Field
            label="Nama pemilik rekening"
            value={form.bank_account_holder || ""}
            onChange={(v) => set("bank_account_holder", v)}
          />
        </div>
      </div>

      {isAdmin && (
        <div className="card space-y-3">
          <p className="field-label">Khusus Admin</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Jabatan"
              value={form.position_id || ""}
              onChange={(v) => set("position_id", v || null)}
              options={positions.map((p) => ({ value: p.id, label: p.name }))}
            />
            <Select
              label="Atasan langsung"
              value={form.supervisor_id || ""}
              onChange={(v) => set("supervisor_id", v || null)}
              options={directory.filter((d) => d.id !== profile.id).map((d) => ({ value: d.id, label: d.full_name || d.id }))}
            />
            <Field
              label="Gaji pokok (Rp)"
              type="number"
              value={form.base_salary?.toString() || ""}
              onChange={(v) => set("base_salary", v ? Number(v) : null)}
            />
            <Select
              label="Peran"
              value={form.role || "employee"}
              onChange={(v) => set("role", v as Profile["role"])}
              options={[
                { value: "employee", label: "Karyawan" },
                { value: "admin", label: "Admin" },
              ]}
            />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-rust">{error}</p>}
      <button className="btn-primary w-full" onClick={handleSave} disabled={saving}>
        {saving ? "Menyimpan..." : "Simpan Data"}
      </button>
    </div>
  );
}
