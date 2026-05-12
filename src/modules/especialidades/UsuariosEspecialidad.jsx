import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import ExpedienteEspecialidad from "./ExpedienteEspecialidad";

export default function UsuariosEspecialidad({
  especialidadId,
  especialidadNombre = "Especialidad",
  onBack,
}) {
  const [usuarios, setUsuarios] = useState([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (especialidadId) fetchUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [especialidadId]);

  const fetchUsuarios = async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase
        .from("usuario_especialidad")
        .select(`
          id,
          usuario_id,
          especialidad_id,
          progreso,
          created_at,
          profiles:usuario_id (
            id,
            nombre,
            correo,
            rol,
            servicio,
            area,
            cum,
            activo
          )
        `)
        .eq("especialidad_id", especialidadId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const lista = (data || [])
        .map((item) => ({
          ...(item.profiles || {}),
          asignacion_id: item.id,
          usuario_id: item.usuario_id,
          especialidad_id: item.especialidad_id,
          progreso: item.progreso || 0,
          created_at: item.created_at,
        }))
        .filter((item) => item?.id);

      setUsuarios(lista);
    } catch (error) {
      console.error("Error cargando usuarios de especialidad:", error);
      setErrorMsg("No se pudieron cargar los usuarios asignados a esta especialidad.");
    } finally {
      setLoading(false);
    }
  };

  if (usuarioSeleccionado) {
    return (
      <ExpedienteEspecialidad
        usuarioId={usuarioSeleccionado.id}
        usuario={usuarioSeleccionado}
        especialidadId={especialidadId}
        especialidadNombre={especialidadNombre}
        onBack={() => setUsuarioSeleccionado(null)}
      />
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white rounded-2xl shadow p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">Expedientes por especialidad</p>
          <h2 className="text-2xl font-bold text-gray-800">{especialidadNombre}</h2>
          <p className="text-sm text-gray-500 mt-1">
            Selecciona un recurso para abrir su expediente académico individual.
          </p>
        </div>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold"
          >
            ← Volver
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3">
          {errorMsg}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-gray-800">Recursos asignados</h3>
            <p className="text-sm text-gray-500">Total: {usuarios.length}</p>
          </div>

          <button
            type="button"
            onClick={fetchUsuarios}
            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            Actualizar
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-gray-500">Cargando usuarios...</div>
        ) : usuarios.length === 0 ? (
          <div className="p-6 text-gray-500">
            No hay usuarios asignados a esta especialidad todavía.
          </div>
        ) : (
          <div className="divide-y">
            {usuarios.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => setUsuarioSeleccionado(user)}
                className="w-full text-left p-4 hover:bg-blue-50 transition flex items-center justify-between gap-4"
              >
                <div>
                  <h4 className="font-bold text-gray-800">{user.nombre || "Sin nombre"}</h4>
                  <p className="text-sm text-gray-500">{user.correo || "Sin correo"}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {user.servicio || "Sin servicio"} {user.area ? `• ${user.area}` : ""}
                  </p>
                </div>

                <div className="text-right">
                  <span className="inline-block px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                    CUM: {user.cum || "No asignado"}
                  </span>
                  <p className="text-xs text-blue-600 font-semibold mt-2">
                    Progreso: {user.progreso || 0}% · Abrir expediente →
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
