import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import "./App.css";
import CapacitacionesEspecialidad from "./modules/especialidades/CapacitacionesEspecialidad";
import IndexCarpetaAcademica from "./CarpetaAcademica/IndexCarpetaAcademica";


function normalizeRole(value) {
  return String(value || "").trim().toLowerCase();
}

function isAdmin(profile) {
  return normalizeRole(profile?.rol) === "admin";
}

function Icon({ name, className = "" }) {
  const icons = {
    shield: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.2 19 6v5.2c0 4.35-2.88 8.34-7 9.6-4.12-1.26-7-5.25-7-9.6V6l7-2.8Z" />
        <path d="m9.4 12.1 1.7 1.7 3.8-4" />
      </svg>
    ),
    mail: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="5.5" width="17" height="13" rx="2.4" />
        <path d="m4.5 7 7.5 6 7.5-6" />
      </svg>
    ),
    lock: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5.5" y="10.5" width="13" height="9" rx="2" />
        <path d="M8.5 10.5V8.2a3.5 3.5 0 0 1 7 0v2.3" />
      </svg>
    ),
    eye: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    eyeOff: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m3 3 18 18" />
        <path d="M10.7 5.3A10.8 10.8 0 0 1 12 5c6 0 9.5 7 9.5 7a16 16 0 0 1-3.1 4.2" />
        <path d="M6.4 6.8A16.2 16.2 0 0 0 2.5 12S6 19 12 19c1.9 0 3.5-.6 4.8-1.4" />
        <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      </svg>
    ),
    cap: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m2.5 9.5 9.5-4 9.5 4-9.5 4-9.5-4Z" />
        <path d="M6.5 11.2v4.1c2.8 2.3 8.2 2.3 11 0v-4.1" />
        <path d="M21.5 9.5v5" />
      </svg>
    ),
    checklist: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="4.5" width="14" height="16" rx="2" />
        <path d="M9 4.5h6v3H9z" />
        <path d="m8.5 12 1.5 1.5 3-3" />
        <path d="M14.5 12.8h2" />
        <path d="M8.5 17h8" />
      </svg>
    ),
    chart: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.5 19.5h15" />
        <rect x="6" y="11" width="3" height="6" rx="1" />
        <rect x="11" y="7" width="3" height="10" rx="1" />
        <rect x="16" y="4.5" width="3" height="12.5" rx="1" />
      </svg>
    ),
    home: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m3.5 11 8.5-7 8.5 7" />
        <path d="M6 10.5v9h12v-9" />
        <path d="M9.5 19.5v-5h5v5" />
      </svg>
    ),
    userPlus: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="8" r="3.5" />
        <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
        <path d="M18 8v6" />
        <path d="M15 11h6" />
      </svg>
    ),
    logout: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H10" />
        <path d="M14 7l5 5-5 5" />
        <path d="M19 12H9" />
      </svg>
    ),
  };

  return <span className={`app-icon ${className}`}>{icons[name] || null}</span>;
}

function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg("Correo o contraseña incorrectos. Verificá tus datos e intentá de nuevo.");
        return;
      }

      onLoginSuccess?.(data?.session || null);
    } catch (error) {
      console.error("Error login:", error);
      setErrorMsg("Ocurrió un problema al iniciar sesión. Intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-photo-bg" />
      <div className="login-bg-overlay" />
      <div className="login-orb login-orb-right" />
      <div className="login-orb login-orb-left" />
      <div className="login-dots" />
      <div className="login-lines" />

      <main className="login-layout">
        <section className="login-left-panel">
          <img src="/logo-rnh.png" alt="Red Nacional de Hospitales" className="login-logo" />

          <div className="login-copy">
            <span className="pill">CAMPUS UCI</span>
            <h1>
              Especializaciones
              <br />
              <strong>Críticas</strong>
            </h1>
            <p>
              Plataforma institucional para el seguimiento de formación especializada,
              avances, evaluaciones y evidencias del personal de UCI.
            </p>
          </div>

          <div className="feature-grid">
            <div className="feature-item">
              <div className="feature-icon"><Icon name="cap" /></div>
              <span>Formación<br />Especializada</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><Icon name="checklist" /></div>
              <span>Evaluaciones<br />Continuas</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon"><Icon name="chart" /></div>
              <span>Avances<br />Individuales</span>
            </div>
          </div>
        </section>

        <section className="login-right-panel">
          <div className="login-card">
            <div className="shield-circle"><Icon name="shield" /></div>
            <div className="access-pill">ACCESO INSTITUCIONAL</div>
            <h2>Iniciar sesión</h2>
            <p>Ingresa con tu correo asignado</p>

            {errorMsg ? <div className="login-error">⚠️ {errorMsg}</div> : null}

            <form onSubmit={handleLogin} className="login-form">
              <label>Correo institucional</label>
              <div className="input-row">
                <div className="input-icon"><Icon name="mail" /></div>
                <input
                  type="email"
                  placeholder="uci@especialidades.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <label>Contraseña</label>
              <div className="input-row">
                <div className="input-icon"><Icon name="lock" /></div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Introduce tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="eye-button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  <Icon name={showPassword ? "eyeOff" : "eye"} />
                </button>
              </div>

              <div className="login-options">
                <label className="remember-option">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <span>Recordarme</span>
                </label>
                <button type="button" className="forgot-button">¿Olvidaste tu contraseña?</button>
              </div>

              <button className="login-submit" type="submit" disabled={loading}>
                {loading ? <span className="loading-dot">Entrando...</span> : "Entrar"}
              </button>
            </form>

            <div className="secure-footer">
              <span />
              <Icon name="lock" />
              <p>Acceso seguro y restringido</p>
              <span />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function ProgressPill({ value }) {
  const safeValue = Number.isFinite(Number(value)) ? Math.max(0, Math.min(100, Number(value))) : 0;
  return (
    <div className="cu-progress-wrap">
      <div className="cu-progress-track">
        <div className="cu-progress-bar" style={{ width: `${safeValue}%` }} />
      </div>
      <strong>{safeValue}%</strong>
    </div>
  );
}

function StatCard({ icon, label, value, tone }) {
  return (
    <article className="cu-stat-card">
      <div className={`cu-stat-icon ${tone || "blue"}`}>{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function Sidebar({ profile, onLogout }) {
  const roleLabel = profile?.rol || "Personal";
  return (
    <aside className="cu-sidebar">
      <div className="cu-brand">
        <div className="cu-brand-mark">UCI</div>
        <div>
          <h1>Campus UCI</h1>
          <p>Especializaciones críticas</p>
        </div>
      </div>

      <nav className="cu-nav">
        <button className="active"><Icon name="home" /> Inicio</button>
        <button><Icon name="cap" /> Especializaciones</button>
        <button><Icon name="checklist" /> Evaluaciones</button>
        <button><Icon name="chart" /> Evidencias</button>
        <button><span>◷</span> Historial</button>
        {isAdmin(profile) ? <button><span>⚙</span> Panel jefe</button> : null}
      </nav>

      <div className="cu-sidebar-card">
        <div className="cu-mini-avatar">👤</div>
        <div>
          <span>{profile?.cum || "Sin CUM"}</span>
          <strong>{roleLabel}</strong>
        </div>
        <button onClick={onLogout}><Icon name="logout" /> Cerrar sesión</button>
      </div>
    </aside>
  );
}


function ExpedientesEspecialidad({
  session,
  profile,
  especialidad,
  usuarios,
  loading,
  error,
  expedienteActivo,
  onOpenExpediente,
  onBack,
  onLogout,
}) {
  const displayName =
    profile?.nombre ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    "Usuario";

  const totalUsuarios = usuarios.length;
  const promedio =
    totalUsuarios > 0
      ? Math.round(
          usuarios.reduce((acc, item) => acc + (Number(item.progreso) || 0), 0) /
            totalUsuarios,
        )
      : 0;

  const completados = usuarios.filter((item) => Number(item.progreso) >= 100).length;

  return (
    <div className="cu-shell">
      <Sidebar profile={profile} onLogout={onLogout} />

      <main className="cu-main">
        <header className="cu-topbar">
          <div className="cu-title-block">
            <span className="cu-kicker">EXPEDIENTES DE ESPECIALIDAD</span>
            <h2>
              {especialidad?.nombre || "Especialidad"}
              <br />
              <span>Recursos en formación</span>
            </h2>
            <p>
              Lista de personal asignado a esta especialidad, avance individual y estado
              de formación.
            </p>
          </div>

          <div className="cu-profile-card">
            <div className="cu-avatar">👤</div>
            <div>
              <strong>{displayName}</strong>
              <span>{profile?.cum || "Sin CUM"} • Campus UCI</span>
            </div>
          </div>
        </header>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <button type="button" className="login-submit" style={{ width: "auto", padding: "12px 18px" }} onClick={onBack}>
            ← Volver a especialidades
          </button>
        </div>

        {error ? <div className="cu-alert">⚠️ {error}</div> : null}

        <section className="cu-stats-grid">
          <StatCard label="Recursos asignados" value={totalUsuarios} icon="👥" tone="blue" />
          <StatCard label="Progreso promedio" value={`${promedio}%`} icon="▤" tone="indigo" />
          <StatCard label="Completados" value={completados} icon="☑" tone="green" />
          <StatCard label="Pendientes" value={Math.max(totalUsuarios - completados, 0)} icon="◷" tone="purple" />
        </section>

        <section className="cu-panel cu-specialties-panel">
          <div className="cu-panel-header">
            <div>
              <h3>Expedientes de {especialidad?.nombre || "especialidad"}</h3>
              <p>Personal registrado actualmente en esta formación.</p>
            </div>
            <span className="cu-badge">UCI</span>
          </div>

          {loading ? (
            <div className="cu-empty">Cargando expedientes...</div>
          ) : usuarios.length === 0 ? (
            <div className="cu-empty">
              No hay recursos asignados a esta especialidad todavía.
            </div>
          ) : (
            <div className="cu-specialty-grid">
              {usuarios.map((item) => {
                const nombre = item.nombre || "Sin nombre";
                const correo = item.correo || "Sin correo";
                const cum = item.cum || "Sin CUM";
                const progreso = Number(item.progreso) || 0;

                return (
                  <article className="cu-specialty-card" key={item.id}>
                    <div className="cu-specialty-icon">👤</div>
                    <h4>{nombre}</h4>
                    <p style={{ marginBottom: 6, fontWeight: 900, color: "#1d4ed8" }}>🆔 {cum}</p>
                    <p>{correo}</p>
                    <ProgressPill value={progreso} />
                    <button type="button" onClick={() => onOpenExpediente?.(item)}>Abrir expediente</button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}




function FormShell({ session, profile, title, subtitle, children, onBack, onLogout }) {
  const displayName =
    profile?.nombre ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    "Usuario";

  return (
    <div className="cu-shell">
      <Sidebar profile={profile} onLogout={onLogout} />

      <main className="cu-main">
        <header className="cu-topbar">
          <div className="cu-title-block">
            <span className="cu-kicker">PANEL RÁPIDO</span>
            <h2>
              {title}
              <br />
              <span>{subtitle}</span>
            </h2>
            <p>Gestión funcional de recursos y especializaciones del Campus UCI.</p>
          </div>

          <div className="cu-profile-card">
            <div className="cu-avatar">👤</div>
            <div>
              <strong>{displayName}</strong>
              <span>{profile?.cum || "Sin CUM"} • Campus UCI</span>
            </div>
          </div>
        </header>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <button type="button" className="login-submit" style={{ width: "auto", padding: "12px 18px" }} onClick={onBack}>
            ← Volver al inicio
          </button>
        </div>

        {children}
      </main>
    </div>
  );
}

function RegistrarPersonal({ session, profile, especialidades = [], onBack, onLogout, onCreated }) {
  const [form, setForm] = useState({
    nombre: "",
    correo: "",
    rol: "personal",
    servicio: "UCI",
    area: "",
    cum: "",
    especialidadId: "",
    activo: true,
  });
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [generatingCum, setGeneratingCum] = useState(false);
  const [cumAuto, setCumAuto] = useState(true);

  function getCumPrefix(currentForm = form) {
    const selectedEspecialidad = especialidades.find((esp) => esp.id === currentForm.especialidadId);
    const nombreEspecialidad = String(selectedEspecialidad?.nombre || "").toLowerCase();
    const rol = normalizeRole(currentForm.rol);

    if (rol === "admin") return "ADM";
    if (rol === "docente") return "DOC";
    if (rol === "supervisor") return "SUP";
    if (nombreEspecialidad.includes("ecmo")) return "ECMO";
    if (nombreEspecialidad.includes("hemo")) return "HEMO";

    return "UCI";
  }

  async function generarSiguienteCum(prefix) {
    const { data, error } = await supabase
      .from("profiles")
      .select("cum")
      .ilike("cum", `${prefix}-%`);

    if (error) throw error;

    const maxNumber = (data || [])
      .map((item) => String(item.cum || ""))
      .filter((value) => value.startsWith(`${prefix}-`))
      .map((value) => Number(value.split("-").pop()))
      .filter((value) => Number.isFinite(value))
      .reduce((max, value) => Math.max(max, value), 0);

    return `${prefix}-${String(maxNumber + 1).padStart(3, "0")}`;
  }

  async function autogenerarCum(currentForm = form) {
    try {
      setGeneratingCum(true);
      const prefix = getCumPrefix(currentForm);
      const nuevoCum = await generarSiguienteCum(prefix);
      setForm((prev) => ({ ...prev, cum: nuevoCum }));
    } catch (error) {
      console.error("Error generando CUM:", error);
    } finally {
      setGeneratingCum(false);
    }
  }

  useEffect(() => {
    if (!cumAuto) return;
    autogenerarCum(form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.rol, form.especialidadId, especialidades.length, cumAuto]);

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function guardar(e) {
    e.preventDefault();
    setMensaje("");

    if (!form.nombre.trim() || !form.correo.trim()) {
      setMensaje("Completá nombre y correo.");
      return;
    }

    setSaving(true);

    try {
      const finalCum = form.cum.trim() || await generarSiguienteCum(getCumPrefix());

      const { data: insertedProfile, error } = await supabase
        .from("profiles")
        .insert({
          nombre: form.nombre.trim(),
          correo: form.correo.trim().toLowerCase(),
          rol: form.rol,
          servicio: form.servicio,
          area: form.area,
          cum: finalCum || null,
          activo: form.activo,
        })
        .select()
        .single();

      if (error) throw error;

      let asignado = false;

      if (form.especialidadId && insertedProfile?.user_id) {
        const { error: asignacionError } = await supabase
          .from("usuario_especialidad")
          .insert({
            user_id: insertedProfile.user_id,
            especialidad_id: form.especialidadId,
            progreso: 0,
            activo: true,
          });

        if (asignacionError) {
          console.error("Error asignando especialidad:", asignacionError);
        } else {
          asignado = true;
        }
      }

      setMensaje(
        asignado
          ? `✅ Personal registrado, CUM ${finalCum} generado y especialidad asignada.`
          : `✅ Personal registrado con CUM ${finalCum}. Para asignarlo a especialidad necesita usuario de acceso activo.`
      );
      setForm({
        nombre: "",
        correo: "",
        rol: "personal",
        servicio: "UCI",
        area: "",
        cum: "",
        especialidadId: "",
        activo: true,
      });
      setCumAuto(true);
      onCreated?.();
    } catch (error) {
      console.error("Error registrando personal:", error);
      setMensaje("⚠️ No se pudo registrar. Revisá permisos/RLS o columnas de profiles.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormShell
      session={session}
      profile={profile}
      title="Registrar personal"
      subtitle="Nuevo recurso"
      onBack={onBack}
      onLogout={onLogout}
    >
      <section className="cu-panel cu-specialties-panel">
        <div className="cu-panel-header">
          <div>
            <h3>Datos del recurso</h3>
            <p>Este registro crea el expediente base en profiles.</p>
          </div>
          <span className="cu-badge">UCI</span>
        </div>

        {mensaje ? <div className="cu-alert">{mensaje}</div> : null}

        <form onSubmit={guardar} className="login-form" style={{ maxWidth: 760 }}>
          <label>Nombre completo</label>
          <div className="input-row">
            <input
              type="text"
              placeholder="Ej. Jonathan Villalobos"
              value={form.nombre}
              onChange={(e) => setField("nombre", e.target.value)}
              required
            />
          </div>

          <label>Correo</label>
          <div className="input-row">
            <input
              type="email"
              placeholder="correo@especialidades.com"
              value={form.correo}
              onChange={(e) => setField("correo", e.target.value)}
              required
            />
          </div>

          <label>CUM / Código único</label>
          <div className="input-row">
            <input
              type="text"
              placeholder={generatingCum ? "Generando CUM..." : "Se genera automático"}
              value={form.cum}
              onChange={(e) => {
                setCumAuto(e.target.value.trim() === "");
                setField("cum", e.target.value.toUpperCase());
              }}
            />
          </div>
          <p style={{ margin: "-6px 0 4px", color: "#667897", fontWeight: 800, fontSize: 12 }}>
            Código institucional automático según rol o especialidad. Podés editarlo manualmente si es necesario.
          </p>

          <label>Rol</label>
          <div className="input-row">
            <select value={form.rol} onChange={(e) => setField("rol", e.target.value)}>
              <option value="personal">Personal</option>
              <option value="admin">Admin</option>
              <option value="docente">Docente</option>
              <option value="supervisor">Supervisor</option>
            </select>
          </div>

          <label>Servicio</label>
          <div className="input-row">
            <input
              type="text"
              value={form.servicio}
              onChange={(e) => setField("servicio", e.target.value)}
              placeholder="UCI"
            />
          </div>

          <label>Área</label>
          <div className="input-row">
            <input
              type="text"
              value={form.area}
              onChange={(e) => setField("area", e.target.value)}
              placeholder="Ej. UCI General"
            />
          </div>


          <label>Especialidad</label>
          <div className="input-row">
            <select
              value={form.especialidadId}
              onChange={(e) => setField("especialidadId", e.target.value)}
            >
              <option value="">Seleccionar especialidad</option>
              {especialidades.map((esp) => (
                <option key={esp.id} value={esp.id}>
                  {esp.nombre}
                </option>
              ))}
            </select>
          </div>

          <button className="login-submit" type="submit" disabled={saving || generatingCum}>
            {saving ? "Guardando..." : generatingCum ? "Generando CUM..." : "Guardar personal"}
          </button>
        </form>
      </section>
    </FormShell>
  );
}

function AsignarEspecialidad({
  session,
  profile,
  especialidades,
  onBack,
  onLogout,
  onAssigned,
}) {
  const [usuarios, setUsuarios] = useState([]);
  const [userId, setUserId] = useState("");
  const [especialidadId, setEspecialidadId] = useState("");
  const [progreso, setProgreso] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    let mounted = true;

    async function cargarUsuarios() {
      setLoading(true);
      setMensaje("");

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, user_id, nombre, correo, rol, servicio, area, cum, activo")
          .neq("activo", false)
          .order("nombre", { ascending: true });

        if (error) throw error;
        if (!mounted) return;

        setUsuarios((data || []).filter((item) => item.user_id));
      } catch (error) {
        console.error("Error cargando usuarios:", error);
        if (mounted) setMensaje("⚠️ No se pudo cargar profiles. Revisá permisos/RLS.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    cargarUsuarios();

    return () => {
      mounted = false;
    };
  }, []);

  async function asignar(e) {
    e.preventDefault();
    setMensaje("");

    if (!userId || !especialidadId) {
      setMensaje("Seleccioná recurso y especialidad.");
      return;
    }

    setSaving(true);

    try {
      const { data: existente, error: checkError } = await supabase
        .from("usuario_especialidad")
        .select("id")
        .eq("user_id", userId)
        .eq("especialidad_id", especialidadId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existente?.id) {
        const { error } = await supabase
          .from("usuario_especialidad")
          .update({
            progreso: Number(progreso) || 0,
            activo: true,
          })
          .eq("id", existente.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("usuario_especialidad").insert({
          user_id: userId,
          especialidad_id: especialidadId,
          progreso: Number(progreso) || 0,
          activo: true,
        });

        if (error) throw error;
      }

      setMensaje("✅ Especialidad asignada correctamente.");
      setUserId("");
      setEspecialidadId("");
      setProgreso(0);
      onAssigned?.();
    } catch (error) {
      console.error("Error asignando especialidad:", error);
      setMensaje("⚠️ No se pudo asignar. Revisá tabla usuario_especialidad y permisos.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormShell
      session={session}
      profile={profile}
      title="Asignar especialidad"
      subtitle="Vincular recurso"
      onBack={onBack}
      onLogout={onLogout}
    >
      <section className="cu-panel cu-specialties-panel">
        <div className="cu-panel-header">
          <div>
            <h3>Asignación a especialidad</h3>
            <p>Seleccioná el recurso y la especialidad que está cursando.</p>
          </div>
          <span className="cu-badge">UCI</span>
        </div>

        {mensaje ? <div className="cu-alert">{mensaje}</div> : null}

        <form onSubmit={asignar} className="login-form" style={{ maxWidth: 820 }}>
          <label>Recurso</label>
          <div className="input-row">
            <select value={userId} onChange={(e) => setUserId(e.target.value)} required>
              <option value="">{loading ? "Cargando recursos..." : "Seleccionar recurso"}</option>
              {usuarios.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.nombre || "Sin nombre"} {u.cum ? `— ${u.cum}` : ""} {u.correo ? `— ${u.correo}` : ""}
                </option>
              ))}
            </select>
          </div>

          <label>Especialidad</label>
          <div className="input-row">
            <select value={especialidadId} onChange={(e) => setEspecialidadId(e.target.value)} required>
              <option value="">Seleccionar especialidad</option>
              {especialidades.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>

          <label>Progreso inicial (%)</label>
          <div className="input-row">
            <input
              type="number"
              min="0"
              max="100"
              value={progreso}
              onChange={(e) => setProgreso(e.target.value)}
            />
          </div>

          <button className="login-submit" type="submit" disabled={saving || loading}>
            {saving ? "Asignando..." : "Asignar especialidad"}
          </button>
        </form>
      </section>
    </FormShell>
  );
}


function Dashboard({ session, profile, especialidades, loadingData, dataError, onLogout, onOpenEspecialidad, onOpenRegistrar, onOpenAsignar, onOpenCrearEvaluacion, onExportReporte }) {
  const displayName =
    profile?.nombre ||
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    "Jonathan Villalobos";

  const stats = useMemo(() => {
    const activeSpecialties = especialidades.filter((item) => item.activa !== false).length;
    return [
      { label: "Especialidades activas", value: activeSpecialties, icon: "▣", tone: "blue" },
      { label: "En formación", value: 0, icon: "▤", tone: "indigo" },
      { label: "Evaluaciones", value: 0, icon: "☑", tone: "green" },
      { label: "Evidencias", value: 0, icon: "▧", tone: "purple" },
    ];
  }, [especialidades]);

  return (
    <div className="cu-shell">
      <Sidebar profile={profile} onLogout={onLogout} />

      <main className="cu-main">
        <header className="cu-topbar">
          <div className="cu-title-block">
            <span className="cu-kicker">FORMACIÓN HOSPITALARIA UCI</span>
            <h2>Bienvenido,<br /><span>Un gusto, {displayName}</span></h2>
            <p>Control de especializaciones, avance individual, evaluaciones y evidencias.</p>
          </div>

          <div className="cu-profile-card">
            <div className="cu-avatar">👤</div>
            <div>
              <strong>{displayName}</strong>
              <span>{profile?.cum || "Sin CUM"} • Campus UCI</span>
            </div>
          </div>
        </header>

        {dataError ? <div className="cu-alert">⚠️ {dataError}</div> : null}

        <section className="cu-stats-grid">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </section>

        <section className="cu-dashboard-grid">
          <section className="cu-panel cu-specialties-panel">
            <div className="cu-panel-header">
              <div>
                <h3>Especialidades disponibles</h3>
                <p>Inicialmente Hemodiálisis y ECMO; la estructura queda lista para agregar más.</p>
              </div>
              <span className="cu-badge">UCI</span>
            </div>

            {loadingData ? (
              <div className="cu-empty">Cargando especialidades...</div>
            ) : especialidades.length === 0 ? (
              <div className="cu-empty">No hay especialidades registradas.</div>
            ) : (
              <div className="cu-specialty-grid">
                {especialidades.map((item) => (
                  <article className="cu-specialty-card" key={item.id}>
                    <div className="cu-specialty-icon">{item.nombre?.toLowerCase().includes("ecmo") ? "🫀" : "💧"}</div>
                    <h4>{item.nombre}</h4>
                    <p>{item.descripcion || "Especialización crítica de UCI."}</p>
                    <ProgressPill value={0} />
                    <button type="button" onClick={() => onOpenEspecialidad?.(item)}>Ver formación</button>
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className="cu-side-panels">
            <section className="cu-panel compact-panel">
              <h3>Próximos eventos</h3>
              <div className="cu-event-box">
                <span>Hoy</span>
                <strong>Sin eventos pendientes</strong>
                <p>Luego conectaremos calendario y capacitaciones.</p>
              </div>
            </section>

            <section className="cu-panel compact-panel">
              <h3>Panel rápido</h3>
              <div className="cu-action-list">
                <button type="button" onClick={onOpenRegistrar}><Icon name="userPlus" /> Registrar personal</button>
                <button type="button" onClick={onOpenAsignar}><Icon name="cap" /> Asignar especialidad</button>
                <button type="button" onClick={onOpenCrearEvaluacion}><Icon name="checklist" /> Crear evaluación</button>
                <button type="button" onClick={onExportReporte}><Icon name="chart" /> Exportar reporte</button>
              </div>
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [especialidades, setEspecialidades] = useState([]);
  const [especialidadActiva, setEspecialidadActiva] = useState(null);
  const [usuariosEspecialidad, setUsuariosEspecialidad] = useState([]);
  const [expedienteActivo, setExpedienteActivo] = useState(null);
  const [loadingUsuariosEspecialidad, setLoadingUsuariosEspecialidad] = useState(false);
  const [usuariosEspecialidadError, setUsuariosEspecialidadError] = useState("");
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState("");
  const [vista, setVista] = useState("dashboard");
  const [cursoEvaluacionActivo, setCursoEvaluacionActivo] = useState(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) console.error("Error sesión:", error);
      setSession(data?.session || null);
      setSessionLoading(false);
    };

    init();

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession || null);
      if (!newSession) {
        setProfile(null);
        setEspecialidades([]);
        setEspecialidadActiva(null);
        setUsuariosEspecialidad([]);
        setVista("dashboard");
    setCursoEvaluacionActivo(null);
        setCursoEvaluacionActivo(null);
      }
    });

    return () => {
      mounted = false;
      data?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      if (!session?.user?.id) {
        setProfile(null);
        return;
      }

      setProfileLoading(true);

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, user_id, nombre, correo, rol, servicio, area, cum, activo")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          console.error("Error cargando perfil:", error);
          setProfile({ nombre: "Jonathan Villalobos", correo: session.user.email, rol: "personal", cum: "Sin CUM", activo: true });
        } else {
          setProfile(data || { nombre: "Jonathan Villalobos", correo: session.user.email, rol: "personal", cum: "Sin CUM", activo: true });
        }
      } catch (error) {
        console.error("Error inesperado perfil:", error);
        if (mounted) setProfile({ nombre: "Jonathan Villalobos", correo: session.user.email, rol: "personal", cum: "Sin CUM", activo: true });
      } finally {
        if (mounted) setProfileLoading(false);
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [session]);

  useEffect(() => {
    let mounted = true;

    const loadEspecialidades = async () => {
      if (!session?.user?.id) return;

      setLoadingData(true);
      setDataError("");

      try {
        const { data, error } = await supabase
          .from("especialidades")
          .select("id, nombre, descripcion, activa")
          .order("created_at", { ascending: true });

        if (!mounted) return;

        if (error) {
          console.error("Error cargando especialidades:", error);
          setDataError("No se pudieron cargar las especialidades desde Supabase. Mostrando base temporal.");
          setEspecialidades([]);
        } else {
          setEspecialidades(data || []);
        }
      } catch (error) {
        console.error("Error inesperado especialidades:", error);
        if (mounted) {
          setDataError("No se pudieron cargar las especialidades. Mostrando base temporal.");
          setEspecialidades([]);
        }
      } finally {
        if (mounted) setLoadingData(false);
      }
    };

    loadEspecialidades();

    return () => {
      mounted = false;
    };
  }, [session]);


  async function handleOpenEspecialidad(especialidad) {
    if (!especialidad?.id) return;

    setEspecialidadActiva(especialidad);
    setExpedienteActivo(null);
    setUsuariosEspecialidad([]);
    setUsuariosEspecialidadError("");
    setLoadingUsuariosEspecialidad(true);

    try {
      const { data: asignaciones, error: asignacionesError } = await supabase
        .from("usuario_especialidad")
        .select("id, user_id, especialidad_id, progreso, activo, created_at")
        .eq("especialidad_id", especialidad.id)
        .eq("activo", true)
        .order("created_at", { ascending: true });

      if (asignacionesError) throw asignacionesError;

      const userIds = [...new Set((asignaciones || []).map((item) => item.user_id).filter(Boolean))];

      let perfiles = [];
      if (userIds.length > 0) {
        const { data: perfilesData, error: perfilesError } = await supabase
          .from("profiles")
          .select("id, user_id, nombre, correo, rol, servicio, area, cum, activo")
          .in("user_id", userIds);

        if (perfilesError) throw perfilesError;
        perfiles = perfilesData || [];
      }

      const perfilesMap = new Map(perfiles.map((perfil) => [perfil.user_id, perfil]));

      const normalizados = (asignaciones || []).map((asignacion) => {
        const perfil = perfilesMap.get(asignacion.user_id) || {};
        return {
          id: asignacion.id,
          user_id: asignacion.user_id,
          profile_id: perfil.id || null,
          especialidad_id: asignacion.especialidad_id,
          progreso: asignacion.progreso ?? 0,
          nombre: perfil.nombre || "Sin nombre registrado",
          correo: perfil.correo || "",
          cum: perfil.cum || "Sin CUM",
          rol: perfil.rol || "",
          servicio: perfil.servicio || "",
          area: perfil.area || "",
          activo: perfil.activo !== false,
        };
      });

      setUsuariosEspecialidad(normalizados);
    } catch (error) {
      console.error("Error cargando expedientes:", error);
      setUsuariosEspecialidadError(
        "No se pudieron cargar los expedientes. Revisá que exista la tabla usuario_especialidad y sus registros.",
      );
      setUsuariosEspecialidad([]);
    } finally {
      setLoadingUsuariosEspecialidad(false);
    }
  }


  function handleExportReporte() {
    const filas = [
      ["Especialidad", "Descripción", "Activa"],
      ...especialidades.map((item) => [
        item.nombre || "",
        item.descripcion || "",
        item.activa === false ? "No" : "Sí",
      ]),
    ];

    const csv = filas
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "reporte_especialidades.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setEspecialidades([]);
    setEspecialidadActiva(null);
    setUsuariosEspecialidad([]);
    setVista("dashboard");
  }

  if (sessionLoading) return <div className="cu-loading">Cargando sesión...</div>;
  if (!session) return <LoginScreen onLoginSuccess={setSession} />;
  if (profileLoading) return <div className="cu-loading">Cargando perfil...</div>;


  if (vista === "registrar") {
    return (
      <RegistrarPersonal
        session={session}
        profile={profile}
        especialidades={especialidades}
        onBack={() => setVista("dashboard")}
        onLogout={handleLogout}
      />
    );
  }

  if (vista === "asignar") {
    return (
      <AsignarEspecialidad
        session={session}
        profile={profile}
        especialidades={especialidades}
        onBack={() => setVista("dashboard")}
        onLogout={handleLogout}
      />
    );
  }



  if (vista === "crearEvaluacion") {
    if (cursoEvaluacionActivo) {
      return (
        <FormShell
          session={session}
          profile={profile}
          title="Crear evaluación"
          subtitle={cursoEvaluacionActivo?.nombre || "Capacitación"}
          onBack={() => setCursoEvaluacionActivo(null)}
          onLogout={handleLogout}
        >
          <CapacitacionesEspecialidad
            profile={profile}
            especialidad={cursoEvaluacionActivo}
            onBack={() => setCursoEvaluacionActivo(null)}
          />
        </FormShell>
      );
    }

    return (
      <FormShell
        session={session}
        profile={profile}
        title="Crear evaluación"
        subtitle="Seleccionar curso"
        onBack={() => {
          setVista("dashboard");
          setCursoEvaluacionActivo(null);
        }}
        onLogout={handleLogout}
      >
        <section className="cu-panel cu-specialties-panel">
          <div className="cu-panel-header">
            <div>
              <h3>¿Para qué curso querés crear la evaluación?</h3>
              <p>Seleccioná una especialidad para abrir la bitácora académica.</p>
            </div>
            <span className="cu-badge">UCI</span>
          </div>

          {especialidades.length === 0 ? (
            <div className="cu-empty">No hay cursos/especialidades registradas.</div>
          ) : (
            <div className="cu-specialty-grid">
              {especialidades.map((item) => (
                <article className="cu-specialty-card" key={item.id}>
                  <div className="cu-specialty-icon">
                    {item.nombre?.toLowerCase().includes("ecmo") ? "🫀" : "💧"}
                  </div>
                  <h4>{item.nombre}</h4>
                  <p>{item.descripcion || "Curso académico de especialización UCI."}</p>
                  <button type="button" onClick={() => setCursoEvaluacionActivo(item)}>
                    Crear evaluación
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </FormShell>
    );
  }

  if (vista === "expediente" && expedienteActivo && especialidadActiva) {
    return (
      <IndexCarpetaAcademica
        profile={profile}
        especialidad={especialidadActiva}
        recurso={expedienteActivo}
        onBack={() => {
          setVista("dashboard");
          setExpedienteActivo(null);
        }}
      />
    );
  }

  if (especialidadActiva) {
    return (
      <>
        <ExpedientesEspecialidad
          session={session}
          profile={profile}
          especialidad={especialidadActiva}
          usuarios={usuariosEspecialidad}
          loading={loadingUsuariosEspecialidad}
          error={usuariosEspecialidadError}
          expedienteActivo={expedienteActivo}
          onOpenExpediente={(item) => {
            setExpedienteActivo(item);
            setVista("expediente");
          }}
          onBack={() => {
            setEspecialidadActiva(null);
            setExpedienteActivo(null);
            setUsuariosEspecialidad([]);
            setUsuariosEspecialidadError("");
          }}
          onLogout={handleLogout}
        />
      </>
    );
  }

  if (profile?.activo === false) {
    return (
      <div className="cu-loading">
        <div>
          <h2>Usuario inactivo</h2>
          <p>Tu usuario está desactivado. Consultá con administración.</p>
          <button onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </div>
    );
  }

  return (
    <Dashboard
      session={session}
      profile={profile}
      especialidades={especialidades}
      loadingData={loadingData}
      dataError={dataError}
      onLogout={handleLogout}
      onOpenEspecialidad={handleOpenEspecialidad}
      onOpenRegistrar={() => setVista("registrar")}
      onOpenAsignar={() => setVista("asignar")}
      onOpenCrearEvaluacion={() => {
        setCursoEvaluacionActivo(null);
        setVista("crearEvaluacion");
      }}
      onExportReporte={handleExportReporte}
    />
  );
}
