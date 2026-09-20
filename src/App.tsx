import { useState, useEffect, useRef } from 'react';
import { Mic, CheckSquare, Square, Plus, Loader2 } from 'lucide-react';
import { fetchBoardData, toggleSubtarea, createSubtareaManual, createTareaManual } from './lib/airtable';
import type { Tarea } from './lib/airtable';

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para la creación manual de subtareas
  const [addingSubtaskTo, setAddingSubtaskTo] = useState<string | null>(null);
  const [newSubtaskName, setNewSubtaskName] = useState("");
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);

  // Estado para la creación manual de tareas
  const [addingTaskTo, setAddingTaskTo] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);

  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const proyectos = ['EMPRESARIAS', '360 CORE', 'APP GobernaIA'];

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    const data = await fetchBoardData();
    setTareas(data);
    setLoading(false);
  };

  const handleToggleSubtarea = async (tareaId: string, subId: string, actualEstado: boolean) => {
    setTareas(prev => prev.map(t => {
      if (t.id === tareaId) {
        return {
          ...t,
          subtareas: t.subtareas.map(s => s.id === subId ? { ...s, completada: !actualEstado } : s)
        };
      }
      return t;
    }));
    await toggleSubtarea(subId, !actualEstado);
  };

  const handleCreateSubtask = async (tareaId: string) => {
    if (!newSubtaskName.trim()) {
      setAddingSubtaskTo(null);
      return;
    }
    setIsAddingSubtask(true);
    try {
      await createSubtareaManual(tareaId, newSubtaskName);
      setNewSubtaskName("");
      setAddingSubtaskTo(null);
      await cargarDatos();
    } catch (err) {
      console.error(err);
      alert("Error al crear la subtarea. Revisa tu conexión a Airtable.");
    } finally {
      setIsAddingSubtask(false);
    }
  };

  const handleCreateTask = async (proyecto: string) => {
    if (!newTaskName.trim()) {
      setAddingTaskTo(null);
      return;
    }
    setIsAddingTask(true);
    try {
      await createTareaManual(newTaskName, proyecto);
      setNewTaskName("");
      setAddingTaskTo(null);
      await cargarDatos();
    } catch (err) {
      console.error(err);
      alert("Error al crear la tarea. Revisa tu conexión a Airtable.");
    } finally {
      setIsAddingTask(false);
    }
  };

  const toggleGrabacion = async () => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const audioChunks: BlobPart[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunks.push(e.data);
        };

        recorder.onstop = async () => {
          setIsSending(true);
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('audio', audioBlob, 'dictado.webm');

          try {
            const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
            await fetch(webhookUrl, {
              method: 'POST',
              body: formData
            });
            console.log("Audio enviado a n8n");
            setTimeout(cargarDatos, 3000);
          } catch (err) {
            console.error("Error enviando el audio", err);
          } finally {
            setIsSending(false);
          }

          stream.getTracks().forEach(track => track.stop());
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch (err) {
        console.error("Mic error", err);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header mejorado visualmente */}
      <header className="bg-white border-b-2 border-seviai-red p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <img src="/simbolo.png" alt="SeviAI" className="w-10 h-10 object-contain drop-shadow-sm" />
          <div>
            <h1 className="font-bold text-2xl text-black tracking-tight">Asistente Visual</h1>
            <p className="text-xs text-gray-500 font-medium tracking-wider uppercase">SeviAI - Centro de Control</p>
          </div>
          {(loading || isSending) && <Loader2 className="w-5 h-5 text-seviai-red animate-spin ml-4" />}
        </div>
        
        <button 
          onClick={toggleGrabacion}
          disabled={isSending}
          className={`flex items-center gap-2 font-bold py-3 px-6 rounded-lg shadow-md transition-all text-white ${
            isRecording ? 'bg-black animate-pulse scale-105' : 
            isSending ? 'bg-gray-400' : 'bg-seviai-red hover:bg-[#b81820] hover:shadow-lg'
          }`}
        >
          <Mic className="w-5 h-5" />
          {isRecording ? 'Escuchando...' : isSending ? 'Enviando...' : 'DICTAR TAREA'}
        </button>
      </header>

      {/* Kanban Board con toque más atractivo */}
      <main className="flex-1 p-8 flex gap-6 overflow-x-auto">
        {proyectos.map((proyecto) => {
          const tareasProyecto = tareas.filter(t => t.proyecto === proyecto);
          
          return (
            <div key={proyecto} className="flex-1 min-w-[340px] bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col overflow-hidden">
              {/* Cabecera de la columna más llamativa */}
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h2 className="font-bold text-lg text-gray-800">{proyecto}</h2>
                <span className="bg-white border border-gray-200 text-seviai-red shadow-sm text-sm px-3 py-1 rounded-full font-bold">
                  {tareasProyecto.length}
                </span>
              </div>
              
              <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-4 bg-[#F8F9FA]">
                {tareasProyecto.map((tarea) => (
                  <div key={tarea.id} className="group bg-white border-t-4 border-t-seviai-red rounded-b-lg shadow-sm hover:shadow-md transition-all p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 text-base">{tarea.nombre}</h3>
                    
                    {tarea.subtareas.length > 0 && (
                      <div className="space-y-2 mt-3 pt-3 border-t border-gray-100">
                        {tarea.subtareas.map((sub) => (
                          <label key={sub.id} onClick={(e) => { e.preventDefault(); handleToggleSubtarea(tarea.id, sub.id, sub.completada); }} className="flex items-start gap-3 text-sm text-gray-600 cursor-pointer hover:text-black group-hover:bg-gray-50 p-1 rounded transition-colors">
                            <div className="mt-0.5">
                              {sub.completada ? (
                                <CheckSquare className="w-4 h-4 text-seviai-red" />
                              ) : (
                                <Square className="w-4 h-4 text-gray-300" />
                              )}
                            </div>
                            <span className={`leading-snug ${sub.completada ? "line-through text-gray-400" : ""}`}>{sub.nombre}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    
                    {/* Botón / Input para añadir nueva subtarea manualmente */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      {addingSubtaskTo === tarea.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            autoFocus
                            placeholder="Escribe la subtarea y pulsa Intro..."
                            value={newSubtaskName}
                            onChange={(e) => setNewSubtaskName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleCreateSubtask(tarea.id);
                              } else if (e.key === 'Escape') {
                                setAddingSubtaskTo(null);
                                setNewSubtaskName("");
                              }
                            }}
                            className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none focus:border-seviai-red focus:ring-1 focus:ring-seviai-red"
                            disabled={isAddingSubtask}
                          />
                          {isAddingSubtask && <Loader2 className="w-4 h-4 text-seviai-red animate-spin" />}
                        </div>
                      ) : (
                        <button 
                          onClick={() => {
                            setAddingSubtaskTo(tarea.id);
                            setNewSubtaskName("");
                          }}
                          className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-seviai-red transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Añadir subtarea
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Botón / Input para añadir nueva tarea a la columna manualmente */}
                {addingTaskTo === proyecto ? (
                  <div className="flex items-center gap-2 mt-2 bg-white p-3 rounded-lg border border-seviai-red shadow-sm">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Nombre de la tarea..."
                      value={newTaskName}
                      onChange={(e) => setNewTaskName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateTask(proyecto);
                        } else if (e.key === 'Escape') {
                          setAddingTaskTo(null);
                          setNewTaskName("");
                        }
                      }}
                      className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded px-2 py-2 outline-none focus:border-seviai-red focus:ring-1 focus:ring-seviai-red"
                      disabled={isAddingTask}
                    />
                    {isAddingTask && <Loader2 className="w-4 h-4 text-seviai-red animate-spin" />}
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setAddingTaskTo(proyecto);
                      setNewTaskName("");
                    }}
                    className="border-dashed border-2 border-gray-300 rounded-lg p-4 flex items-center justify-center gap-2 text-gray-500 font-semibold text-sm hover:border-seviai-red hover:text-seviai-red hover:bg-red-50 transition-all mt-2"
                  >
                    <Plus className="w-4 h-4" /> Añadir Tarea Manual
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
