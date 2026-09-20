const PAT = import.meta.env.VITE_AIRTABLE_PAT;
const BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
const URL = `https://api.airtable.com/v0/${BASE_ID}`;

const headers = {
  Authorization: `Bearer ${PAT}`,
  'Content-Type': 'application/json'
};

export interface Subtarea {
  id: string;
  nombre: string;
  completada: boolean;
  tareaId?: string;
}

export interface Tarea {
  id: string;
  nombre: string;
  proyecto: string;
  estado: string;
  subtareas: Subtarea[];
}

export async function fetchBoardData(): Promise<Tarea[]> {
  try {
    // 1. Fetch Tareas
    const tareasRes = await fetch(`${URL}/Tarea`, { headers });
    if (!tareasRes.ok) throw new Error("Fallo al leer Tarea");
    const tareasJson = await tareasRes.json();

    // 2. Fetch Subtareas
    const subtareasRes = await fetch(`${URL}/Subtarea`, { headers });
    if (!subtareasRes.ok) throw new Error("Fallo al leer Subtarea");
    const subtareasJson = await subtareasRes.json();

    const tareasMap: Record<string, Tarea> = {};
    const tareas: Tarea[] = [];

    // Procesar Tareas
    tareasJson.records.forEach((t: any) => {
      const tarea: Tarea = {
        id: t.id,
        nombre: t.fields.Name || 'Sin título',
        proyecto: t.fields.Proyecto || 'Empresarias SeviAI',
        estado: t.fields.Estado || 'Pendiente',
        subtareas: []
      };
      tareasMap[tarea.id] = tarea;
      tareas.push(tarea);
    });

    // Procesar Subtareas y vincularlas
    if (subtareasJson.records) {
      subtareasJson.records.forEach((s: any) => {
        const sub: Subtarea = {
          id: s.id,
          nombre: s.fields.Name || s.fields.Nombre || 'Sin título',
          completada: !!s.fields.Completada,
          tareaId: s.fields.Tarea && s.fields.Tarea.length > 0 ? s.fields.Tarea[0] : null
        };
        if (sub.tareaId && tareasMap[sub.tareaId]) {
          tareasMap[sub.tareaId].subtareas.push(sub);
        }
      });
    }

    return tareas;
  } catch (error) {
    console.error("Error cargando Airtable:", error);
    return [];
  }
}

export async function toggleSubtarea(subtareaId: string, completada: boolean) {
  const body = {
    records: [
      {
        id: subtareaId,
        fields: {
          Completada: completada
        }
      }
    ]
  };

  const res = await fetch(`${URL}/Subtarea`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body)
  });
  
  if (!res.ok) {
    console.error("Error al actualizar la subtarea");
  }
}

export async function createSubtareaManual(tareaId: string, nombre: string) {
  const body = {
    records: [
      {
        fields: {
          Name: nombre,
          Tarea: [tareaId]
        }
      }
    ]
  };

  const res = await fetch(`${URL}/Subtarea`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  
  if (!res.ok) {
    throw new Error("Error al crear la subtarea");
  }
}

export async function createTareaManual(nombre: string, proyecto: string) {
  const body = {
    records: [
      {
        fields: {
          Name: nombre,
          Proyecto: proyecto,
          Estado: "Pendiente"
        }
      }
    ]
  };

  const res = await fetch(`${URL}/Tarea`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  
  if (!res.ok) {
    throw new Error("Error al crear la tarea principal");
  }
}
