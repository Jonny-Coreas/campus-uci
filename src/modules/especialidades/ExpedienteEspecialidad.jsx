import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabaseClient";
import IndexCarpetaAcademica from "../../CarpetaAcademica/IndexCarpetaAcademica";

const CARPETAS = [
  "Capacitaciones",
  "Evaluaciones",
  "Asistencia",
  "Evidencias",
  "Certificaciones",
  "Cronogramas",
  "Competencias",
];

function normalizarCarpeta(valor) {
  const v = String(valor || "Capacitaciones").trim();
  return CARPETAS.includes(v) ? v : "Capacitaciones";
}

function pct(valor) {
  const n = Number(valor || 0);
  return `${Math.round(n)}%`;
}

export default function ExpedienteEspecialidad({
  usuarioId,
  usuario: usuarioProp = null,
  especialidadId,
  especialidadNombre = "Especialidad",
  onBack,
}) {
  const [usuario, setUsuario] = useState(usuarioProp);
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [tabActiva, setTabActiva] = useState("Expediente");

  useEffect(() => {
    cargarExpediente();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioId, especialidadId]);

  async function cargarExpediente() {
    if (!usuarioId || !especialidadId) return;

    setLoading(true);
    setErrorMsg("");

    try {
      if (!usuarioProp) {
        const { data: perfil, error: perfilError } = await supabase
          .from("profiles")
          .select("id, nombre, correo, rol, servicio, area, cum, activo")
          .eq("id", usuarioId)
          .single();

        if (perfilError) throw perfilError;
        setUsuario(perfil);
      } else {
        setUsuario(usuarioProp);
      }

      const { data, error } = await supabase
        .from("especialidad_capacitaciones")
        .select("*, especialidad_capacitaciones_participantes(*)")
        .eq("especialidad_id", especialidadId)
        .eq("recurso_id", usuarioId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRegistros(data || []);
    } catch (error) {
      console.error("Error cargando expediente académico:", error);
      setErrorMsg("No se pudo cargar el expediente académico de este recurso.");
    } finally {
      setLoading(false);
    }
  }

  const resumen = useMemo(() => {
    const totalRegistros = registros.length;
    const horas = registros.reduce((acc, r) => acc + Number(r.horas || 0), 0);
    const participantes = registros.flatMap(
      (r) => r.especialidad_capacitaciones_participantes || [],
    );
    const evaluados = participantes.filter((p) => Number.isFinite(Number(p.evaluacion)));
    const aprobados = evaluados.filter((p) => p.resultado_evaluacion === "APROBADO").length;
    const reprobados = evaluados.filter((p) => p.resultado_evaluacion === "REPROBADO").length;
    const promedio = evaluados.length
      ? evaluados.reduce((acc, p) => acc + Number(p.evaluacion || 0), 0) / evaluados.length
      : 0;

    const porCarpeta = CARPETAS.reduce((acc, carpeta) => {
      acc[carpeta] = 0;
      return acc;
    }, {});

    registros.forEach((r) => {
      const carpeta = normalizarCarpeta(r.carpeta_academica);
      porCarpeta[carpeta] = (porCarpeta[carpeta] || 0) + 1;
    });

    const carpetasConMovimiento = Object.values(porCarpeta).filter((v) => v > 0).length;
    const progreso = CARPETAS.length ? (carpetasConMovimiento / CARPETAS.length) * 100 : 0;

    return {
      totalRegistros,
      horas,
      evaluados: evaluados.length,
      aprobados,
      reprobados,
      promedio,
      porCarpeta,
      progreso,
    };
  }, [registros]);

  const registrosFiltrados = useMemo(() => {
    if (tabActiva === "Expediente") return registros;
    return registros.filter((r) => normalizarCarpeta(r.carpeta_academica) === tabActiva);
  }, [registros, tabActiva]);

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white rounded-2xl shadow p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">Expediente académico hospitalario</p>
          <h2 className="text-2xl font-bold text-gray-800">
            {usuario?.nombre || "Recurso en formación"}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {especialidadNombre} · CUM: {usuario?.cum || "No asignado"}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={cargarExpediente}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            Actualizar
          </button>
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
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl shadow p-4">
          <p className="text-xs text-gray-500">Progreso académico</p>
          <p className="text-3xl font-black text-blue-700">{pct(resumen.progreso)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow p-4">
          <p className="text-xs text-gray-500">Horas acumuladas</p>
          <p className="text-3xl font-black text-gray-800">{resumen.horas}</p>
        </div>
        <div className="bg-white rounded-2xl shadow p-4">
          <p className="text-xs text-gray-500">Promedio evaluación</p>
          <p className="text-3xl font-black text-gray-800">{resumen.promedio.toFixed(1)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow p-4">
          <p className="text-xs text-gray-500">Aprobados / Reprobados</p>
          <p className="text-3xl font-black text-gray-800">
            {resumen.aprobados}/{resumen.reprobados}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTabActiva("Expediente")}
            className={`px-4 py-2 rounded-xl font-bold ${
              tabActiva === "Expediente"
                ? "bg-blue-700 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Expediente
          </button>

          {CARPETAS.map((carpeta) => (
            <button
              key={carpeta}
              type="button"
              onClick={() => setTabActiva(carpeta)}
              className={`px-4 py-2 rounded-xl font-bold ${
                tabActiva === carpeta
                  ? "bg-blue-700 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {carpeta} ({resumen.porCarpeta[carpeta] || 0})
            </button>
          ))}
        </div>
      </div>

      {tabActiva === "Expediente" ? (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-bold text-gray-800">Resumen por carpetas académicas</h3>
            <p className="text-sm text-gray-500">
              Aquí se organiza el historial académico del recurso sin mezclar evaluaciones, asistencia y evidencias.
            </p>
          </div>

          {loading ? (
            <div className="p-6 text-gray-500">Cargando expediente...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
              {CARPETAS.map((carpeta) => (
                <div key={carpeta} className="border rounded-2xl p-4 bg-gray-50">
                  <p className="text-sm text-gray-500">Carpeta</p>
                  <h4 className="text-lg font-black text-gray-800">{carpeta}</h4>
                  <p className="text-3xl font-black text-blue-700 mt-2">
                    {resumen.porCarpeta[carpeta] || 0}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">registros guardados</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <IndexCarpetaAcademica
            carpetaActiva={tabActiva}
            usuarioId={usuarioId}
            usuario={usuario}
            recurso={usuario}
            especialidadId={especialidadId}
            especialidad={{ id: especialidadId, nombre: especialidadNombre }}
            especialidadNombre={especialidadNombre}
            registros={registrosFiltrados}
            onRefresh={cargarExpediente}
          />
        </div>
      )}
    </div>
  );
}
