// src/pages/GestionFAQs.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
// import { useAuth } from '../context/AuthContext.jsx'; // No es necesario si la ruta ya protege
import { Link } from 'react-router-dom';

// --- FAQ Form Component (sin cambios significativos recientes) ---
const FAQForm = ({ onSubmit, onClose, initialData = {}, isSubmitting }) => {
  const [formData, setFormData] = useState({
    pregunta: initialData.pregunta || '',
    respuesta: initialData.respuesta || '',
    categoria: initialData.categoria || '',
    orden: initialData.orden || 0,
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setFormData({
      pregunta: initialData.pregunta || '',
      respuesta: initialData.respuesta || '',
      categoria: initialData.categoria || '',
      orden: initialData.orden || 0,
    });
    setFormError('');
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value, 10) : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.pregunta || !formData.respuesta) {
      setFormError('La pregunta y la respuesta son requeridas.');
      return;
    }
    const result = await onSubmit(formData, initialData.id);
    if (result && result.error) {
      setFormError(result.message || 'Ocurrió un error al guardar la FAQ.');
    } else if (result && result.success) {
      onClose();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {formError && <div className="alert alert-danger p-2 mb-3">{formError}</div>}
      <div className="form-group mb-3">
        <label htmlFor="preguntaFAQFormGF">Pregunta</label> {/* ID único */}
        <textarea className="form-control" id="preguntaFAQFormGF" name="pregunta" value={formData.pregunta} onChange={handleChange} rows="3" required disabled={isSubmitting}></textarea>
      </div>
      <div className="form-group mb-3">
        <label htmlFor="respuestaFAQFormGF">Respuesta</label> {/* ID único */}
        <textarea className="form-control" id="respuestaFAQFormGF" name="respuesta" value={formData.respuesta} onChange={handleChange} rows="5" required disabled={isSubmitting}></textarea>
      </div>
      <div className="form-group mb-3">
        <label htmlFor="categoriaFAQFormGF">Categoría (Opcional)</label> {/* ID único */}
        <input type="text" className="form-control" id="categoriaFAQFormGF" name="categoria" value={formData.categoria} onChange={handleChange} disabled={isSubmitting} />
      </div>
      <div className="form-group mb-4">
        <label htmlFor="ordenFAQFormGF">Orden (Opcional, menor # aparece primero)</label> {/* ID único */}
        <input type="number" className="form-control" id="ordenFAQFormGF" name="orden" value={formData.orden} onChange={handleChange} disabled={isSubmitting} />
      </div>
      <div className="modal-footer justify-content-end p-0 border-top-0 pt-3">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
        <button type="submit" className="btn btn-primary ml-2" disabled={isSubmitting}>
          {isSubmitting ? (initialData.id ? 'Actualizando...' : 'Creando...') : (initialData.id ? 'Actualizar FAQ' : 'Crear FAQ')}
        </button>
      </div>
    </form>
  );
};

// --- Componente Principal GestionFAQs ---
function GestionFAQs() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState({ type: '', text: '' });

  const fetchFAQs = useCallback(async () => {
    setLoading(true);
    setFeedbackMessage({ type: '', text: '' });
    try {
      const response = await axios.get('http://localhost:3001/api/admin/faqs'); // Endpoint de admin
      setFaqs(response.data);
      setError('');
    } catch (err) {
      console.error("Error fetching FAQs:", err);
      const errorMessage = err.response?.data?.message || 'Error al cargar las FAQs.';
      setError(errorMessage);
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFAQs();
  }, [fetchFAQs, refreshTrigger]);

  const handleOpenModal = (faqParaEditar = null) => {
    setEditingFAQ(faqParaEditar);
    setFeedbackMessage({ type: '', text: '' });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingFAQ(null);
  };

  const handleSubmitFAQForm = async (formData, faqId) => {
    setIsSubmitting(true);
    setFeedbackMessage({ type: '', text: '' });
    try {
      let response;
      if (faqId) {
        response = await axios.put(`http://localhost:3001/api/faqs/${faqId}`, formData);
      } else {
        response = await axios.post('http://localhost:3001/api/faqs', formData);
      }
      setFeedbackMessage({ type: 'success', text: response.data.message || (faqId ? 'FAQ actualizada con éxito.' : 'FAQ creada con éxito.') });
      setRefreshTrigger(prev => prev + 1);
      setIsSubmitting(false);
      return { success: true };
    } catch (err) {
      console.error("Error guardando FAQ:", err.response?.data || err.message);
      const errorMessage = err.response?.data?.message || "Error al guardar la FAQ.";
      setIsSubmitting(false);
      return { error: true, message: errorMessage };
    }
  };

  const handleDeleteFAQ = async (faqId, pregunta) => {
    setFeedbackMessage({ type: '', text: '' });
    if (window.confirm(`¿Estás seguro de que quieres eliminar la FAQ: "${pregunta}"?`)) {
      setIsSubmitting(true);
      try {
        await axios.delete(`http://localhost:3001/api/faqs/${faqId}`);
        setFeedbackMessage({ type: 'success', text: `FAQ eliminada exitosamente.`});
        setRefreshTrigger(prev => prev + 1);
      } catch (err) {
        console.error("Error eliminando FAQ:", err.response?.data || err.message);
        const errorMessage = err.response?.data?.message || "Error al eliminar la FAQ.";
        setFeedbackMessage({ type: 'error', text: errorMessage});
      } finally {
        setIsSubmitting(false);
      }
    }
  };
  
  return (
    <>
      <div className="content-header">
        <div className="container-fluid">
          <div className="row mb-2">
            <div className="col-sm-6"><h1 className="m-0">Gestionar Preguntas Frecuentes</h1></div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right">
                <li className="breadcrumb-item"><Link to="/admin">Dashboard</Link></li>
                <li className="breadcrumb-item active">Gestión de FAQs</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section className="content">
        <div className="container-fluid">
          <div className={`modal fade ${isModalOpen ? 'show d-block' : ''}`} id="faqFormModalPage" tabIndex="-1" style={{ backgroundColor: isModalOpen ? 'rgba(0,0,0,0.4)' : 'transparent' }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{editingFAQ ? 'Editar FAQ' : 'Crear Nueva FAQ'}</h5>
                  <button type="button" className="close" onClick={handleCloseModal} disabled={isSubmitting}><span aria-hidden="true">×</span></button>
                </div>
                <div className="modal-body">
                  <FAQForm
                    onSubmit={handleSubmitFAQForm}
                    onClose={handleCloseModal}
                    initialData={editingFAQ || {}}
                    isSubmitting={isSubmitting}
                  />
                </div>
              </div>
            </div>
          </div>
          {isModalOpen && <div className="modal-backdrop fade show"></div>}

          {feedbackMessage.text && (
            <div className={`alert ${feedbackMessage.type === 'success' ? 'alert-success' : 'alert-danger'} alert-dismissible fade show my-3`} role="alert">
              {feedbackMessage.text}
              <button type="button" className="close" data-dismiss="alert" onClick={() => setFeedbackMessage({ type: '', text: '' })}><span aria-hidden="true">×</span></button>
            </div>
          )}

          <div className="card shadow-sm">
            <div className="card-header">
              <h3 className="card-title">Lista de FAQs</h3>
              <div className="card-tools">
                <button className="btn btn-primary btn-sm" onClick={() => handleOpenModal()} disabled={isSubmitting}>
                  <i className="fas fa-plus mr-1"></i> Crear FAQ
                </button>
              </div>
            </div>
            <div className="card-body p-0">
              {loading && faqs.length === 0 ? (
                 <div className="text-center p-5"><i className="fas fa-spinner fa-spin fa-2x"></i><p className="mt-2">Cargando...</p></div>
              ) : error && faqs.length === 0 ? (
                <div className="alert alert-danger m-3">{error}</div>
              ) : faqs.length === 0 ? (
                <p className="p-3 text-center text-muted">No hay FAQs creadas.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped table-hover">
                    <thead className="thead-light">
                      <tr>
                        <th>Pregunta</th>
                        <th style={{width: '20%'}}>Categoría</th> {/* Ajustado ancho */}
                        <th style={{width: '10%', textAlign: 'center'}}>Orden</th>
                        <th style={{width: '120px', textAlign: 'center'}}>Acciones</th> {/* Ajustado ancho */}
                      </tr>
                    </thead>
                    <tbody>
                      {faqs.map((faq) => (
                        <tr key={faq.id}>
                          <td>{faq.pregunta}</td>
                          <td>{faq.categoria || '-'}</td>
                          <td style={{textAlign: 'center'}}>{faq.orden}</td>
                          <td style={{textAlign: 'center'}}>
                            <button className="btn btn-xs btn-info mr-1" title="Editar" onClick={() => handleOpenModal(faq)} disabled={isSubmitting}>
                              <i className="fas fa-edit"></i>
                            </button>
                            <button className="btn btn-xs btn-danger" title="Eliminar" onClick={() => handleDeleteFAQ(faq.id, faq.pregunta)} disabled={isSubmitting}>
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

export default GestionFAQs;