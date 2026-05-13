import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
);

const CARGOS_PARTICIPANTE = [
  "Licenciado(a)",
  "Tecnólogo(a)",
  "Técnico(a)",
  "DOCTOR(a)",
];

const FALLBACK_UNIDADES = [
  "UCI GENERAL",
  "UCI TRAUMA",
  "UCI QUIRURGICA",
  "INTERMEDIOS",
  "ECMO",
  "HEMODIÁLISIS",
  "OTRO",
];

function normalizeServiceOption(row) {
  if (!row) return null;
  const nombre =
    row.nombre ||
    row.servicio ||
    row.unidad ||
    row.descripcion ||
    row.label ||
    row.name ||
    "";
  const id = row.id || row.servicio_id || row.value || "";
  if (!nombre) return null;
  return { id: String(id || ""), nombre: String(nombre) };
}

const IMPARTIDA_OPCIONES = ["SI", "NO"];
const PARTICIPANTE_VACIO = {
  nombre: "",
  cargo: "",
  evaluacion: "",
  resultado_evaluacion: "",
  observaciones: "",
};

const pct = (num) => `${(num ?? 0).toFixed(1)}%`;

function semaforoFromPct(p) {
  if (p >= 85) return { label: "Óptimo", color: "#16a34a", bg: "#dcfce7" };
  if (p >= 60) return { label: "Alerta", color: "#ca8a04", bg: "#fef9c3" };
  return { label: "Crítico", color: "#dc2626", bg: "#fee2e2" };
}

function resultadoEvaluacion(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return "";
  return n <= 6 ? "REPROBADO" : "APROBADO";
}

function badgeStyle(ok) {
  return ok
    ? { border: "1px solid #16a34a", color: "#166534", background: "#dcfce7" }
    : { border: "1px solid #dc2626", color: "#991b1b", background: "#fee2e2" };
}

function Card({ title, children, style, bodyStyle }) {
  return (
    <div
      style={{
        border: "1px solid #dbeafe",
        borderRadius: 20,
        background: "white",
        padding: 16,
        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
        minWidth: 0,
        ...style,
      }}
    >
      <div
        style={{
          fontWeight: 900,
          marginBottom: 12,
          color: "#223b78",
          fontSize: 16,
          letterSpacing: 0.2,
        }}
      >
        {title}
      </div>
      <div style={{ minWidth: 0, ...bodyStyle }}>{children}</div>
    </div>
  );
}

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function normalizarParticipantes(arr, tieneEvaluacion = true) {
  const base = Array.isArray(arr) && arr.length ? arr : [PARTICIPANTE_VACIO];
  return base.map((p) => {
    const nota =
      p?.evaluacion === "" || p?.evaluacion === null || p?.evaluacion === undefined
        ? ""
        : String(p.evaluacion);
    return {
      nombre: p?.nombre || "",
      cargo: p?.cargo || "",
      evaluacion: tieneEvaluacion ? nota : "",
      resultado_evaluacion: tieneEvaluacion ? (p?.resultado_evaluacion || resultadoEvaluacion(nota)) : "SIN EVALUACIÓN",
      observaciones: p?.observaciones || "",
    };
  });
}

export default function EvaluacionesPRO({
  profile: profileProp = null,
  areaActiva: areaActivaProp = null,
  especialidad = null,
  recurso = null,
  evaluacionActiva = {},
  setEvaluacionActiva = null,
  embedded = true,
  onBack = null,
}) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  const [isSmall, setIsSmall] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 980px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia("(max-width: 980px)");
    const onChange = () => setIsSmall(m.matches);
    onChange();
    m.addEventListener?.("change", onChange);
    return () => m.removeEventListener?.("change", onChange);
  }, []);

  const [fecha, setFecha] = useState(hoyISO());
  const [unidad, setUnidad] = useState(() => evaluacionActiva?.unidad || "UCI");
  const [tema, setTema] = useState("");
  const [fechaSolicitada, setFechaSolicitada] = useState(hoyISO());
  const [quienSolicito, setQuienSolicito] = useState("");
  const [impartida, setImpartida] = useState("SI");
  const [personalImpartio, setPersonalImpartio] = useState("");
  const [cargo, setCargo] = useState("");
  const [horas, setHoras] = useState("");
  const [tieneEvaluacion, setTieneEvaluacion] = useState("SI");
  const [personalRecibio, setPersonalRecibio] = useState("");
  const [participantes, setParticipantes] = useState([{ ...PARTICIPANTE_VACIO }]);
  const [observaciones, setObservaciones] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState("");

  const [profile, setProfile] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [serviceOptions, setServiceOptions] = useState([]);

  
  const effectiveProfile = profileProp || profile || null;

  const rol = String(effectiveProfile?.rol || "").toLowerCase();
  const isJefe = rol === "jefe" || rol === "admin";
  const areaIdPerfil = areaActivaProp || effectiveProfile?.area_id || "";
  const unitOptions = useMemo(
    () =>
      serviceOptions.length
        ? serviceOptions
        : FALLBACK_UNIDADES.map((nombre) => ({ id: "", nombre })),
    [serviceOptions],
  );

  const serviceNameById = useMemo(() => {
    const map = {};
    unitOptions.forEach((item) => {
      if (item?.id) map[String(item.id)] = item.nombre;
    });
    return map;
  }, [unitOptions]);

  const resolveUnidadFromService = useCallback((servicioId, fallback = "") => {
    if (servicioId && serviceNameById[String(servicioId)]) {
      return serviceNameById[String(servicioId)];
    }
    return fallback || "";
  }, [serviceNameById]);

  function resolveServiceIdFromUnidad(nombreUnidad) {
    const found = unitOptions.find((item) => item.nombre === nombreUnidad);
    return found?.id || "";
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!supabase) return;
        const { data, error } = await supabase.from("servicios").select("*");
        if (error) throw error;
        if (!alive) return;
        const normalizados = (data || [])
          .map(normalizeServiceOption)
          .filter(Boolean);
        if (normalizados.length) {
          setServiceOptions(normalizados);
        }
      } catch (e) {
        console.warn("No se pudieron cargar servicios:", e?.message || e);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Campus UCI: la unidad queda libre para todos los roles.
  // No forzamos la unidad por servicio_id porque puede registrar UCI General, Trauma, Quirúrgica, Intermedios, ECMO o Hemodiálisis.
  useEffect(() => {
    return undefined;
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoadingProfile(true);

        if (profileProp) {
          setProfile(profileProp);
        }

        if (supabase) {
          const { data } = await supabase.auth.getUser();
          if (!alive) return;
          setUserId(data?.user?.id || profileProp?.user_id || null);
        } else {
          setUserId(profileProp?.user_id || null);
        }

        const unidadDesdePerfil =
          profileProp?.servicio ||
          profileProp?.unidad ||
          resolveUnidadFromService(profileProp?.servicio_id, "UCI");

        if (unidadDesdePerfil) {
          setUnidad((prev) => (prev?.trim() ? prev : unidadDesdePerfil));
        }
      } catch (e) {
        console.warn(e);
        if (!alive) return;
        setUserId(profileProp?.user_id || null);
        setProfile(profileProp || null);
      } finally {
        if (alive) setLoadingProfile(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [profileProp, resolveUnidadFromService]);

  const lastFromGlobalRef = useRef({ unidad: null });
  const lastSentToGlobalRef = useRef({ unidad: null });

  useEffect(() => {
    const gUni = (evaluacionActiva?.unidad || "").trim();
    const last = lastFromGlobalRef.current;
    if (last.unidad === gUni) return;

    lastFromGlobalRef.current = { unidad: gUni };
    setUnidad((prev) => ((prev || "").trim() === gUni ? prev : gUni));
  }, [evaluacionActiva?.unidad]);

  useEffect(() => {
    if (!setEvaluacionActiva) return;
    const lUni = (unidad || "").trim();
    if (!lUni) return;

    const lastSent = lastSentToGlobalRef.current;
    if (lastSent.unidad === lUni) return;

    lastSentToGlobalRef.current = { unidad: lUni };

    setEvaluacionActiva((prev) => {
      const pUni = (prev?.unidad || "").trim();
      if (pUni === lUni) return prev;
      return { ...(prev || {}), unidad: lUni };
    });
  }, [unidad, setEvaluacionActiva]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      if (!supabase) {
        const saved = JSON.parse(
          localStorage.getItem("especialidad_capacitaciones_v2") || "[]",
        );
        setRows(saved);
        return;
      }

      let q = supabase
        .from("especialidad_capacitaciones")
        .select("*, especialidad_capacitaciones_participantes(*)")
        .order("created_at", { ascending: false });

      if (especialidad?.id) {
        q = q.eq("especialidad_id", especialidad.id);
      }

      if (recurso?.profile_id) {
        q = q.eq("recurso_id", recurso.profile_id);
      }

      // Campus UCI: no filtramos por rol/servicio en este módulo académico PRO.
      // La visibilidad fina se manejará después desde expedientes, dashboards y RLS específica.

      const { data, error } = await q;
      if (error) throw error;

      const normalizados = (data || []).map((r) => ({
        ...r,
        tiene_evaluacion: r.tiene_evaluacion ?? true,
        cantidad_participantes:
          r.cantidad_participantes ??
          ((r.especialidad_capacitaciones_participantes || []).length || 0),
        participantes: normalizarParticipantes(
          r.especialidad_capacitaciones_participantes || [],
          r.tiene_evaluacion ?? true,
        ),
      }));

      setRows(normalizados);
    } catch (e) {
      console.error(e);
      alert(`Error cargando datos: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  }, [especialidad?.id, recurso?.profile_id]);

  useEffect(() => {
    if (loadingProfile) return;
    loadData();
  }, [loadingProfile, loadData]);

  useEffect(() => {
    if (!supabase) {
      localStorage.setItem(
        "especialidad_capacitaciones_v2",
        JSON.stringify(rows),
      );
    }
  }, [rows]);

  const selectedRow = useMemo(
    () => rows.find((r) => r.id === selectedId) || null,
    [rows, selectedId],
  );

  const currentParticipantes = useMemo(() => {
    return normalizarParticipantes(participantes, tieneEvaluacion === "SI");
  }, [participantes, tieneEvaluacion]);

  const view = selectedRow || {
    fecha,
    unidad,
    tema,
    fecha_solicitada: fechaSolicitada,
    quien_solicito: quienSolicito,
    impartida: impartida,
    personal_impartio: personalImpartio,
    cargo,
    horas,
    personal_recibio: personalRecibio,
    tiene_evaluacion: tieneEvaluacion === "SI",
    cantidad_participantes: currentParticipantes.length,
    participantes: currentParticipantes,
    observaciones,
  };

  const detalleSeleccionado = view?.participantes || [];

  const stats = useMemo(() => {
    const total = rows.length;
    const impartidasSi = rows.filter((r) => r.impartida === "SI").length;
    const impartidasNo = rows.filter((r) => r.impartida === "NO").length;

    const participantesAll = rows.flatMap((r) => r.participantes || []);
    const evaluados = participantesAll.filter((p) =>
      Number.isFinite(Number(p.evaluacion)),
    );
    const aprobados = evaluados.filter(
      (p) => p.resultado_evaluacion === "APROBADO",
    ).length;
    const reprobados = evaluados.filter(
      (p) => p.resultado_evaluacion === "REPROBADO",
    ).length;

    const totalHoras = rows.reduce((acc, r) => acc + (Number(r.horas) || 0), 0);
    const promedioEvaluacion = evaluados.length
      ? evaluados.reduce((acc, p) => acc + Number(p.evaluacion || 0), 0) /
        evaluados.length
      : 0;

    const cumplimiento = total > 0 ? (impartidasSi / total) * 100 : 0;
    const sem = semaforoFromPct(cumplimiento);

    const porTemaMap = rows.reduce((acc, r) => {
      const key = (r.tema || "Sin tema").trim() || "Sin tema";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const porTema = Object.entries(porTemaMap)
      .map(([tema, cantidad]) => ({ tema, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 8);

    const porUnidadMap = rows.reduce((acc, r) => {
      const key = (r.unidad || "Sin unidad").trim() || "Sin unidad";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const porUnidad = Object.entries(porUnidadMap)
      .map(([unidad, cantidad]) => ({ unidad, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);

    const conEvaluacion = rows.filter((r) => r.tiene_evaluacion).length;
    const sinEvaluacion = rows.filter((r) => !r.tiene_evaluacion).length;
    const totalParticipantes = participantesAll.length;

    return {
      total,
      impartidasSi,
      impartidasNo,
      aprobados,
      reprobados,
      totalHoras,
      promedioEvaluacion,
      cumplimiento,
      sem,
      porTema,
      porUnidad,
      evaluadas: evaluados.length,
      conEvaluacion,
      sinEvaluacion,
      totalParticipantes,
    };
  }, [rows]);

  const donutImpartidaData = useMemo(() => {
    const has = stats.total > 0;
    return {
      labels: ["Impartida SI", "Impartida NO"],
      datasets: [
        {
          data: has ? [stats.impartidasSi, stats.impartidasNo] : [1, 1],
          backgroundColor: ["#22c55e", "#ef4444"],
          borderWidth: 0,
        },
      ],
    };
  }, [stats.total, stats.impartidasSi, stats.impartidasNo]);

  const donutResultadosData = useMemo(() => {
    const total = stats.aprobados + stats.reprobados;
    return {
      labels: ["Aprobado", "Reprobado"],
      datasets: [
        {
          data: total > 0 ? [stats.aprobados, stats.reprobados] : [1, 1],
          backgroundColor: ["#2563eb", "#f97316"],
          borderWidth: 0,
        },
      ],
    };
  }, [stats.aprobados, stats.reprobados]);

  const donutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
      cutout: "60%",
    }),
    [],
  );

  const temaBarData = useMemo(() => {
    return {
      labels: stats.porTema.map((x) => x.tema),
      datasets: [
        {
          label: "Evaluaciones por tema",
          data: stats.porTema.map((x) => x.cantidad),
          backgroundColor: "#3b82f6",
          borderRadius: 8,
          maxBarThickness: 42,
        },
      ],
    };
  }, [stats.porTema]);

  const temaBarOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
      scales: {
        y: { beginAtZero: true },
        x: {
          ticks: {
            callback: function (value) {
              const label = this.getLabelForValue(value);
              return String(label).length > 18
                ? `${String(label).slice(0, 18)}…`
                : label;
            },
          },
        },
      },
    }),
    [],
  );

  const unidadBarData = useMemo(() => {
    return {
      labels: stats.porUnidad.map((x) => x.unidad),
      datasets: [
        {
          label: "Evaluaciones por servicio",
          data: stats.porUnidad.map((x) => x.cantidad),
          backgroundColor: "#14b8a6",
          borderRadius: 8,
          maxBarThickness: 42,
        },
      ],
    };
  }, [stats.porUnidad]);

  const unidadBarOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
      scales: { y: { beginAtZero: true } },
    }),
    [],
  );

  function resetForm() {
    const unidadPorDefecto = unidad || evaluacionActiva?.unidad || "UCI GENERAL";
    setFecha(hoyISO());
    setUnidad(unidadPorDefecto || "UCI");
    setTema("");
    setFechaSolicitada(hoyISO());
    setQuienSolicito("");
    setImpartida("SI");
    setPersonalImpartio("");
    setCargo("");
    setHoras("");
    setTieneEvaluacion("SI");
    setPersonalRecibio("");
    setParticipantes([{ ...PARTICIPANTE_VACIO }]);
    setObservaciones("");
    setSelectedId(null);
  }

  function addParticipante() {
    setParticipantes((prev) => [...prev, { ...PARTICIPANTE_VACIO }]);
  }

  function removeParticipante(index) {
    setParticipantes((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  function updateParticipante(index, field, value) {
    setParticipantes((prev) =>
      prev.map((p, i) => {
        if (i !== index) return p;
        const next = { ...p, [field]: value };
        if (field === "evaluacion") {
          next.resultado_evaluacion =
            tieneEvaluacion === "SI" ? resultadoEvaluacion(value) : "SIN EVALUACIÓN";
        }
        return next;
      }),
    );
  }

  useEffect(() => {
    if (tieneEvaluacion === "NO") {
      setParticipantes((prev) =>
        prev.map((p) => ({
          ...p,
          evaluacion: "",
          resultado_evaluacion: "SIN EVALUACIÓN",
        })),
      );
    } else {
      setParticipantes((prev) =>
        prev.map((p) => ({
          ...p,
          resultado_evaluacion: p.evaluacion === "" ? "" : resultadoEvaluacion(p.evaluacion),
        })),
      );
    }
  }, [tieneEvaluacion]);

  async function addRow(e) {
    e.preventDefault();

    if (loadingProfile) return alert("Cargando perfil...");

    let activeUserId = userId;
    if (supabase) {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error(authError);
        return alert(`No se pudo validar la sesión: ${authError.message || authError}`);
      }
      activeUserId = authData?.user?.id || userId;
      if (!activeUserId) return alert("No hay sesión. Cerrá sesión y volvé a entrar.");
    }

    // En Campus UCI permitimos guardar aunque el perfil no tenga servicio_id todavía.
    // Si existe servicio_id, se guarda; si no, queda null.

    if (!fecha) return alert("Falta la fecha");
    if (!tema.trim()) return alert("Falta el tema");
    if (!fechaSolicitada) return alert("Falta la fecha solicitada");
    if (!quienSolicito.trim()) return alert("Falta quién solicitó");

    if (impartida === "SI") {
      if (!personalImpartio.trim()) return alert("Falta el personal que realizó la evaluación");
      if (!cargo.trim()) return alert("Falta el cargo");
      if (!horas || Number(horas) <= 0) return alert("Faltan las horas");
    }

    const participantesLimpios = participantes
      .map((p) => ({
        nombre: (p.nombre || "").trim(),
        cargo: (p.cargo || "").trim(),
        evaluacion: p.evaluacion === "" || p.evaluacion === null ? null : Number(p.evaluacion),
        resultado_evaluacion:
          tieneEvaluacion === "SI"
            ? (p.evaluacion === "" || p.evaluacion === null ? "" : resultadoEvaluacion(p.evaluacion))
            : "SIN EVALUACIÓN",
        observaciones: (p.observaciones || "").trim(),
      }))
      .filter((p) => p.nombre || p.cargo || p.observaciones || p.evaluacion !== null);

    if (participantesLimpios.length === 0) return alert("Agregá por lo menos un participante.");

    for (const p of participantesLimpios) {
      if (!p.nombre) return alert("Todos los participantes deben llevar nombre.");
      if (tieneEvaluacion === "SI" && p.evaluacion !== null) {
        if (!Number.isFinite(p.evaluacion) || p.evaluacion < 0 || p.evaluacion > 10) {
          return alert("La evaluación de cada participante debe estar entre 0 y 10.");
        }
      }
    }

    const unidadFinal = unidad || "UCI GENERAL";
    const servicioIdFinal = resolveServiceIdFromUnidad(unidadFinal) || effectiveProfile?.servicio_id || null;

    if (supabase && !unidadFinal) {
      return alert("No se pudo determinar la unidad del usuario.");
    }
    // servicio_id es opcional en Campus UCI.

    const payload = {
      fecha,
      unidad: unidadFinal,
      tema: tema.trim(),
      fecha_solicitada: fechaSolicitada,
      quien_solicito: quienSolicito.trim(),
      impartida,
      personal_impartio: impartida === "SI" ? personalImpartio.trim() : null,
      cargo: impartida === "SI" ? cargo.trim() : null,
      horas: impartida === "SI" ? Number(horas || 0) : 0,
      personal_recibio: personalRecibio.trim() || null,
      tiene_evaluacion: tieneEvaluacion === "SI",
      cantidad_participantes: participantesLimpios.length,
      observaciones: observaciones.trim() || null,
      ...(supabase
        ? {
            created_by: activeUserId,
            servicio_id: servicioIdFinal,
            area_id: areaIdPerfil || null,
            especialidad_id: especialidad?.id || null,
            recurso_id: recurso?.profile_id || null,
          }
        : {}),
    };

    try {
      setLoading(true);

      if (!supabase) {
        const fake = {
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          ...payload,
          participantes: participantesLimpios.map((p, idx) => ({
            id: crypto.randomUUID(),
            capacitacion_id: null,
            orden: idx + 1,
            ...p,
          })),
        };
        setRows((prev) => [fake, ...prev]);
        resetForm();
        return;
      }

      const { data, error } = await supabase
        .from("especialidad_capacitaciones")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;

      const detalles = participantesLimpios.map((p, idx) => ({
        capacitacion_id: data.id,
        orden: idx + 1,
        nombre: p.nombre,
        cargo: p.cargo || null,
        evaluacion: tieneEvaluacion === "SI" ? p.evaluacion : null,
        resultado_evaluacion:
          tieneEvaluacion === "SI" ? (p.resultado_evaluacion || null) : "SIN EVALUACIÓN",
        observaciones: p.observaciones || null,
      }));

      const { data: detData, error: detError } = await supabase
        .from("especialidad_capacitaciones_participantes")
        .insert(detalles)
        .select("*");

      if (detError) throw detError;

      const inserted = {
        ...data,
        participantes: normalizarParticipantes(detData || [], data.tiene_evaluacion ?? true),
      };

      setRows((prev) => [inserted, ...prev]);
      resetForm();
    } catch (e2) {
      console.error(e2);
      alert(`Error guardando: ${e2.message || e2}`);
    } finally {
      setLoading(false);
    }
  }

  async function deleteRow(rowId) {
    const r = rows.find((x) => x.id === rowId);
    const temaTxt = r?.tema ? ` (${r.tema})` : "";
    const c1 = window.confirm(`¿Seguro que quieres borrar este registro${temaTxt}?`);
    if (!c1) return;
    const c2 = window.confirm("Confirmación FINAL: esto no se puede deshacer. ¿Borrar?");
    if (!c2) return;

    try {
      setLoading(true);
      if (selectedId === rowId) setSelectedId(null);

      if (!supabase) {
        setRows((prev) => prev.filter((x) => x.id !== rowId));
        return;
      }

      const { error } = await supabase
        .from("especialidad_capacitaciones")
        .delete()
        .eq("id", rowId);

      if (error) throw error;
      setRows((prev) => prev.filter((x) => x.id !== rowId));
    } catch (e) {
      console.error(e);
      alert(`No se pudo borrar. Error: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  async function clearAll() {
    if (!isJefe) {
      alert("Solo el jefe puede limpiar todos los registros.");
      return;
    }

    const c1 = window.confirm("¿Seguro que quieres BORRAR TODO?");
    if (!c1) return;
    const c2 = window.confirm("Confirmación FINAL: esto no se puede deshacer. ¿Borrar TODO?");
    if (!c2) return;

    try {
      setLoading(true);
      setSelectedId(null);

      if (!supabase) {
        setRows([]);
        return;
      }

      const ids = rows.map((r) => r.id).filter(Boolean);
      if (ids.length === 0) {
        setRows([]);
        return;
      }

      const { error } = await supabase
        .from("especialidad_capacitaciones")
        .delete()
        .in("id", ids);

      if (error) throw error;
      await loadData();
    } catch (e) {
      console.error(e);
      alert(`No se pudo borrar (RLS/seguridad). Error: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  const dashboardRef = useRef(null);
  const impartidaWrapRef = useRef(null);
  const resultadosWrapRef = useRef(null);
  const temasWrapRef = useRef(null);

  async function exportPDF() {
    try {
      if (!dashboardRef.current) return;
      setLoading(true);

      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const imgRatio = imgProps.width / imgProps.height;
      const margin = 8;
      const usableW = pageWidth - margin * 2;
      let imgW = usableW;
      let imgH = imgW / imgRatio;

      if (imgH > pageHeight - margin * 2) {
        imgH = pageHeight - margin * 2;
        imgW = imgH * imgRatio;
      }

      pdf.addImage(imgData, "PNG", margin, margin, imgW, imgH);
      pdf.save(`Evaluaciones_Clinicas_${fecha}.pdf`);
    } catch (e) {
      console.error(e);
      alert(`Error exportando PDF: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  async function exportExcel() {
    try {
      setLoading(true);

      const impartidaCanvas = await html2canvas(impartidaWrapRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const resultadosCanvas = await html2canvas(resultadosWrapRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const temasCanvas = await html2canvas(temasWrapRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });

      const wb = new ExcelJS.Workbook();
      wb.creator = "Campus UCI";
      wb.created = new Date();

      const ws = wb.addWorksheet("Registros");
      ws.mergeCells("A1:Q1");
      ws.getCell("A1").value = "Evaluaciones Clínicas de Especialidad";
      ws.getCell("A1").font = { bold: true, size: 14 };
      ws.getCell("A1").alignment = { vertical: "middle", horizontal: "center" };
      ws.getRow(1).height = 22;

      ws.addRow([]);
      ws.addRow(["Fecha exportación:", fecha]);
      ws.addRow([
        "Total",
        stats.total,
        "Impartidas SI",
        stats.impartidasSi,
        "Impartidas NO",
        stats.impartidasNo,
      ]);
      ws.addRow([
        "% cumplimiento",
        stats.cumplimiento / 100,
        "Promedio evaluación",
        stats.promedioEvaluacion,
        "Horas totales",
        stats.totalHoras,
      ]);
      ws.getCell("B5").numFmt = "0.0%";
      ws.getCell("D5").numFmt = "0.0";
      ws.getCell("F5").numFmt = "0.0";

      ws.addRow([]);
      const header = [
        "Fecha",
        "Unidad",
        "Tema",
        "Fecha solicitada",
        "Quién solicitó",
        "Impartida",
        "Tiene evaluación",
        "Personal que impartió",
        "Cargo",
        "Horas",
        "Personal que recibió",
        "Cantidad participantes",
        "Participante",
        "Cargo participante",
        "Evaluación",
        "Resultado",
        "Observaciones",
      ];
      ws.addRow(header);

      const headerRow = ws.getRow(ws.lastRow.number);
      headerRow.font = { bold: true };
      headerRow.eachCell((c) => {
        c.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE5E7EB" },
        };
        c.border = {
          top: { style: "thin", color: { argb: "FFD1D5DB" } },
          left: { style: "thin", color: { argb: "FFD1D5DB" } },
          bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
          right: { style: "thin", color: { argb: "FFD1D5DB" } },
        };
      });

      rows
        .slice()
        .reverse()
        .forEach((r) => {
          const parts = r.participantes?.length ? r.participantes : [PARTICIPANTE_VACIO];
          parts.forEach((p, idx) => {
            ws.addRow([
              idx === 0 ? r.fecha : "",
              idx === 0 ? r.unidad : "",
              idx === 0 ? r.tema : "",
              idx === 0 ? r.fecha_solicitada : "",
              idx === 0 ? r.quien_solicito : "",
              idx === 0 ? r.impartida : "",
              idx === 0 ? (r.tiene_evaluacion ? "SI" : "NO") : "",
              idx === 0 ? (r.personal_impartio ?? "") : "",
              idx === 0 ? (r.cargo ?? "") : "",
              idx === 0 ? (r.horas ?? 0) : "",
              idx === 0 ? (r.personal_recibio ?? "") : "",
              idx === 0 ? (r.cantidad_participantes ?? parts.length) : "",
              p.nombre ?? "",
              p.cargo ?? "",
              p.evaluacion ?? "",
              p.resultado_evaluacion ?? "",
              idx === 0 ? (r.observaciones ?? "") : (p.observaciones ?? ""),
            ]);
          });
        });

      ws.columns = [
        { width: 12 }, { width: 16 }, { width: 24 }, { width: 14 }, { width: 22 },
        { width: 12 }, { width: 14 }, { width: 24 }, { width: 18 }, { width: 10 },
        { width: 24 }, { width: 12 }, { width: 24 }, { width: 18 }, { width: 12 },
        { width: 14 }, { width: 28 },
      ];

      const ws2 = wb.addWorksheet("Gráficas");
      ws2.getCell("A1").value = "Resumen gráfico";
      ws2.getCell("A1").font = { bold: true, size: 14 };

      const impartidaImg = wb.addImage({
        base64: impartidaCanvas.toDataURL("image/png"),
        extension: "png",
      });
      const resultadosImg = wb.addImage({
        base64: resultadosCanvas.toDataURL("image/png"),
        extension: "png",
      });
      const temasImg = wb.addImage({
        base64: temasCanvas.toDataURL("image/png"),
        extension: "png",
      });

      ws2.addImage(impartidaImg, {
        tl: { col: 0, row: 2 },
        ext: { width: 420, height: 280 },
      });
      ws2.addImage(resultadosImg, {
        tl: { col: 7, row: 2 },
        ext: { width: 420, height: 280 },
      });
      ws2.addImage(temasImg, {
        tl: { col: 0, row: 18 },
        ext: { width: 760, height: 320 },
      });

      const buf = await wb.xlsx.writeBuffer();
      saveAs(
        new Blob([buf], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `CampusUCI_Evaluaciones_Clinicas_${fecha}.xlsx`,
      );
    } catch (e) {
      console.error(e);
      alert(`Error exportando Excel: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  const outerStyle = embedded
    ? { background: "transparent" }
    : { background: "#f6f8fc", minHeight: "100vh", padding: 18 };

  const innerStyle = embedded
    ? { width: "100%", margin: 0, padding: 0 }
    : { width: "100%", maxWidth: 1320, margin: "0 auto", padding: 0 };

  const stackGrid = isSmall ? "1fr" : "minmax(380px, 430px) minmax(0, 1fr)";

  return (
    <div style={outerStyle}>
      <div style={innerStyle}>
        {!embedded && (
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                fontSize: 44,
                fontWeight: 900,
                color: "#223b78",
                lineHeight: 1.03,
                letterSpacing: -0.8,
              }}
            >
              Campus UCI
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 24,
                fontWeight: 900,
                color: "#3b82f6",
                letterSpacing: 0.8,
              }}
            >
              EVALUACIONES CLÍNICAS
            </div>
          </div>
        )}

        <div
          style={{
            borderRadius: 22,
            background: "white",
            border: "1px solid #dbeafe",
            boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
            padding: 16,
          }}
          ref={dashboardRef}
        >

          <div
            style={{
              border: "1px solid #bfdbfe",
              background: "#eff6ff",
              borderRadius: 18,
              padding: 14,
              marginBottom: 14,
              color: "#1e3a8a",
              fontWeight: 800,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 900 }}>
              {especialidad?.nombre || "Especialidad UCI"}
            </div>
            <div style={{ marginTop: 4, fontSize: 13 }}>
              {recurso?.nombre
                ? `Expediente de ${recurso.nombre} · ${recurso?.cum || "Sin CUM"}`
                : "Módulo PRO de evaluaciones clínicas por especialidad"}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 14,
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 13, color: "#111827" }}>
              {loadingProfile ? (
                <span style={{ color: "#6b7280" }}>Cargando perfil...</span>
              ) : effectiveProfile?.rol ? (
                <>
                  <strong>Rol:</strong> {effectiveProfile.rol}
                  {effectiveProfile?.servicio_id ? (
                    <span style={{ color: "#6b7280" }}>
                      {" "}
                      | servicio_id: {String(effectiveProfile.servicio_id).slice(0, 8)}…
                    </span>
                  ) : null}
                </>
              ) : (
                <span style={{ color: "#6b7280" }}>—</span>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {onBack ? (
                <button type="button" onClick={onBack} disabled={loading} style={btnBlueOutline}>
                  ⬅ Volver
                </button>
              ) : null}
              <button onClick={loadData} disabled={loading || loadingProfile} style={btnBlueOutline}>
                Recargar
              </button>
              <button onClick={exportPDF} disabled={loading} style={btnBlueOutline}>
                Exportar PDF
              </button>
              <button onClick={exportExcel} disabled={loading} style={btnBlueOutline}>
                Exportar Excel
              </button>
              {isJefe && (
                <button onClick={clearAll} disabled={loading} style={btnDanger}>
                  Limpiar todo
                </button>
              )}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: stackGrid,
              gap: 16,
              marginBottom: 16,
              alignItems: "stretch",
            }}
          >
            <Card title="Registro único (Guarda todo)">
              <form onSubmit={addRow} style={{ display: "grid", gap: 12 }}>
                <div style={formGrid2}>
                  <label style={fieldWrap}>
                    <span style={miniLabel}>Fecha</span>
                    <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} style={inputStyle} />
                  </label>

                  <label style={fieldWrap}>
                    <span style={miniLabel}>Unidad</span>
                    <select
                      value={unidad}
                      onChange={(e) => setUnidad(e.target.value)}
                      style={{ ...inputStyle, opacity: 1 }}
                      disabled={false}
                      title="Seleccionar unidad"
                    >
                      {unitOptions.map((item) => (
                        <option key={item.id || item.nombre} value={item.nombre}>{item.nombre}</option>
                      ))}
                    </select>
                    <div style={{ color: "#6b7280", fontSize: 11, marginTop: 4 }}>
                      Unidad libre para Campus UCI: podés seleccionar UCI General, Trauma, Quirúrgica, Intermedios, ECMO o Hemodiálisis.
                    </div>
                  </label>
                </div>

                <label style={fieldWrap}>
                  <span style={miniLabel}>Tema</span>
                  <input
                    value={tema}
                    onChange={(e) => setTema(e.target.value)}
                    placeholder="Ej: Lavado de manos"
                    style={inputStyle}
                  />
                </label>

                <div style={formGrid2}>
                  <label style={fieldWrap}>
                    <span style={miniLabel}>Fecha solicitada</span>
                    <input type="date" value={fechaSolicitada} onChange={(e) => setFechaSolicitada(e.target.value)} style={inputStyle} />
                  </label>

                  <label style={fieldWrap}>
                    <span style={miniLabel}>Quién solicitó</span>
                    <input
                      value={quienSolicito}
                      onChange={(e) => setQuienSolicito(e.target.value)}
                      placeholder="Nombre del solicitante"
                      style={inputStyle}
                    />
                  </label>
                </div>

                <label style={fieldWrap}>
                  <span style={miniLabel}>Evaluación realizada</span>
                  <div style={toggleGrid}>
                    {IMPARTIDA_OPCIONES.map((op) => {
                      const active = impartida === op;
                      return (
                        <button
                          key={op}
                          type="button"
                          onClick={() => setImpartida(op)}
                          style={{ ...pillStyle, ...(active ? (op === "SI" ? pillYes : pillNo) : {}) }}
                        >
                          {op}
                        </button>
                      );
                    })}
                  </div>
                </label>

                <label style={fieldWrap}>
                  <span style={miniLabel}>Personal que realizó evaluación</span>
                  <input
                    value={personalImpartio}
                    onChange={(e) => setPersonalImpartio(e.target.value)}
                    placeholder="Nombre de quien evaluó"
                    style={inputStyle}
                    disabled={impartida !== "SI"}
                  />
                </label>

                <div style={formGrid2}>
                  <label style={fieldWrap}>
                    <span style={miniLabel}>Cargo</span>
                    <select
                      value={cargo}
                      onChange={(e) => setCargo(e.target.value)}
                      style={inputStyle}
                      disabled={impartida !== "SI"}
                    >
                      <option value="">Seleccionar cargo</option>
                      {CARGOS_PARTICIPANTE.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </label>

                  <label style={fieldWrap}>
                    <span style={miniLabel}>Horas</span>
                    <input
                      value={horas}
                      onChange={(e) => setHoras(e.target.value.replace(/[^\d.]/g, ""))}
                      placeholder="Ej: 2"
                      style={inputStyle}
                      inputMode="decimal"
                      disabled={impartida !== "SI"}
                    />
                  </label>
                </div>

                <label style={fieldWrap}>
                  <span style={miniLabel}>¿El tema tiene evaluación?</span>
                  <div style={toggleGrid}>
                    {["SI", "NO"].map((op) => {
                      const active = tieneEvaluacion === op;
                      return (
                        <button
                          key={op}
                          type="button"
                          onClick={() => setTieneEvaluacion(op)}
                          style={{ ...pillStyle, ...(active ? (op === "SI" ? pillYes : pillNo) : {}) }}
                        >
                          {op}
                        </button>
                      );
                    })}
                  </div>
                </label>

                <label style={fieldWrap}>
                  <span style={miniLabel}>Personal que recibió la capacitación</span>
                  <textarea
                    value={personalRecibio}
                    onChange={(e) => setPersonalRecibio(e.target.value)}
                    placeholder="Podés poner cantidad, grupo o nota general"
                    style={{ ...inputStyle, minHeight: 78, resize: "vertical" }}
                  />
                </label>

                <div style={participantShell}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ ...miniLabel, fontWeight: 900, color: "#223b78" }}>
                      Evaluados / Calificaciones
                    </div>
                    <button type="button" onClick={addParticipante} style={btnBlueOutline}>
                      + Agregar evaluado
                    </button>
                  </div>

                  <div style={{ display: "grid", gap: 10, maxHeight: 320, overflowY: "auto", paddingRight: 2 }}>
                    {currentParticipantes.map((p, idx) => (
                      <div key={idx} style={participantCard}>
                        <div style={participantTopGrid}>
                          <label style={fieldWrap}>
                            <span style={miniLabel}>Nombre #{idx + 1}</span>
                            <input
                              value={p.nombre}
                              onChange={(e) => updateParticipante(idx, "nombre", e.target.value)}
                              placeholder="Nombre del evaluado"
                              style={inputStyle}
                            />
                          </label>

                          <label style={fieldWrap}>
                            <span style={miniLabel}>Cargo</span>
                            <select
                              value={p.cargo}
                              onChange={(e) => updateParticipante(idx, "cargo", e.target.value)}
                              style={inputStyle}
                            >
                              <option value="">Seleccionar cargo</option>
                              {CARGOS_PARTICIPANTE.map((cargoItem) => (
                                <option key={cargoItem} value={cargoItem}>{cargoItem}</option>
                              ))}
                            </select>
                          </label>

                          <div style={{ display: "grid", alignItems: "end" }}>
                            <button
                              type="button"
                              onClick={() => removeParticipante(idx)}
                              style={{ ...btnDelete, width: "100%" }}
                              disabled={currentParticipantes.length === 1}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        <div style={formGrid2}>
                          <label style={fieldWrap}>
                            <span style={miniLabel}>Evaluación (0 a 10)</span>
                            <input
                              value={p.evaluacion}
                              onChange={(e) => updateParticipante(idx, "evaluacion", e.target.value.replace(/[^\d.]/g, ""))}
                              placeholder={tieneEvaluacion === "SI" ? "Ej: 8" : "No aplica"}
                              style={{ ...inputStyle, background: tieneEvaluacion === "SI" ? "white" : "#f8fafc" }}
                              inputMode="decimal"
                              disabled={tieneEvaluacion !== "SI"}
                            />
                          </label>

                          <div
                            style={{
                              border: `1px solid ${
                                p.resultado_evaluacion === "APROBADO"
                                  ? "#2563eb"
                                  : p.resultado_evaluacion === "REPROBADO"
                                  ? "#f97316"
                                  : "#e5e7eb"
                              }`,
                              borderRadius: 14,
                              padding: 12,
                              background:
                                p.resultado_evaluacion === "APROBADO"
                                  ? "#dbeafe"
                                  : p.resultado_evaluacion === "REPROBADO"
                                  ? "#ffedd5"
                                  : "#fff",
                              minHeight: 74,
                              display: "grid",
                              alignContent: "center",
                            }}
                          >
                            <div style={miniLabel}>Resultado</div>
                            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4 }}>
                              {tieneEvaluacion === "SI"
                                ? (p.resultado_evaluacion || "Sin evaluación")
                                : "SIN EVALUACIÓN"}
                            </div>
                          </div>
                        </div>

                        <label style={fieldWrap}>
                          <span style={miniLabel}>Observaciones del evaluado</span>
                          <input
                            value={p.observaciones}
                            onChange={(e) => updateParticipante(idx, "observaciones", e.target.value)}
                            placeholder="Observaciones"
                            style={inputStyle}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <label style={fieldWrap}>
                  <span style={miniLabel}>Observaciones generales</span>
                  <textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Observaciones generales"
                    style={{ ...inputStyle, minHeight: 78, resize: "vertical" }}
                  />
                </label>

                <div style={{ display: "grid", gap: 10 }}>
                  <button disabled={loading} type="submit" style={btnBlack}>
                    {loading ? "Guardando..." : "Guardar evaluación"}
                  </button>

                  <button type="button" onClick={resetForm} disabled={loading} style={btnBlueOutline}>
                    Nueva evaluación
                  </button>
                </div>
              </form>
            </Card>

            <Card
              title="Evaluaciones (clic para ver resultados anteriores)"
              style={{ display: "flex", flexDirection: "column" }}
              bodyStyle={{ display: "flex", flexDirection: "column", minHeight: 680 }}
            >
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowSearch((prev) => !prev)}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 18,
                    lineHeight: 1,
                    padding: 4,
                  }}
                  title="Buscar"
                >
                  🔍
                </button>

                {showSearch && (
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar..."
                    style={{
                      marginLeft: 8,
                      padding: "6px 10px",
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      outline: "none",
                      width: 190,
                    }}
                  />
                )}
              </div>

              <div style={{ overflowX: "auto", overflowY: "auto", flex: 1, minWidth: 0 }}>
                <table
                  style={{
                    width: "100%",
                    tableLayout: "fixed",
                    borderCollapse: "separate",
                    borderSpacing: 0,
                  }}
                >
                  <colgroup>
                    <col style={{ width: 95 }} />
                    <col style={{ width: 110 }} />
                    <col style={{ width: 190 }} />
                    <col style={{ width: 120 }} />
                    <col style={{ width: 110 }} />
                    <col style={{ width: 110 }} />
                    <col style={{ width: 110 }} />
                    <col style={{ width: 95 }} />
                    <col style={{ width: 180 }} />
                  </colgroup>

                  <thead>
                    <tr>
                      {[
                        "Fecha",
                        "Unidad",
                        "Tema",
                        "Solicitó",
                        "Impartida",
                        "Evaluación",
                        "Participantes",
                        "Horas",
                        "Acción",
                      ].map((h) => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: 14, color: "#6b7280" }}>
                          No hay evaluaciones todavía.
                        </td>
                      </tr>
                    ) : (
                      rows
                        .filter((r) =>
                          `${r.fecha || ""} ${r.unidad || ""} ${r.tema || ""} ${r.quien_solicito || ""}`
                            .toLowerCase()
                            .includes(search.toLowerCase())
                        )
                        .map((r) => (
                        <tr key={r.id} style={{ background: selectedId === r.id ? "#f8fbff" : "transparent" }}>
                          <td style={tdStyle} title={r.fecha}>{r.fecha}</td>
                          <td style={tdStyle} title={r.unidad}>{r.unidad}</td>
                          <td style={tdStyle} title={r.tema}>{r.tema}</td>
                          <td style={tdStyle} title={r.quien_solicito}>{r.quien_solicito}</td>
                          <td style={tdStyle}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "4px 10px",
                                borderRadius: 999,
                                fontWeight: 900,
                                fontSize: 12,
                                ...badgeStyle(r.impartida === "SI"),
                              }}
                            >
                              {r.impartida}
                            </span>
                          </td>
                          <td style={tdStyle}>{r.tiene_evaluacion ? "SI" : "NO"}</td>
                          <td style={tdStyle}>{r.cantidad_participantes ?? 0}</td>
                          <td style={tdStyle}>{Number(r.horas || 0)}</td>
                          <td style={tdStyle}>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button type="button" onClick={() => setSelectedId(r.id)} disabled={loading} style={btnBlueOutline}>
                                Ver
                              </button>
                              <button type="button" onClick={() => deleteRow(r.id)} disabled={loading} style={btnDelete}>
                                🗑️ Borrar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div style={dashboardGrid}>
            <Card title={selectedId ? "Detalle de la evaluación seleccionada" : "Vista previa de la evaluación actual"}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={miniBox}>
                  <div style={miniLabel}>Tema</div>
                  <div style={detailValue}>{view.tema || "—"}</div>
                </div>

                <div style={formGrid2}>
                  <div style={miniBox}>
                    <div style={miniLabel}>Fecha</div>
                    <div style={detailValue}>{view.fecha || "—"}</div>
                  </div>
                  <div style={miniBox}>
                    <div style={miniLabel}>Fecha solicitada</div>
                    <div style={detailValue}>{view.fecha_solicitada || "—"}</div>
                  </div>
                </div>

                <div style={miniBox}>
                  <div style={miniLabel}>Quién solicitó</div>
                  <div style={detailValue}>{view.quien_solicito || "—"}</div>
                </div>

                <div style={grid3}>
                  <div style={miniBox}>
                    <div style={miniLabel}>Impartida</div>
                    <div style={detailValue}>{view.impartida || "—"}</div>
                  </div>
                  <div style={miniBox}>
                    <div style={miniLabel}>Horas</div>
                    <div style={detailValue}>{Number(view.horas || 0)}</div>
                  </div>
                  <div style={miniBox}>
                    <div style={miniLabel}>Unidad</div>
                    <div style={detailValue}>{view.unidad || "—"}</div>
                  </div>
                </div>

                <div style={miniBox}>
                  <div style={miniLabel}>Personal que impartió / Cargo</div>
                  <div style={detailValue}>
                    {view.personal_impartio || "—"}
                    {view.cargo ? ` — ${view.cargo}` : ""}
                  </div>
                </div>

                <div style={miniBox}>
                  <div style={miniLabel}>Personal que recibió</div>
                  <div style={detailValue}>{view.personal_recibio || "—"}</div>
                </div>

                <div style={formGrid2}>
                  <div style={miniBox}>
                    <div style={miniLabel}>Tema con evaluación</div>
                    <div style={detailValue}>{view.tiene_evaluacion ? "SI" : "NO"}</div>
                  </div>

                  <div style={miniBox}>
                    <div style={miniLabel}>Participantes</div>
                    <div style={detailValue}>{view.cantidad_participantes ?? detalleSeleccionado.length}</div>
                  </div>
                </div>

                <div style={miniBox}>
                  <div style={miniLabel}>Observaciones generales</div>
                  <div style={detailValue}>{view.observaciones || "—"}</div>
                </div>

                <div style={{ maxHeight: 280, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 14 }}>
                  <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                    <thead>
                      <tr>
                        {["Nombre", "Cargo", "Nota", "Resultado"].map((h) => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detalleSeleccionado.length === 0 ? (
                        <tr>
                          <td colSpan={4} style={{ padding: 12, color: "#6b7280" }}>Sin participantes.</td>
                        </tr>
                      ) : (
                        detalleSeleccionado.map((p, idx) => (
                          <tr key={idx}>
                            <td style={tdStyle} title={p.nombre}>{p.nombre || "—"}</td>
                            <td style={tdStyle} title={p.cargo}>{p.cargo || "—"}</td>
                            <td style={tdStyle}>{view.tiene_evaluacion ? (p.evaluacion ?? "—") : "—"}</td>
                            <td style={tdStyle}>{view.tiene_evaluacion ? (p.resultado_evaluacion || "—") : "SIN EVALUACIÓN"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {selectedId ? (
                  <button type="button" onClick={() => setSelectedId(null)} style={btnBlueOutline}>
                    Volver a la evaluación actual
                  </button>
                ) : null}
              </div>
            </Card>

            <Card title="Resumen general">
              <div style={statsGrid}>
                <div style={miniBox}>
                  <div style={miniLabel}>Total evaluaciones</div>
                  <div style={miniValue}>{stats.total}</div>
                </div>
                <div style={miniBox}>
                  <div style={miniLabel}>Horas acumuladas</div>
                  <div style={miniValue}>{stats.totalHoras}</div>
                </div>
                <div style={miniBox}>
                  <div style={miniLabel}>Impartidas SI</div>
                  <div style={{ ...miniValue, color: "#16a34a" }}>{stats.impartidasSi}</div>
                </div>
                <div style={miniBox}>
                  <div style={miniLabel}>Impartidas NO</div>
                  <div style={{ ...miniValue, color: "#dc2626" }}>{stats.impartidasNo}</div>
                </div>
                <div style={miniBox}>
                  <div style={miniLabel}>Con evaluación</div>
                  <div style={{ ...miniValue, color: "#2563eb" }}>{stats.conEvaluacion}</div>
                </div>
                <div style={miniBox}>
                  <div style={miniLabel}>Sin evaluación</div>
                  <div style={{ ...miniValue, color: "#64748b" }}>{stats.sinEvaluacion}</div>
                </div>
                <div style={miniBox}>
                  <div style={miniLabel}>Participantes</div>
                  <div style={miniValue}>{stats.totalParticipantes}</div>
                </div>
                <div style={miniBox}>
                  <div style={miniLabel}>Promedio evaluación</div>
                  <div style={miniValue}>{stats.promedioEvaluacion.toFixed(1)}</div>
                </div>
                <div style={miniBox}>
                  <div style={miniLabel}>Aprobados</div>
                  <div style={{ ...miniValue, color: "#2563eb" }}>{stats.aprobados}</div>
                </div>
                <div style={miniBox}>
                  <div style={miniLabel}>Reprobados</div>
                  <div style={{ ...miniValue, color: "#f97316" }}>{stats.reprobados}</div>
                </div>
                <div
                  style={{
                    border: `1px solid ${stats.sem.color}`,
                    borderRadius: 14,
                    padding: 12,
                    background: stats.sem.bg,
                    gridColumn: "1 / -1",
                  }}
                >
                  <div style={miniLabel}>% evaluaciones realizadas</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: stats.sem.color }}>
                    {pct(stats.cumplimiento)}
                  </div>
                  <div style={{ marginTop: 4, fontWeight: 800, color: stats.sem.color }}>
                    Semáforo: {stats.sem.label}
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Notas del panel">
              <div style={{ display: "grid", gap: 10, fontSize: 14, color: "#0f172a" }}>
                <div style={noteBox}>
                  <strong>% evaluaciones realizadas:</strong> mide cuántos registros terminaron en “SI”.
                </div>
                <div style={noteBox}>
                  <strong>Promedio evaluación:</strong> ahora toma las notas de todos los participantes evaluados.
                </div>
                <div style={noteBox}>
                  <strong>Aprobado/Reprobado:</strong> sigue la lógica del Excel base: 0–6 = reprobado, 7–10 = aprobado.
                </div>
                <div style={noteBox}>
                  <strong>Sin evaluación:</strong> si el tema no lleva evaluación, las notas se desactivan y los participantes quedan como “SIN EVALUACIÓN”.
                </div>
              </div>
            </Card>
          </div>

          <div style={chartGrid}>
            <Card title="Evaluaciones realizadas">
              <div ref={impartidaWrapRef} style={chartBox}>
                <Doughnut data={donutImpartidaData} options={donutOptions} />
              </div>
            </Card>

            <Card title="Resultados de evaluación">
              <div ref={resultadosWrapRef} style={chartBox}>
                <Doughnut data={donutResultadosData} options={donutOptions} />
              </div>
            </Card>

            <Card title="Evaluaciones por servicio">
              <div style={chartBox}>
                <Bar data={unidadBarData} options={unidadBarOptions} />
              </div>
            </Card>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
            <Card title="Evaluaciones más registradas">
              <div ref={temasWrapRef} style={{ height: 320 }}>
                <Bar data={temaBarData} options={temaBarOptions} />
              </div>
            </Card>
          </div>
        </div>

        {!embedded && (
          <div style={{ marginTop: 14, color: "#64748b", fontSize: 12 }}>
            Creada con amor, no es perfecta pero espero les sirva (Att: Jonathan Villalobos)
          </div>
        )}
      </div>
    </div>
  );
}

const fieldWrap = { display: "grid", gap: 6, minWidth: 0 };
const formGrid2 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 12,
};
const grid3 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 10,
};
const dashboardGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
  marginBottom: 16,
};
const chartGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
  marginBottom: 16,
};
const statsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 10,
};
const toggleGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};
const participantShell = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 12,
  background: "#f8fbff",
};
const participantCard = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 12,
  background: "#fff",
};
const participantTopGrid = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) 88px",
  gap: 10,
  alignItems: "end",
};
const chartBox = { height: 270 };

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 12px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  outline: "none",
  background: "white",
  minWidth: 0,
};

const pillStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "white",
  cursor: "pointer",
  fontWeight: 900,
};

const pillYes = {
  background: "#eefbf2",
  borderColor: "#86efac",
  color: "#166534",
};

const pillNo = {
  background: "#fff1f2",
  borderColor: "#fda4af",
  color: "#9f1239",
};

const tdStyle = {
  padding: "11px 8px",
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "top",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  maxWidth: 1,
  fontSize: 13,
};

const thStyle = {
  textAlign: "left",
  fontSize: 12,
  color: "#6b7280",
  padding: "11px 8px",
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: 1,
  position: "sticky",
  top: 0,
  background: "white",
  zIndex: 2,
};

const btnBlueOutline = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "2px solid #00AEEF",
  background: "white",
  color: "#0077a3",
  cursor: "pointer",
  fontWeight: 900,
};

const btnDanger = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "2px solid #ef4444",
  background: "#ef4444",
  color: "white",
  cursor: "pointer",
  fontWeight: 900,
};

const btnBlack = {
  marginTop: 2,
  padding: "12px 12px",
  borderRadius: 12,
  border: "1px solid #111827",
  background: "#111827",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};

const btnDelete = {
  padding: "9px 10px",
  borderRadius: 10,
  border: "1px solid #ef4444",
  background: "#fee2e2",
  color: "#991b1b",
  cursor: "pointer",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const miniBox = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 11,
  background: "#fff",
};

const noteBox = {
  border: "1px solid #dbeafe",
  borderRadius: 12,
  padding: 11,
  background: "#f8fbff",
};

const miniLabel = { color: "#6b7280", fontSize: 12 };
const miniValue = { fontSize: 22, fontWeight: 800 };
const detailValue = { fontSize: 15, fontWeight: 700, color: "#0f172a", marginTop: 4 };
