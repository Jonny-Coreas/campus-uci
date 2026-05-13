import { useMemo, useState } from "react";

const STUDENTS = [
  { id: "recurso-1", nombre: "Recurso UCI 001", cum: "UCI-001" },
  { id: "recurso-2", nombre: "Recurso UCI 002", cum: "UCI-002" },
  { id: "recurso-3", nombre: "Recurso UCI 003", cum: "UCI-003" },
];

const MOCK_EVALUATIONS = {
  "recurso-1": [
    { criterio: "Responsabilidad", puntaje: 9, observacion: "Cumple tareas asignadas con constancia." },
    { criterio: "Puntualidad", puntaje: 8, observacion: "Asiste puntualmente a la mayoría de sesiones." },
    { criterio: "Participación", puntaje: 9, observacion: "Participa activamente en discusión clínica." },
    { criterio: "Trabajo en equipo", puntaje: 8, observacion: "Colabora con el equipo multidisciplinario." },
    { criterio: "Iniciativa", puntaje: 8, observacion: "Propone soluciones durante prácticas." },
    { criterio: "Relaciones interpersonales", puntaje: 9, observacion: "Mantiene trato respetuoso." },
    { criterio: "Ética profesional", puntaje: 10, observacion: "Muestra criterio profesional adecuado." },
    { criterio: "Presentación personal", puntaje: 9, observacion: "Cumple estándares institucionales." },
    { criterio: "Cumplimiento de normas", puntaje: 8, observacion: "Respeta protocolos del área." },
    { criterio: "Observaciones generales", puntaje: 9, observacion: "Desempeño actitudinal satisfactorio." },
  ],
  "recurso-2": [],
  "recurso-3": [
    { criterio: "Responsabilidad", puntaje: 7, observacion: "Requiere seguimiento ocasional." },
    { criterio: "Puntualidad", puntaje: 6, observacion: "Presenta llegadas tardías." },
    { criterio: "Participación", puntaje: 7, observacion: "Participación adecuada." },
  ],
};

function promedio(rows) {
  const scores = rows
    .map((item) => Number(item.puntaje))
    .filter((value) => Number.isFinite(value));

  if (!scores.length) return null;
  return (scores.reduce((acc, value) => acc + value, 0) / scores.length).toFixed(1);
}

export default function EvaluacionActitudinal() {
  const [studentId, setStudentId] = useState(STUDENTS[0].id);

  const rows = useMemo(() => MOCK_EVALUATIONS[studentId] || [], [studentId]);
  const selectedStudent = STUDENTS.find((item) => item.id === studentId);
  const average = promedio(rows);

  return (
    <section className="drive-module-view" aria-label="Evaluación actitudinal">
      <div className="drive-module-header">
        <div>
          <span className="drive-info-label">Evaluación Actitudinal</span>
          <h2>Formato individual</h2>
          <p>
            Registro académico de criterios actitudinales por recurso. Esta vista queda
            preparada para conectarse después con datos reales.
          </p>
        </div>

        <label className="drive-select-field">
          <span>Recurso / estudiante</span>
          <select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
            {STUDENTS.map((student) => (
              <option key={student.id} value={student.id}>
                {student.nombre} · {student.cum}
              </option>
            ))}
          </select>
        </label>
      </div>

      {rows.length === 0 ? (
        <div className="drive-empty-state">Sin evaluación actitudinal registrada</div>
      ) : (
        <>
          <div className="drive-attitude-summary">
            <div>
              <span>Estudiante</span>
              <strong>{selectedStudent?.nombre || "Sin recurso"}</strong>
            </div>
            <div>
              <span>Promedio actitudinal</span>
              <strong>{average}</strong>
            </div>
          </div>

          <div className="drive-notes-table-wrap">
            <table className="drive-notes-table">
              <thead>
                <tr>
                  <th>Criterio</th>
                  <th>Puntaje</th>
                  <th>Observación</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.criterio}>
                    <td>{row.criterio}</td>
                    <td>{row.puntaje}</td>
                    <td>{row.observacion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
