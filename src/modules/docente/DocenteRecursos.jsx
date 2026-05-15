import { useEffect, useMemo, useState } from "react";
import RecursosAdmin from "../admin/RecursosAdmin";
import { getEspecialidadesPermitidas } from "../../services/docenteService";

export default function DocenteRecursos({ profile = null, especialidades = [], ...props }) {
  const [especialidadesPermitidas, setEspecialidadesPermitidas] = useState([]);

  useEffect(() => {
    let alive = true;

    async function loadPermitidas() {
      const rows = await getEspecialidadesPermitidas(profile, especialidades);
      if (alive) setEspecialidadesPermitidas(rows);
    }

    loadPermitidas();
    return () => {
      alive = false;
    };
  }, [especialidades, profile]);

  const allowedEspecialidadIds = useMemo(
    () => especialidadesPermitidas.map((item) => item.id),
    [especialidadesPermitidas],
  );

  return (
    <RecursosAdmin
      {...props}
      profile={profile}
      especialidades={especialidadesPermitidas}
      allowedEspecialidadIds={allowedEspecialidadIds}
    />
  );
}
