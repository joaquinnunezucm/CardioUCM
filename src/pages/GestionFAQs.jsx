import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import $ from 'jquery';
import 'datatables.net-bs4';
import 'datatables.net-bs4/css/dataTables.bootstrap4.min.css';

const GestionFAQs = () => {
  const [faqs, setFAQs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const tableRef = useRef();

  // Fetch FAQs
  useEffect(() => {
    const fetchFAQs = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/faqs');
        setFAQs(response.data);
      } catch (err) {
        console.error("Error al obtener FAQs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFAQs();
  }, [refreshTrigger]);

  // Inicializar DataTables después de cargar datos
  useEffect(() => {
    if (!loading && faqs.length > 0) {
      const table = $(tableRef.current).DataTable({
        destroy: true,
        language: {
          search: "Buscar:",
          lengthMenu: "Mostrar _MENU_ registros",
          info: "Mostrando _START_ a _END_ de _TOTAL_ FAQs",
          paginate: { previous: "Anterior", next: "Siguiente" },
          zeroRecords: "No se encontraron FAQs"
        }
      });

      return () => {
        table.destroy();
      };
    }
  }, [faqs, loading]);

  // Crear o Editar FAQ con SweetAlert2
  const handleCreateOrEdit = (faq = null) => {
    Swal.fire({
      title: faq ? 'Editar FAQ' : 'Crear Pregunta Frecuente',
      html: `
        <div style="display: flex; flex-direction: column; gap: 15px; max-width: 800px; margin: auto;">
          <input id="swal-input-pregunta" class="swal2-input" placeholder="Pregunta" value="${faq?.pregunta || ''}" style="width: 100%;">
          <textarea id="swal-input-respuesta" class="swal2-textarea" placeholder="Respuesta" style="width: 100%;">${faq?.respuesta || ''}</textarea>
          <input id="swal-input-categoria" class="swal2-input" placeholder="Categoría" value="${faq?.categoria || ''}" style="width: 100%;">
          <input id="swal-input-orden" class="swal2-input" placeholder="Orden" type="number" value="${faq?.orden || 0}" style="width: 100%;">
        </div>
      `,
      customClass: {
        popup: 'swal-wide'
      },
      width: '900px',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: faq ? 'Actualizar' : 'Crear',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const pregunta = document.getElementById('swal-input-pregunta').value.trim();
        const respuesta = document.getElementById('swal-input-respuesta').value.trim();
        const categoria = document.getElementById('swal-input-categoria').value.trim();
        const orden = parseInt(document.getElementById('swal-input-orden').value.trim());

        if (!pregunta || !respuesta || isNaN(orden)) {
          Swal.showValidationMessage('Todos los campos excepto categoría son obligatorios');
          return false;
        }

        return { pregunta, respuesta, categoria, orden };
      }
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        try {
          setIsSubmitting(true);
          const url = faq ? `http://localhost:3001/api/faqs/${faq.id}` : 'http://localhost:3001/api/faqs';
          const method = faq ? 'put' : 'post';
          const response = await axios[method](url, result.value);

          // Actualizar el estado de FAQs directamente
          if (faq) {
            setFAQs(faqs.map(item => (item.id === faq.id ? response.data : item)));
          } else {
            setFAQs([...faqs, response.data]);
          }

          Swal.fire({
            icon: 'success',
            title: faq ? '¡FAQ actualizada correctamente!' : '¡FAQ creada correctamente!',
            showConfirmButton: false,
            timer: 1500
          });
        } catch (err) {
          console.error("Error al guardar FAQ:", err);
          Swal.fire('Error', 'No se pudo guardar la FAQ.', 'error');
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  // Eliminar FAQ con confirmación
  const handleDeleteFAQ = (faqId, pregunta) => {
    Swal.fire({
      title: `¿Eliminar FAQ?`,
      text: `"${pregunta}" se eliminará permanentemente.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`http://localhost:3001/api/faqs/${faqId}`);
          
          // Actualizar el estado de FAQs directamente
          setFAQs(faqs.filter(item => item.id !== faqId));

          Swal.fire({
            icon: 'success',
            title: '¡FAQ eliminada correctamente!',
            showConfirmButton: false,
            timer: 1500
          });
        } catch (err) {
          console.error("Error eliminando FAQ:", err.response?.data || err.message);
          Swal.fire('Error', err.response?.data?.message || "Error al eliminar la FAQ.", 'error');
        }
      }
    });
  };

  return (
    <div className="container mt-4">
      <div className="mb-3 d-flex justify-content-end">
        <button className="btn btn-success" onClick={() => handleCreateOrEdit()} disabled={isSubmitting}>
          <i className="fas fa-plus"></i> Nueva Pregunta
        </button>
      </div>

      <div className="table-responsive">
        <table ref={tableRef} id="faqsTable" className="table table-bordered table-hover">
          <thead className="thead-light">
            <tr>
              <th>Pregunta</th>
              <th>Categoría</th>
              <th style={{ width: '10%', textAlign: 'center' }}>Orden</th>
              <th style={{ width: '120px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {faqs.map(faq => (
              <tr key={faq.id}>
                <td>{faq.pregunta}</td>
                <td>{faq.categoria || '-'}</td>
                <td style={{ textAlign: 'center' }}>{faq.orden}</td>
                <td style={{ textAlign: 'center' }}>
                  <button className="btn btn-xs btn-info mr-1" onClick={() => handleCreateOrEdit(faq)} disabled={isSubmitting}>
                    <i className="fas fa-edit"></i>
                  </button>
                  <button className="btn btn-xs btn-danger" onClick={() => handleDeleteFAQ(faq.id, faq.pregunta)} disabled={isSubmitting}>
                    <i className="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GestionFAQs;