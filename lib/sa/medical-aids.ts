export interface MedicalAidScheme {
  readonly name: string;
  readonly code: string;
}

export const MEDICAL_AID_SCHEMES: readonly MedicalAidScheme[] = [
  { name: "Discovery Health", code: "DISCOVERY" },
  { name: "Medihelp", code: "MEDIHELP" },
  { name: "Bonitas", code: "BONITAS" },
  { name: "GEMS", code: "GEMS" },
  { name: "Momentum Health", code: "MOMENTUM" },
  { name: "Bestmed", code: "BESTMED" },
  { name: "Fedhealth", code: "FEDHEALTH" },
  { name: "Polmed", code: "POLMED" },
  { name: "Sizwe Hosmed", code: "SIZWE" },
  { name: "LA Health", code: "LAHEALTH" },
  { name: "Spectramed", code: "SPECTRAMED" },
  { name: "CompCare Wellness", code: "COMPCARE" },
  { name: "Transmed", code: "TRANSMED" },
  { name: "Profmed", code: "PROFMED" },
  { name: "Selfmed", code: "SELFMED" },
] as const;
