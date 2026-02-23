import { create } from 'zustand';

interface SimdState {
  operation: string;
  dataA: string;
  dataB: string;
  scalar: string;
  result: Record<string, unknown> | null;
  loading: boolean;
  setOperation: (v: string) => void;
  setDataA: (v: string) => void;
  setDataB: (v: string) => void;
  setScalar: (v: string) => void;
  setResult: (v: Record<string, unknown> | null) => void;
  setLoading: (v: boolean) => void;
  reset: () => void;
}

export const useSimdStore = create<SimdState>((set) => ({
  operation: 'add',
  dataA: '1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0',
  dataB: '8.0, 7.0, 6.0, 5.0, 4.0, 3.0, 2.0, 1.0',
  scalar: '2.0',
  result: null,
  loading: false,
  setOperation: (operation) => set({ operation }),
  setDataA: (dataA) => set({ dataA }),
  setDataB: (dataB) => set({ dataB }),
  setScalar: (scalar) => set({ scalar }),
  setResult: (result) => set({ result }),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ operation: 'add', dataA: '1, 2, 3, 4, 5, 6, 7, 8', dataB: '8, 7, 6, 5, 4, 3, 2, 1', scalar: '2.0', result: null, loading: false }),
}));
