// src/pages/ForgotPasswordFlow.jsx (Nuevo archivo)
import React, { useState } from 'react';
import axios from 'axios';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom'; // Para redirigir

function ForgotPasswordFlow({ show, onClose }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await axios.post('http://localhost:3001/api/forgot-password', { email });
      setMessage(response.data.message);
      // No se avanza a otro paso aquí, el usuario debe revisar su correo y seguir el enlace
    } catch (err) {
      setError(err.response?.data?.message || "Error al solicitar el restablecimiento de contraseña.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setEmail('');
      setMessage('');
      setError('');
    }
  };

  return (
    <Modal show={show} onHide={handleClose} backdrop="static" keyboard={false} centered>
      <Modal.Header closeButton={!loading}>
        <Modal.Title>Restablecer Contraseña</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleRequestReset}>
        <Modal.Body>
          {message && <Alert variant="success">{message}</Alert>}
          {error && <Alert variant="danger">{error}</Alert>}
          
          <p>Ingrese su dirección de correo electrónico. Si está registrada, le enviaremos un enlace para restablecer su contraseña.</p>
          <Form.Group className="mb-3" controlId="forgotPasswordEmailInput">
            <Form.Label>Correo Electrónico</Form.Label>
            <Form.Control
              type="email"
              placeholder="sucorreo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading} className="w-100">
            {loading ? <Spinner as="span" animation="border" size="sm" /> : "Enviar Enlace de Restablecimiento"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

export default ForgotPasswordFlow;