import { useState } from "react";

function fieldToInitialValue(field) {
  return field.type === "select" ? "" : "";
}

export default function MasterForm({ title, subtitle, fields, onCancel, onSaveAndNext, onSave }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map((field) => [field.name, fieldToInitialValue(field)]))
  );

  function handleChange(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave?.(values);
  }

  return (
    <div className="max-w-[1060px] rounded-xl border border-epi-border bg-white p-10">
      <h2 className="text-xl font-semibold text-epi-ink">{title}</h2>
      <p className="mt-1 text-sm text-epi-muted">{subtitle}</p>

      <form className="mt-8 grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2" onSubmit={handleSubmit}>
        {fields.map((field) => (
          <label key={field.name} className="block text-[13px] font-medium text-epi-ink">
            {field.label}
            {field.type === "select" ? (
              <select
                value={values[field.name]}
                onChange={(event) => handleChange(field.name, event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink focus:outline-none focus:ring-2 focus:ring-epi-brand"
              >
                <option value="" disabled>
                  {field.placeholder ?? "Selecione"}
                </option>
                {(field.options ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={values[field.name]}
                onChange={(event) => handleChange(field.name, event.target.value)}
                placeholder={field.placeholder}
                className="mt-2 h-11 w-full rounded-lg border border-epi-border px-3 text-sm text-epi-ink placeholder:text-epi-muted focus:outline-none focus:ring-2 focus:ring-epi-brand"
              />
            )}
          </label>
        ))}

        <div className="col-span-full mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-epi-border px-4 py-2.5 text-sm font-medium text-epi-ink"
          >
            Cancelar
          </button>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onSaveAndNext?.(values)}
              className="rounded-lg border border-epi-border px-4 py-2.5 text-sm font-medium text-epi-ink"
            >
              Próximo cadastro
            </button>
            <button
              type="submit"
              className="rounded-lg bg-epi-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Salvar cadastro
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
