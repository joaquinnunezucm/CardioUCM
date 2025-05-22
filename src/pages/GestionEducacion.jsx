import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Swal from 'sweetalert2';
import $ from 'jquery';
import 'datatables.net-bs4';
import 'datatables.net-bs4/css/dataTables.bootstrap4.min.css';

// --- Componente Principal GestionEducacion ---
function GestionEducacion() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tableRef = useRef();
  const dataTableRef = useRef(null);

  const { token } = useAuth();

  // Función para obtener los encabezados de autorización
  const getAuthHeaders = useCallback(() => {
    if (!token) {
      console.error("GestionEducacion: Token no disponible para la solicitud.");
      return {};
    }
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  }, [token]);

  // Destruir DataTable antes de actualizar
  const destroyDataTable = () => {
    if (dataTableRef.current) {
      try {
        dataTableRef.current.destroy();
        dataTableRef.current = null;
      } catch (err) {
        console.log("DataTable ya destruida");
      }
    }
  };

  // Inicializar DataTable
  const initializeDataTable = () => {
    if (tableRef.current && items.length > 0) {
      destroyDataTable();
      
      dataTableRef.current = $(tableRef.current).DataTable({
        destroy: true,
        responsive: true,
        language: {
          search: "Buscar:",
          lengthMenu: "Mostrar _MENU_ registros",
          info: "Mostrando _START_ a _END_ de _TOTAL_ contenidos",
          paginate: { previous: "Anterior", next: "Siguiente" },
          zeroRecords: "No se encontraron contenidos",
          emptyTable: "No hay contenido educativo disponible"
        },
        order: [[2, 'asc'], [3, 'asc']], // Ordenar por orden_categoria y orden_item
        columnDefs: [
          { orderable: false, targets: [5] } // Deshabilitar orden en columna de acciones
        ]
      });
    }
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');
    
    if (!token) {
      setError("No autenticado. No se puede cargar el contenido.");
      setLoading(false);
      setItems([]);
      return;
    }
    
    try {
      const response = await axios.get('http://localhost:3001/api/admin/educacion', getAuthHeaders());
      setItems(response.data);
      setError('');
    } catch (err) {
      console.error("Error fetching educacion items:", err);
      const errorMessage = err.response?.data?.message || err.message || 'Error al cargar el contenido educativo.';
      setError(errorMessage);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, token]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Inicializar DataTable después de cargar datos
  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        initializeDataTable();
      }, 100);
    }

    return () => {
      destroyDataTable();
    };
  }, [items, loading]);

  // Crear o Editar contenido educativo con SweetAlert2
  const handleCreateOrEdit = (item = null) => {
    Swal.fire({
      title: item ? 'Editar Contenido Educativo' : 'Crear Nuevo Contenido',
      html: `
        <div style="display: flex; flex-direction: column; gap: 15px; max-width: 900px; margin: auto;">
          <div style="display: flex; gap: 15px;">
            <input id="swal-input-categoria-id" class="swal2-input" placeholder="ID Categoría (ej: conceptos-clave)" value="${item?.categoria_id || ''}" style="flex: 1;">
            <input id="swal-input-categoria-nombre" class="swal2-input" placeholder="Nombre Categoría (ej: Conceptos Clave)" value="${item?.categoria_nombre || ''}" style="flex: 1;">
          </div>
          <input id="swal-input-titulo" class="swal2-input" placeholder="Título del Tema" value="${item?.titulo_tema || ''}" style="width: 100%;">
          <textarea id="swal-input-contenido" class="swal2-textarea" placeholder="Contenido del Tema (puede incluir HTML)" rows="6" style="width: 100%;">${item?.contenido_tema || ''}</textarea>
          <div style="display: flex; gap: 15px; align-items: center;">
            <input id="swal-input-orden-categoria" class="swal2-input" placeholder="Orden Categoría" type="number" value="${item?.orden_categoria || 0}" style="flex: 1;">
            <input id="swal-input-orden-item" class="swal2-input" placeholder="Orden Ítem" type="number" value="${item?.orden_item || 0}" style="flex: 1;">
            <label style="display: flex; align-items: center; gap: 5px; flex: 1;">
              <input id="swal-input-activo" type="checkbox" ${item?.activo !== false ? 'checked' : ''}>
              <span>Activo</span>
            </label>
          </div>
        </div>
      `,
      customClass: {
        popup: 'swal-wide'
      },
      width: '1000px',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: item ? 'Actualizar' : 'Crear',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const categoria_id = document.getElementById('swal-input-categoria-id').value.trim();
        const categoria_nombre = document.getElementById('swal-input-categoria-nombre').value.trim();
        const titulo_tema = document.getElementById('swal-input-titulo').value.trim();
        const contenido_tema = document.getElementById('swal-input-contenido').value.trim();
        const orden_categoria = parseInt(document.getElementById('swal-input-orden-categoria').value.trim());
        const orden_item = parseInt(document.getElementById('swal-input-orden-item').value.trim());
        const activo = document.getElementById('swal-input-activo').checked;

        if (!categoria_id || !categoria_nombre || !titulo_tema || !contenido_tema) {
          Swal.showValidationMessage('ID Categoría, Nombre Categoría, Título y Contenido son obligatorios');
          return false;
        }

        if (isNaN(orden_categoria) || isNaN(orden_item)) {
          Swal.showValidationMessage('Los campos de orden deben ser números válidos');
          return false;
        }

        return { 
          categoria_id, 
          categoria_nombre, 
          titulo_tema, 
          contenido_tema, 
          orden_categoria: Number(orden_categoria), 
          orden_item: Number(orden_item), 
          activo 
        };
      }
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        await handleSaveItem(item, result.value);
      }
    });
  };

  // Función separada para guardar contenido educativo
  const handleSaveItem = async (item, data) => {
    if (!token) {
      Swal.fire('Error', 'No autenticado. No se puede guardar.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const url = item 
        ? `http://localhost:3001/api/admin/educacion/${item.id}` 
        : 'http://localhost:3001/api/admin/educacion';
      
      const method = item ? 'put' : 'post';
      const response = await axios[method](url, data, getAuthHeaders());

      // Actualizar el estado de items de forma inmutable
      if (item) {
        // Editar item existente
        setItems(prevItems => 
          prevItems.map(prevItem => 
            prevItem.id === item.id ? { ...response.data } : prevItem
          )
        );
      } else {
        // Crear nuevo item
        setItems(prevItems => [...prevItems, response.data]);
      }

      Swal.fire({
        icon: 'success',
        title: item ? '¡Contenido actualizado correctamente!' : '¡Contenido creado correctamente!',
        showConfirmButton: false,
        timer: 1500
      });

    } catch (err) {
      console.error("Error al guardar contenido educativo:", err);
      const errorMessage = err.response?.data?.message || "Error al guardar el contenido.";
      Swal.fire('Error', errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eliminar contenido educativo con confirmación
  const handleDeleteItem = (itemId, tituloTema) => {
    if (!token) {
      Swal.fire('Error', 'No autenticado. No se puede eliminar.', 'error');
      return;
    }

    Swal.fire({
      title: '¿Eliminar Contenido?',
      text: `"${tituloTema}" se eliminará permanentemente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        await handleConfirmDelete(itemId, tituloTema);
      }
    });
  };

  // Función separada para confirmar eliminación
  const handleConfirmDelete = async (itemId, tituloTema) => {
    try {
      setIsSubmitting(true);
      
      await axios.delete(`http://localhost:3001/api/admin/educacion/${itemId}`, getAuthHeaders());
      
      // Actualizar el estado de items de forma inmutable
      setItems(prevItems => prevItems.filter(item => item.id !== itemId));

      Swal.fire({
        icon: 'success',
        title: '¡Contenido eliminado correctamente!',
        text: `"${tituloTema}" ha sido eliminado.`,
        showConfirmButton: false,
        timer: 1500
      });

    } catch (err) {
      console.error("Error eliminando contenido:", err);
      const errorMessage = err.response?.data?.message || "Error al eliminar el contenido.";
      Swal.fire('Error', errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="content-header">
        <div className="container-fluid">
          <div className="text-center p-5">
            <i className="fas fa-spinner fa-spin fa-2x text-primary"></i>
            <p className="mt-2">Cargando contenido...</p>
          </div>
        </div>
      </div>
    );
  }

  // Renderizado JSX del componente principal
  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6"><h1 className="m-0">Gestionar Educación</h1></div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link to="/admin">Dashboard</Link></li>
                <li className="breadcrumb-item active">Contenido Educativo</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className="card shadow-sm">
            <div className="card-header">
              <div className="card-tools">
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={() => handleCreateOrEdit()} 
                  disabled={isSubmitting || !token}
                >
                  <i className="fas fa-plus mr-1"></i> Crear Contenido
                </button>
              </div>
            </div>
            <div className="card-body p-0">
              {error ? (
                <div className="alert alert-danger m-3">{error}</div>
              ) : items.length === 0 ? (
                <p className="p-3 text-center text-muted">No hay contenido educativo creado. ¡Crea el primero!</p>
              ) : (
                <div className="table-responsive">
                  <table ref={tableRef} className="table table-striped table-hover">
                    <thead className="thead-light">
                      <tr>
                        <th>Título del Tema</th>
                        <th>Categoría</th>
                        <th style={{textAlign: 'center'}}>Orden Categoría</th>
                        <th style={{textAlign: 'center'}}>Orden Ítem</th>
                        <th style={{textAlign: 'center'}}>Activo</th>
                        <th style={{width: '120px', textAlign: 'center'}}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.titulo_tema}</td>
                          <td>
                            {item.categoria_nombre}
                            <br />
                            <small className="text-muted">({item.categoria_id})</small>
                          </td>
                          <td style={{textAlign: 'center'}}>{item.orden_categoria}</td>
                          <td style={{textAlign: 'center'}}>{item.orden_item}</td>
                          <td style={{textAlign: 'center'}}>
                            {item.activo ? 
                              <span className="badge badge-success">Sí</span> : 
                              <span className="badge badge-secondary">No</span>
                            }
                          </td>
                          <td style={{textAlign: 'center'}}>
                            <button 
                              className="btn btn-xs btn-info mr-1" 
                              title="Editar" 
                              onClick={() => handleCreateOrEdit(item)} 
                              disabled={isSubmitting}
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button 
                              className="btn btn-xs btn-danger" 
                              title="Eliminar" 
                              onClick={() => handleDeleteItem(item.id, item.titulo_tema)} 
                              disabled={isSubmitting}
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default GestionEducacion;