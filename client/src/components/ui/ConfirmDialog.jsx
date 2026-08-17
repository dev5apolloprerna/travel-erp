import { createContext, useContext, useState, useCallback } from 'react';

const ConfirmContext = createContext(null);
export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);

  const confirm = useCallback(
    ({ title = 'Are you sure?', message = 'This action cannot be undone.', confirmLabel = 'Delete', danger = true } = {}) =>
      new Promise((resolve) => setState({ title, message, confirmLabel, danger, resolve })),
    []
  );

  const close = (result) => { state?.resolve(result); setState(null); };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/40 p-4" onClick={() => close(false)}>
          <div className="card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-ink">{state.title}</h3>
            <p className="mt-2 text-sm text-ink-muted">{state.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => close(false)} className="btn-ghost">Cancel</button>
              <button onClick={() => close(true)} className={state.danger ? 'btn-danger' : 'btn-primary'}>
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
