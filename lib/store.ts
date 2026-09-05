import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RegisterDraft {
  fullName: string;
  idNumber: string;
  phone: string;
  step: number;
  livenessDone: boolean;
}

interface RegisterStore extends RegisterDraft {
  setDetails: (data: Pick<RegisterDraft, "fullName" | "idNumber" | "phone">) => void;
  setStep: (step: number) => void;
  setLivenessDone: (done: boolean) => void;
  reset: () => void;
}

const initial: RegisterDraft = {
  fullName: "",
  idNumber: "",
  phone: "",
  step: 1,
  livenessDone: false,
};

export const useRegisterStore = create<RegisterStore>()(
  persist(
    (set) => ({
      ...initial,
      setDetails: (data) => set({ ...data }),
      setStep: (step) => set({ step }),
      setLivenessDone: (livenessDone) => set({ livenessDone }),
      reset: () => set(initial),
    }),
    { name: "imali-register-draft" }
  )
);

interface AuthStore {
  traderId: string | null;
  fullName: string | null;
  phone: string | null;
  setTrader: (data: { traderId: string; fullName: string; phone: string }) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      traderId: null,
      fullName: null,
      phone: null,
      setTrader: (data) => set(data),
      clear: () => set({ traderId: null, fullName: null, phone: null }),
    }),
    { name: "imali-auth" }
  )
);
